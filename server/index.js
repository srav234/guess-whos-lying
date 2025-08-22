const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Get frontend URL from environment variable or use localhost for development
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000'],
  credentials: true
}));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

const rooms = {}; // { [roomCode]: { players: [...], liarSocketId, realQuestion, liarQuestion, scores: {...}, creator: username, currentAdmin: username } }
const socketToRoom = {}; // { socketId: roomCode }
const answers = {}; // { [roomCode]: [{ username, answer }] }
const votes = {};   // { [roomCode]: [{ voter, target }] }
const rejoiningPlayers = {}; // { [roomCode]: Set of usernames who need to rejoin }

// Pool of question pairs for different rounds
const questionPairs = [
  {
    real: "What's your most embarrassing childhood memory?",
    liar: "What's your favorite childhood memory?"
  },
  {
    real: "What's the worst food you've ever tasted?",
    liar: "What's your favorite food?"
  },
  {
    real: "What's the most trouble you've ever been in at school?",
    liar: "What's your best school memory?"
  },
  {
    real: "What's the most embarrassing thing that happened to you in public?",
    liar: "What's your proudest moment in public?"
  },
  {
    real: "What's the worst date you've ever been on?",
    liar: "What's your best date memory?"
  }
];

io.on('connection', (socket) => {
  console.log('✅ New connection:', socket.id);

  socket.on('create-room', ({ roomCode, username }) => {
    console.log(`🏗️ Create room request: ${username} creating room ${roomCode}`);
    console.log(`🏠 Current rooms before creation:`, Object.keys(rooms));
    
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], scores: {}, creator: username, currentAdmin: username };
      console.log(`✅ Created new room ${roomCode} for ${username}`);
    } else {
      console.log(`⚠️ Room ${roomCode} already exists, adding ${username} to it`);
    }

    const player = { username, socketId: socket.id };
    rooms[roomCode].players.push(player);
    rooms[roomCode].scores[username] = 0; // Initialize score
    socketToRoom[socket.id] = roomCode;
    socket.join(roomCode);

    emitPlayerList(roomCode);
  });

  socket.on('join-room', ({ roomCode, username }) => {
    console.log(`🔗 Join room request: ${username} trying to join ${roomCode}`);
    console.log(`🏠 Current rooms:`, Object.keys(rooms));
    
    const room = rooms[roomCode];
    if (!room) {
      console.log(`❌ Room ${roomCode} not found`);
      socket.emit('error-message', 'Room does not exist');
      return;
    }

    console.log(`🏠 Room ${roomCode} found:`, {
      players: room.players.map(p => p.username),
      creator: room.creator,
      currentAdmin: room.currentAdmin
    });

    const alreadyInRoom = room.players.some((p) => p.username === username);
    if (alreadyInRoom) {
      console.log(`❌ Username ${username} already in room ${roomCode}`);
      socket.emit('error-message', 'Username already taken in this room');
      return;
    }

    const player = { username, socketId: socket.id };
    room.players.push(player);
    room.scores[username] = 0; // Initialize score
    socketToRoom[socket.id] = roomCode;
    socket.join(roomCode);

    console.log(`✅ ${username} joined room ${roomCode}. Room now has ${room.players.length} players:`, room.players.map(p => p.username));
    emitPlayerList(roomCode);
  });

  socket.on('rejoin-room', ({ roomCode, username }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit('error-message', 'Room does not exist');
      return;
    }

    // Check if this player was in the room before
    const wasInRoom = room.players.some((p) => p.username === username);
    if (!wasInRoom) {
      socket.emit('error-message', 'You were not in this room before');
      return;
    }

    // Update socket ID for existing player
    const existingPlayer = room.players.find((p) => p.username === username);
    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      socketToRoom[socket.id] = roomCode;
      socket.join(roomCode);
      
      // Remove from rejoining list
      if (rejoiningPlayers[roomCode]) {
        rejoiningPlayers[roomCode].delete(username);
      }
      
      // If all players have rejoined, reset game state
      if (rejoiningPlayers[roomCode] && rejoiningPlayers[roomCode].size === 0) {
        // Reset game state for new session
        room.currentRound = 0;
        room.scores = {};
        room.players.forEach(player => {
          room.scores[player.username] = 0;
        });
        console.log(`🔄 All players rejoined, game state reset for room ${roomCode}`);
      }
      
      console.log(`${username} rejoined room ${roomCode}`);
      emitPlayerList(roomCode);
    }
  });

  socket.on('start-game', async ({ roomCode }) => {
    const room = rooms[roomCode];
    
    if (!room || room.players.length < 3) {
      io.to(roomCode).emit('error-message', 'Need at least 3 players to start the game');
      return;
    }

    // Check if all players have rejoined
    if (rejoiningPlayers[roomCode] && rejoiningPlayers[roomCode].size > 0) {
      const missingPlayers = Array.from(rejoiningPlayers[roomCode]).join(', ');
      io.to(roomCode).emit('error-message', `Waiting for players to rejoin: ${missingPlayers}`);
      return;
    }

    startNewRound(roomCode, 0); // Start with first question pair
  });

  socket.on('next-round', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;
    
    // Check if we've reached the maximum rounds (3)
    const currentRound = room.currentRound || 0;
    if (currentRound >= 2) { // 0, 1, 2 = 3 rounds total
      // Game is over, add all players to rejoining list
      if (!rejoiningPlayers[roomCode]) {
        rejoiningPlayers[roomCode] = new Set();
      }
      room.players.forEach(player => {
        rejoiningPlayers[roomCode].add(player.username);
      });
      
      // Emit final results
      io.to(roomCode).emit('game-over', {
        totalScores: room.scores,
        finalRound: currentRound + 1
      });
      
      // Update player list to show rejoining status
      emitPlayerList(roomCode);
      return;
    }
    
    // Get next question pair
    const nextRound = currentRound + 1;
    startNewRound(roomCode, nextRound);
  });

  socket.on('submit-answer', ({ roomCode, username, answer }) => {
    if (!answers[roomCode]) answers[roomCode] = [];

    answers[roomCode].push({ username, answer });

    const expected = rooms[roomCode]?.players?.length || 0;
    const actual = answers[roomCode].length;

    console.log(`✏️ ${username} submitted. (${actual}/${expected})`);

    // Emit updated submission status to all players in the room
    const submittedUsernames = answers[roomCode].map(a => a.username);
    io.to(roomCode).emit('submission-status-update', {
      submittedUsernames,
      totalPlayers: expected
    });

    if (actual === expected) {
      const anonymizedAnswers = answers[roomCode].map((a) => ({
        username: a.username,
        text: a.answer
      }));

      io.to(roomCode).emit('voting-start', {
        answers: anonymizedAnswers,
        realQuestion: rooms[roomCode].realQuestion
      });
    }
  });

  socket.on('submit-vote', ({ roomCode, voter, target }) => {
    if (!votes[roomCode]) votes[roomCode] = [];

    votes[roomCode].push({ voter, target });

    const totalVotes = votes[roomCode].length;
    const playerCount = rooms[roomCode]?.players?.length || 0;

    console.log(`🗳️ ${voter} voted for ${target} (${totalVotes}/${playerCount})`);

    if (totalVotes === playerCount) {
      const tally = {};
      votes[roomCode].forEach(({ target }) => {
        tally[target] = (tally[target] || 0) + 1;
      });

      const liarId = rooms[roomCode].liarSocketId;
      const liarName = rooms[roomCode].players.find(p => p.socketId === liarId)?.username || 'Unknown';

      // Calculate scores for this round
      const roundScores = calculateRoundScores(roomCode, tally, liarName);
      
      // Update total scores
      Object.keys(roundScores).forEach(username => {
        rooms[roomCode].scores[username] += roundScores[username];
      });

      io.to(roomCode).emit('results', {
        votes: tally,
        liar: liarName,
        realQuestion: rooms[roomCode].realQuestion,
        liarQuestion: rooms[roomCode].liarQuestion,
        roundScores: roundScores,
        totalScores: rooms[roomCode].scores,
        roundNumber: rooms[roomCode].currentRound + 1
      });

      delete votes[roomCode];
      delete answers[roomCode];
    }
  });

  socket.on('disconnect', () => {
    const roomCode = socketToRoom[socket.id];
    const room = rooms[roomCode];

    if (room && room.players) {
      const disconnectedPlayer = room.players.find((p) => p.socketId === socket.id);
      
      if (disconnectedPlayer) {
        // Mark player as needing to rejoin
        if (!rejoiningPlayers[roomCode]) {
          rejoiningPlayers[roomCode] = new Set();
        }
        rejoiningPlayers[roomCode].add(disconnectedPlayer.username);
        
        // Check if admin left and reassign if needed
        if (disconnectedPlayer.username === room.currentAdmin) {
          const remainingPlayers = room.players.filter((p) => p.username !== disconnectedPlayer.username);
          if (remainingPlayers.length > 0) {
            // Assign new admin randomly
            const newAdminIndex = Math.floor(Math.random() * remainingPlayers.length);
            const newAdmin = remainingPlayers[newAdminIndex];
            room.currentAdmin = newAdmin.username;
            console.log(`👑 Admin reassigned to ${newAdmin.username} in room ${roomCode}`);
          }
        }
        
        console.log(`❌ Socket ${socket.id} disconnected from ${roomCode}`);
        emitPlayerList(roomCode);
      }

      if (room.players.length === 0) {
        delete rooms[roomCode];
        delete answers[roomCode];
        delete votes[roomCode];
        delete rejoiningPlayers[roomCode];
        console.log(`🧹 Room ${roomCode} deleted`);
      }
    }

    delete socketToRoom[socket.id];
  });
});

