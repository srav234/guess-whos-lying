const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Get frontend URL from environment variable or use localhost for development
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Debug logging for CORS configuration
console.log('🔧 CORS Configuration:');
console.log('   FRONTEND_URL:', FRONTEND_URL);
console.log('   Allowed origins:', [FRONTEND_URL, 'http://localhost:3000']);

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

const rooms = {}; // { [roomCode]: { players: [...], liarSocketId, realQuestion, liarQuestion, scores: {...}, creator: username, currentAdmin: username } }
const socketToRoom = {}; // { socketId: roomCode }
const answers = {}; // { [roomCode]: [{ username, answer }] }
const votes = {};   // { [roomCode]: [{ voter, target }] }


// Pool of question pairs for different rounds
const questionPairs = [
  {
    real: "What's the age you had your first crush?",
    liar: "State a number between 5-20"
  },
  {
    real: "What's the most amount of alcoholic drinks you've had in one night?",
    liar: "State a number between 2-30"
  },
  {
    real: "What's your favourite TV show of all time?",
    liar: "What's the most overrated TV show of all time?"
  },
  {
    real: "What time period in history would travel back in time to?",
    liar: "What would be the worst period in history to time travel to?"
  },
  {
    real: "What's the one thing you can't live without in your house?",
    liar: "What's the most expensive thing you own?"
  },
  {
    real: "What animal would you choose to turn into?",
    liar: "What's your least favourite animal?"
  },
  {
    real: "How many push ups can you do?",
    liar: "State a number from 1-40"
  },
  {
    real: "What's your dream vacation destination that you haven't yet been to?",
    liar: "Where's the best place you've travelled in the last 5 years?"
  },
  {
    real: "What's the last movie that made you cry?",
    liar: "What's the last movie that was so bad you couldn't finish?"
  },
  {
    real: "What's your hidden talent?",
    liar: "What skill do you wish you had?"
  },
  {
    real: "What's your favourite form of exercise?",
    liar: "What form of exercise do you avoid at all costs?"
  },
  {
    real: "What's your go to pizza topping?",
    liar: "What pizza topping should be banned?"
  },
  {
    real: "What's your favourite season of the year?",
    liar: "What's your least favourite season of the year?"
  },
  {
    real: "What social media app do you use the most?",
    liar: "What social media app do you think is most toxic?"
  },
  {
    real: "How many unread emails do you currently have?",
    liar: "State a number between 0-1000"
  },
  {
    real: "What's your favorite song to sing in the shower?",
    liar: "What's one song that irritates you?"
  },
  {
    real: "How many cups of coffee do you drink per day?",
    liar: "State a number between 0-8"
  },
  {
    real: "What city would you love to live in one day?",
    liar: "What's one city you think is overrated to live in?"
  },
  {
    real: "How many pairs of shoes do you own?",
    liar: "State a number between 5-50"
  },
  {
    real: "How many times do you hit the snooze button in the morning?",
    liar: "State a number between 0-10"
  },
  {
    real: "What's the most number of days you've gone without showering?",
    liar: "State a number between 0-7"
  },
  {
    real: "If you could be a contestant on any reality TV show, what would it be?",
    liar: "What reality TV show do you hate?"
  }
];

