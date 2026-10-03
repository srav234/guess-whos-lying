const { randomUUID, randomInt } = require('crypto');

module.exports = function attachGameServer(io, questions, { graceMs = 120000 } = {}) {
  const rooms = new Map();
  const members = new Map();
  const timers = new Map();
  const fail = message => { throw new Error(message); };
  const connected = room => [...room.players.values()].filter(p => p.socketId);
  function snapshot(room, player) {
    return {
      roomCode: room.code, username: player.username, phase: room.phase,
      players: [...room.players.values()].map(p => p.username),
      disconnectedPlayers: [...room.players.values()].filter(p => !p.socketId).map(p => p.username),
      currentAdmin: room.players.get(room.admin)?.username, roundNumber: room.round,
      totalScores: room.finalScores || Object.fromEntries([...room.players.values()].map(p => [p.username, p.score])),
      question: player.id === room.liar ? room.liarQuestion : room.realQuestion,
      realQuestion: room.phase === 'answering' ? undefined : room.realQuestion,
      answers: room.phase === 'voting' ? [...room.answers].map(([id, text]) => ({ username: room.players.get(id)?.username, text })) : [],
      submitted: room.answers.has(player.id), voted: room.votes.has(player.id),
      submissionStatus: { submittedUsernames: [...room.answers.keys()].map(id => room.players.get(id)?.username), totalPlayers: room.players.size },
      votingStatus: { votedUsernames: [...room.votes.keys()].map(id => room.players.get(id)?.username), totalPlayers: room.players.size },
      results: room.results, endedMessage: room.endedMessage
    };
  }
  function publish(room) {
    for (const player of connected(room)) io.to(player.socketId).emit('room-state', snapshot(room, player));
  }
  function advance(room) {
    if (room.phase === 'answering' && room.answers.size === room.players.size) room.phase = 'voting';
    if (room.phase !== 'voting' || room.votes.size !== room.players.size) return;
    const tally = {};
    for (const id of room.votes.values()) { const name = room.players.get(id)?.username; if (name) tally[name] = (tally[name] || 0) + 1; }
    const liar = room.players.get(room.liar);
    const caught = (tally[liar.username] || 0) > room.players.size / 2;
    const roundScores = {};
    for (const player of room.players.values()) {
      const points = caught ? Number(player.id !== room.liar) : Number(player.id === room.liar);
      player.score += points; roundScores[player.username] = points;
    }
    room.results = { liar: liar.username, votes: tally, realQuestion: room.realQuestion, liarQuestion: room.liarQuestion, roundScores, caught };
    room.phase = [...room.players.values()].some(p => p.score >= 5) ? 'finished' : 'results';
    if (room.phase === 'finished') room.finalScores = Object.fromEntries([...room.players.values()].map(p => [p.username, p.score]));
  }
  function remove(room, id) {
    const player = room.players.get(id); if (!player) return;
    clearTimeout(timers.get(id)); timers.delete(id);
    if (player.socketId) { members.delete(player.socketId); io.sockets.sockets.get(player.socketId)?.leave(room.code); }
    if (['answering', 'voting'].includes(room.phase)) room.finalScores = Object.fromEntries([...room.players.values()].map(p => [p.username, p.score]));
    room.players.delete(id); room.answers.delete(id); room.votes.delete(id);
    for (const [voter, target] of room.votes) if (target === id) room.votes.delete(voter);
    if (!room.players.size) { rooms.delete(room.code); return; }
    if (room.admin === id) room.admin = connected(room)[0]?.id || room.players.keys().next().value;
    if (['answering', 'voting'].includes(room.phase)) {
      // Removing a round participant cancels the round rather than changing its electorate.
      room.phase = 'ended'; room.endedMessage = `${player.username} left. Return to the menu to start a new game.`;
    }
    publish(room);
  }
  function nextRound(room) {
    if (connected(room).length !== room.players.size) fail('Waiting for disconnected players to return');
    if (room.players.size < 3) fail('Need at least 3 players to start the game');
    if (room.used.size === questions.length) room.used.clear();
    const available = questions.map((q, i) => i).filter(i => !room.used.has(i));
    const index = available[randomInt(available.length)]; room.used.add(index);
    room.realQuestion = questions[index].real; room.liarQuestion = questions[index].liar;
    room.liar = [...room.players.keys()][randomInt(room.players.size)];
    room.round++; room.phase = 'answering'; room.answers.clear(); room.votes.clear(); room.results = null;
  }
  io.on('connection', socket => {
    function handle(event, action) {
      socket.on(event, (data = {}, ack = () => {}) => {
        if (typeof ack !== 'function') ack = () => {};
        try { ack({ ok: true, ...action(data) }); } catch (error) { ack({ ok: false, error: error.message }); }
      });
    }
    function member(data) {
      const entry = members.get(socket.id); const room = entry && rooms.get(entry.code);
      if (!room || (data.roomCode && data.roomCode !== room.code)) fail('Please rejoin your room');
      const player = room.players.get(entry.id); if (!player || player.socketId !== socket.id) fail('Session is no longer active');
      return { room, player };
    }
    function admit(room, player) {
      if (members.has(socket.id)) fail('Leave your current room first');
      if (player.socketId) { members.delete(player.socketId); io.sockets.sockets.get(player.socketId)?.disconnect(true); }
      clearTimeout(timers.get(player.id)); timers.delete(player.id);
      player.socketId = socket.id; members.set(socket.id, { code: room.code, id: player.id }); socket.join(room.code); publish(room);
      return { token: player.id, state: snapshot(room, player) };
    }
    const name = value => { if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 20) fail('Choose a nickname of 2–20 characters'); return value.trim(); };
    handle('create-room', data => {
      if (members.has(socket.id)) fail('Leave your current room first');
      const username = name(data.username); let code;
      do { code = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase(); } while (rooms.has(code));
      const player = { id: randomUUID(), username, score: 0, socketId: null };
      const room = { code, players: new Map([[player.id, player]]), admin: player.id, phase: 'lobby', round: 0, answers: new Map(), votes: new Map(), used: new Set() };
      rooms.set(code, room); return admit(room, player);
    });
    handle('join-room', data => {
      if (members.has(socket.id)) fail('Leave your current room first');
      const room = rooms.get(String(data.roomCode || '').trim().toUpperCase()); if (!room) fail('Room does not exist. Check the code or create a new room.');
      if (room.phase !== 'lobby') fail('This game has already started');
      if (room.players.size >= 10) fail('Room is full');
      const username = name(data.username);
      if ([...room.players.values()].some(p => p.username.toLowerCase() === username.toLowerCase())) fail('Nickname already taken in this room');
      const player = { id: randomUUID(), username, score: 0, socketId: null }; room.players.set(player.id, player); return admit(room, player);
    });
    handle('resume-room', data => {
      const room = rooms.get(data.roomCode); const player = room?.players.get(data.token);
      if (!player) fail('Your previous session has expired. Please create or join a room.');
      return admit(room, player);
    });
    handle('leave-room', data => { const { room, player } = member(data); remove(room, player.id); return {}; });
    for (const event of ['start-game', 'next-round']) handle(event, data => {
      const { room, player } = member(data); if (room.admin !== player.id) fail('Only the admin can advance the game');
      if (room.phase !== (event === 'start-game' ? 'lobby' : 'results')) fail('The game is not ready for another round');
      nextRound(room); publish(room); return {};
    });
    handle('submit-answer', data => {
      const { room, player } = member(data); if (room.phase !== 'answering' || data.roundNumber !== room.round) fail('This answer belongs to an inactive round');
      if (typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 1000) fail('Enter an answer of 1–1000 characters');
      if (!room.answers.has(player.id)) room.answers.set(player.id, data.answer.trim());
      advance(room); publish(room); return {};
    });
    handle('submit-vote', data => {
      const { room, player } = member(data); if (room.phase !== 'voting' || data.roundNumber !== room.round) fail('This vote belongs to an inactive round');
      const target = [...room.players.values()].find(p => p.username === data.target);
      if (!target || target.id === player.id) fail('Choose another player');
      if (!room.votes.has(player.id)) room.votes.set(player.id, target.id);
      advance(room); publish(room); return {};
    });
    socket.on('disconnect', () => {
      const entry = members.get(socket.id); members.delete(socket.id); const room = entry && rooms.get(entry.code); const player = room?.players.get(entry.id);
      if (!player || player.socketId !== socket.id) return;
      player.socketId = null;
      if (room.admin === player.id && connected(room).length) room.admin = connected(room)[0].id;
      const timer = setTimeout(() => remove(room, player.id), graceMs); timer.unref?.(); timers.set(player.id, timer); publish(room);
    });
  });
  return { rooms, close: () => { for (const timer of timers.values()) clearTimeout(timer); } };
};
