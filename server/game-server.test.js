const test = require('node:test');
const assert = require('node:assert/strict');
const attach = require('./game-server');
function setup(t, options) {
  let onConnection; const sockets = new Map();
  const io = { sockets: { sockets }, on: (_, fn) => { onConnection = fn; }, to: id => ({ emit: (_, state) => { sockets.get(id).state = state; } }) };
  const game = attach(io, [{ real: 'real', liar: 'liar' }], options); t.after(game.close);
  let counter = 0;
  function client() {
    const handlers = {}; const socket = { id: String(++counter), on: (event, fn) => { handlers[event] = fn; }, join() {}, leave() {}, disconnect() { handlers.disconnect(); } };
    sockets.set(socket.id, socket); onConnection(socket);
    socket.send = (event, data = {}) => { let response; handlers[event](data, value => { response = value; }); return response; };
    return socket;
  }
  const a = client(); const created = a.send('create-room', { username: 'Alice' }); const code = created.state.roomCode;
  const b = client(), c = client();
  const joined = [b.send('join-room', { roomCode: code, username: 'Bob' }), c.send('join-room', { roomCode: code, username: 'Carol' })];
  return { ...game, client, a, b, c, code, created, joined };
}
test('membership, admin and phase checks protect transitions', t => {
  const { a, b, client, code } = setup(t);
  assert.equal(b.send('start-game', { roomCode: code }).ok, false);
  assert.equal(client().send('start-game', { roomCode: code }).ok, false);
  assert.equal(a.send('next-round', { roomCode: code }).ok, false);
  assert.equal(a.send('start-game', { roomCode: code }).ok, true);
  assert.equal(client().send('join-room', { roomCode: code, username: 'Dave' }).ok, false);
});
test('duplicates cannot advance a round and stale submissions are rejected', t => {
  const { a, b, c, code } = setup(t); a.send('start-game');
  const answer = { roomCode: code, roundNumber: 1, answer: 'hello', username: 'Bob' };
  for (let i = 0; i < 4; i++) a.send('submit-answer', answer);
  assert.equal(a.state.phase, 'answering'); assert.deepEqual(a.state.submissionStatus.submittedUsernames, ['Alice']);
  b.send('submit-answer', answer); c.send('submit-answer', answer); assert.equal(a.state.phase, 'voting');
  assert.equal(a.send('submit-vote', { roundNumber: 0, target: 'Bob' }).ok, false);
  assert.equal(a.send('submit-vote', { roundNumber: 1, target: 'Alice' }).ok, false);
  for (let i = 0; i < 4; i++) a.send('submit-vote', { roundNumber: 1, target: 'Bob' });
  assert.equal(a.state.phase, 'voting'); assert.deepEqual(a.state.votingStatus.votedUsernames, ['Alice']);
});
test('resume restores private question, answer, vote and finished state', t => {
  const { a, b, c, client, created, code } = setup(t); a.send('start-game'); const question = a.state.question;
  a.send('submit-answer', { roundNumber: 1, answer: 'one' }); a.disconnect();
  const resumed = client(); assert.equal(resumed.send('resume-room', { roomCode: code, token: created.token }).ok, true);
  assert.equal(resumed.state.question, question); assert.equal(resumed.state.submitted, true);
  b.send('submit-answer', { roundNumber: 1, answer: 'two' }); c.send('submit-answer', { roundNumber: 1, answer: 'three' });
  resumed.send('submit-vote', { roundNumber: 1, target: 'Bob' }); resumed.disconnect();
  const again = client(); again.send('resume-room', { roomCode: code, token: created.token }); assert.equal(again.state.voted, true);
});
test('exactly half the votes does not catch the liar', t => {
  const { a, b, c, client, rooms, code } = setup(t); const d = client(); d.send('join-room', { roomCode: code, username: 'Dave' }); a.send('start-game');
  const room = rooms.get(code); const liar = room.players.get(room.liar); const others = [...room.players.values()].filter(p => p !== liar);
  for (const socket of [a,b,c,d]) socket.send('submit-answer', { roundNumber: 1, answer: 'answer' });
  const byName = new Map([a,b,c,d].map(s => [s.state.username,s]));
  byName.get(liar.username).send('submit-vote', { roundNumber: 1, target: others[0].username });
  others.forEach((p,i) => byName.get(p.username).send('submit-vote', { roundNumber: 1, target: i < 2 ? liar.username : others[0].username }));
  assert.equal(a.state.results.caught, false); assert.equal(a.state.totalScores[liar.username], 1);
});
test('fifth point finishes immediately and replayed votes cannot score twice', t => {
  const { a,b,c,rooms,code } = setup(t); a.send('start-game'); const room = rooms.get(code);
  for (const player of room.players.values()) player.score = 4;
  for (const socket of [a,b,c]) socket.send('submit-answer', { roundNumber: 1, answer: 'answer' });
  const liarName = room.players.get(room.liar).username;
  for (const socket of [a,b,c]) socket.send('submit-vote', { roundNumber: 1, target: socket.state.username === liarName ? [a,b,c].find(s => s.state.username !== liarName).state.username : liarName });
  assert.equal(a.state.phase, 'finished'); assert.equal(Object.values(a.state.totalScores).filter(s => s === 5).length, 2);
  assert.equal(a.send('submit-vote', { roundNumber: 1, target: 'Bob' }).ok, false);
  assert.equal(a.send('next-round').ok, false);
});
test('all players can reconnect before expiry; expired sessions are removed', async t => {
  const { a,b,c,client,code,created,rooms } = setup(t, { graceMs: 30 });
  a.disconnect(); b.disconnect(); c.disconnect(); assert.equal(rooms.has(code), true);
  const resumed = client(); assert.equal(resumed.send('resume-room', { roomCode: code, token: created.token }).ok, true);
  await new Promise(resolve => setTimeout(resolve, 60)); assert.equal(resumed.state.players.length, 1);
  resumed.disconnect(); await new Promise(resolve => setTimeout(resolve, 60)); assert.equal(rooms.has(code), false);
  assert.equal(client().send('resume-room', { roomCode: code, token: created.token }).ok, false);
});
test('leaving cancels active rounds and releases membership', t => {
  const { a,b,c,code } = setup(t); a.send('start-game'); b.send('leave-room');
  assert.equal(a.state.phase, 'ended'); assert.equal(c.state.players.length, 2);
  assert.equal(b.send('create-room', { username: 'Bob' }).ok, true);
  assert.equal(b.send('submit-answer', { roomCode: code, roundNumber: 1, answer: 'spoof' }).ok, false);
});
test('final scores survive departures and finished sessions can resume', t => {
  const { a,b,c,client,rooms,code,created } = setup(t); a.send('start-game'); const room = rooms.get(code);
  for (const player of room.players.values()) player.score = 4;
  for (const socket of [a,b,c]) socket.send('submit-answer', { roundNumber: 1, answer: 'answer' });
  const liar = room.players.get(room.liar).username;
  for (const socket of [a,b,c]) socket.send('submit-vote', { roundNumber: 1, target: socket.state.username === liar ? [a,b,c].find(s => s.state.username !== liar).state.username : liar });
  const scores = a.state.totalScores; b.send('leave-room'); assert.deepEqual(a.state.totalScores, scores);
  a.disconnect(); const resumed = client(); const response = resumed.send('resume-room', { roomCode: code, token: created.token });
  assert.equal(response.state.phase, 'finished'); assert.deepEqual(response.state.totalScores, scores);
});
test('snapshots keep the real question hidden from the liar before voting', t => {
  const { a,b,c,rooms,code } = setup(t); a.send('start-game'); const room = rooms.get(code);
  for (const socket of [a,b,c]) {
    assert.equal(socket.state.realQuestion, undefined);
    assert.equal(socket.state.question, socket.state.username === room.players.get(room.liar).username ? 'liar' : 'real');
    assert.deepEqual(socket.state.answers, []);
  }
});