// Function to randomly select 3 question pairs for a game
function selectRandomQuestions() {
  const shuffled = [...questionPairs].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

io.on('connection', (socket) => {
  console.log('✅ New connection:', socket.id);

  socket.on('create-room', ({ roomCode, username }) => {
    console.log(`🏗️ Create room request: ${username} creating room ${roomCode}`);
    console.log(`🏠 Current rooms before creation:`, Object.keys(rooms));
    
    if (rooms[roomCode]) {
      console.log(`❌ Room ${roomCode} already exists, cannot create duplicate`);
      socket.emit('error-message', 'Room already exists. Please join instead or use a different room code.');
      return;
    }

    // Create new room
    rooms[roomCode] = { players: [], scores: {}, creator: username, currentAdmin: username };
    console.log(`✅ Created new room ${roomCode} for ${username}`);

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
      socket.emit('error-message', 'Room does not exist. Please check the room code or create a new room.');
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
    
    // Emit updated player list to ALL players in the room
    emitPlayerList(roomCode);
    
    // Also emit a success message to the joining player
    socket.emit('join-success', { 
      message: `Successfully joined room ${roomCode}`,
      roomCode,
      players: room.players.map(p => p.username)
    });
  });



  socket.on('start-game', async ({ roomCode }) => {
    const room = rooms[roomCode];

    if (!room || room.players.length < 3) {
      io.to(roomCode).emit('error-message', 'Need at least 3 players to start the game');
      return;
    }

    // Initialize tracking for used questions and round counter
    room.usedQuestions = [];
    room.currentRound = 0;
    room.disconnectedPlayers = []; // Track players who disconnected during the game

    startNewRound(roomCode);
  });

  socket.on('next-round', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Check if any player has reached 5 points
    const maxScore = Math.max(...Object.values(room.scores));
    if (maxScore >= 5) {
      // Game is over - one or more players hit 5 points
      io.to(roomCode).emit('game-over', {
        totalScores: room.scores,
        finalRound: room.currentRound
      });
      return;
    }

    // Continue to next round
    startNewRound(roomCode);
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

    // Emit updated voting status to all players in the room
    const votedUsernames = votes[roomCode].map(v => v.voter);
    io.to(roomCode).emit('voting-status-update', {
      votedUsernames,
      totalPlayers: playerCount
    });

    if (totalVotes === playerCount) {
      const tally = {};
      votes[roomCode].forEach(({ target }) => {
        tally[target] = (tally[target] || 0) + 1;
      });

      // Use stored liarUsername instead of looking up by socket ID
      // This handles cases where liar disconnected
      const liarName = rooms[roomCode].liarUsername || 'Unknown';

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
        roundNumber: rooms[roomCode].currentRound,
        disconnectedPlayers: rooms[roomCode].disconnectedPlayers || []
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
        const username = disconnectedPlayer.username;

        // Remove player from room
        room.players = room.players.filter((p) => p.socketId !== socket.id);
        const remainingPlayerCount = room.players.length;

        console.log(`❌ ${username} disconnected from room ${roomCode}. ${remainingPlayerCount} players remaining.`);

        // Check if admin left and reassign if needed
        const wasAdmin = username === room.currentAdmin;
        let newAdminUsername = null;

        if (wasAdmin && remainingPlayerCount > 0) {
          const newAdminIndex = Math.floor(Math.random() * remainingPlayerCount);
          const newAdmin = room.players[newAdminIndex];
          room.currentAdmin = newAdmin.username;
          newAdminUsername = newAdmin.username;
          console.log(`👑 Admin reassigned to ${newAdmin.username} in room ${roomCode}`);
        }

        // Check if we're in an active game (not just lobby)
        const inActiveGame = room.currentRound && room.currentRound > 0;

        if (inActiveGame && remainingPlayerCount < 3) {
          // Not enough players to continue - end the game
          console.log(`⚠️ Game ended in room ${roomCode} - not enough players (need 3, have ${remainingPlayerCount})`);

          io.to(roomCode).emit('game-ended', {
            reason: 'not-enough-players',
            message: `Game ended - ${username} left and there are not enough players to continue`,
            finalScores: room.scores || {},
            disconnectedPlayer: username
          });

          // Clean up game state but keep room for players to return to lobby
          delete answers[roomCode];
          delete votes[roomCode];
          room.currentRound = 0;
          room.liarSocketId = null;
          room.liarUsername = null;
          room.realQuestion = null;
          room.liarQuestion = null;
          room.usedQuestions = [];
          room.disconnectedPlayers = [];
        } else if (remainingPlayerCount > 0) {
          // Enough players remain - update player list
          emitPlayerList(roomCode);

          // If in active game, track disconnected player and notify others
          if (inActiveGame) {
            // Add to disconnected players list for this game
            if (!room.disconnectedPlayers) {
              room.disconnectedPlayers = [];
            }
            if (!room.disconnectedPlayers.includes(username)) {
              room.disconnectedPlayers.push(username);
            }

            // Notify all remaining players
            io.to(roomCode).emit('player-disconnected', {
              username: username,
              remainingPlayers: remainingPlayerCount,
              wasAdmin: wasAdmin,
              newAdmin: newAdminUsername
            });
          }
        }
      }

      if (room.players.length === 0) {
        delete rooms[roomCode];
        delete answers[roomCode];
        delete votes[roomCode];
        console.log(`🧹 Room ${roomCode} deleted - all players left`);
      }
    }

    delete socketToRoom[socket.id];
  });
});

function emitPlayerList(roomCode) {
  const room = rooms[roomCode];
  if (room) {
    const usernames = room.players.map((p) => p.username);
    
    const playerData = { 
      players: usernames, 
      creator: room.creator,
      currentAdmin: room.currentAdmin
    };
    
    console.log(`📢 Emitting player list for room ${roomCode}:`, playerData);
    console.log(`📡 Sending to ${room.players.length} players in room ${roomCode}`);
    
    io.to(roomCode).emit('update-players', playerData);
  } else {
    console.log(`❌ Cannot emit player list: Room ${roomCode} not found`);
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

function startNewRound(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.players.length < 3) {
    io.to(roomCode).emit('error-message', 'Need at least 3 players to start the game');
    return;
  }

  // Select a random question that hasn't been used yet
  let availableQuestions = questionPairs.filter((_, index) => !room.usedQuestions.includes(index));

  // If all questions have been used, reset the pool
  if (availableQuestions.length === 0) {
    room.usedQuestions = [];
    availableQuestions = questionPairs;
  }

  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  const questionPair = availableQuestions[randomIndex];

  // Mark this question as used
  const actualIndex = questionPairs.indexOf(questionPair);
  room.usedQuestions.push(actualIndex);

  const players = room.players;
  const liarIndex = Math.floor(Math.random() * players.length);
  const liar = players[liarIndex];

  room.liarSocketId = liar.socketId;
  room.liarUsername = liar.username; // Store username for disconnect handling
  room.realQuestion = questionPair.real;
  room.liarQuestion = questionPair.liar;
  room.currentRound = (room.currentRound || 0) + 1;
  answers[roomCode] = []; // initialize answer list

  console.log(`🤫 Round ${room.currentRound}: The liar is ${liar.username} in room ${roomCode}`);
  console.log(`📝 Question: ${questionPair.real.substring(0, 50)}...`);

  // Emit initial submission status (no one has submitted yet)
  io.to(roomCode).emit('submission-status-update', {
    submittedUsernames: [],
    totalPlayers: players.length
  });

  // Emit individual questions to each player
  players.forEach((player) => {
    const question = player.socketId === liar.socketId ? questionPair.liar : questionPair.real;
    console.log(`📝 Sending question to ${player.username}: ${question.substring(0, 50)}...`);
    io.to(player.socketId).emit('game-started', { question, roundNumber: room.currentRound });
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