function emitPlayerList(roomCode) {
  const room = rooms[roomCode];
  if (room) {
    const usernames = room.players.map((p) => p.username);
    const rejoiningList = rejoiningPlayers[roomCode] ? Array.from(rejoiningPlayers[roomCode]) : [];
    
    const playerData = { 
      players: usernames, 
      creator: room.creator,
      currentAdmin: room.currentAdmin,
      rejoiningPlayers: rejoiningList
    };
    
    io.to(roomCode).emit('update-players', playerData);
  }
}

function calculateRoundScores(roomCode, votes, liarName) {
  const room = rooms[roomCode];
  const scores = {};
  
  // Initialize all players with 0 points for this round
  room.players.forEach(player => {
    scores[player.username] = 0;
  });
  
  // Calculate total votes for the liar
  const liarVotes = votes[liarName] || 0;
  const totalPlayers = room.players.length;
  const majorityThreshold = Math.ceil(totalPlayers / 2);
  
  if (liarVotes >= majorityThreshold) {
    // Majority guessed correctly - all non-liars get +1 point
    room.players.forEach(player => {
      if (player.username !== liarName) {
        scores[player.username] = 1;
      }
    });
  } else {
    // Liar was not caught - liar gets +1 point
    scores[liarName] = 1;
  }
  
  return scores;
}

function startNewRound(roomCode, questionIndex) {
  const room = rooms[roomCode];
  if (!room || room.players.length < 3) {
    io.to(roomCode).emit('error-message', 'Need at least 3 players to start the game');
    return;
  }

  const questionPair = questionPairs[questionIndex];
  const players = room.players;
  const liarIndex = Math.floor(Math.random() * players.length);
  const liar = players[liarIndex];

  room.liarSocketId = liar.socketId;
  room.realQuestion = questionPair.real;
  room.liarQuestion = questionPair.liar;
  room.currentRound = questionIndex;
  answers[roomCode] = []; // initialize answer list

  console.log(`🤫 Round ${questionIndex + 1}: The liar is ${liar.username} in room ${roomCode}`);

  // Emit initial submission status (no one has submitted yet)
  io.to(roomCode).emit('submission-status-update', {
    submittedUsernames: [],
    totalPlayers: players.length
  });

  // Emit individual questions to each player
  players.forEach((player) => {
    const question = player.socketId === liar.socketId ? questionPair.liar : questionPair.real;
    console.log(`📝 Sending question to ${player.username}: ${question.substring(0, 50)}...`);
    io.to(player.socketId).emit('game-started', { question, roundNumber: questionIndex + 1 });
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

