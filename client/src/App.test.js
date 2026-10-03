import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import io from 'socket.io-client';
jest.mock('socket.io-client', () => jest.fn());
let handlers, socket, responses;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); handlers = {}; responses = {};
  socket = {
    connected: true, on: jest.fn((event, handler) => { handlers[event] = handler; }),
    connect: jest.fn(), disconnect: jest.fn(), removeAllListeners: jest.fn(),
    timeout: jest.fn(() => socket), emit: jest.fn((event, data, callback) => {
      if (responses[event]) callback(null, responses[event]);
    })
  };
  io.mockReturnValue(socket);
});
function start() {
  render(<App />); act(() => handlers.connect());
  fireEvent.change(screen.getByLabelText('Game nickname'), { target: { value: 'Alice' } });
  fireEvent.click(screen.getByText('Continue'));
}
const lobby = { roomCode: 'ABC123', username: 'Alice', phase: 'lobby', players: ['Alice'], currentAdmin: 'Alice', disconnectedPlayers: [], totalScores: { Alice: 0 } };
test('failed joins remain on join screen and display server error', () => {
  start(); fireEvent.click(screen.getByText('Join Game'));
  responses['join-room'] = { ok: false, error: 'Room does not exist' };
  fireEvent.change(screen.getByLabelText('Room code'), { target: { value: 'ABC123' } });
  fireEvent.click(screen.getByText('Join'));
  expect(screen.getByText('Room does not exist')).toBeInTheDocument();
  expect(screen.queryByText('Start Game')).not.toBeInTheDocument();
});
test('lobby appears only after acknowledgement and stores resume token', () => {
  start(); fireEvent.click(screen.getByText('Create Game'));
  expect(screen.queryByText('Start Game')).not.toBeInTheDocument();
  const callback = socket.emit.mock.calls.find(call => call[0] === 'create-room')[2];
  act(() => callback(null, { ok: true, token: 'secret-token', state: lobby }));
  expect(screen.getByText('Start Game')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('lying-game-session')).token).toBe('secret-token');
});
test('reload restores submitted answer from authoritative snapshot', () => {
  sessionStorage.setItem('lying-game-session', JSON.stringify({ roomCode: 'ABC123', token: 'secret-token', username: 'Alice' }));
  localStorage.setItem('lying-game-session', JSON.stringify({ roomCode: 'OTHER1', token: 'other-player-token', username: 'Bob' }));
  responses['resume-room'] = { ok: true, state: { ...lobby, phase: 'answering', roundNumber: 2, question: 'Your question', submitted: true, submissionStatus: { submittedUsernames: ['Alice'], totalPlayers: 3 } } };
  render(<App />); act(() => handlers.connect());
  expect(socket.emit).toHaveBeenCalledWith('resume-room', expect.objectContaining({ token: 'secret-token' }), expect.any(Function));
  expect(screen.getByText(/Answer submitted/)).toBeInTheDocument();
  expect(screen.queryByPlaceholderText('Type your answer here...')).not.toBeInTheDocument();
});
test('finished snapshot shows winners immediately', () => {
  start(); act(() => handlers['room-state']({ ...lobby, phase: 'finished', totalScores: { Alice: 5, Bob: 4 } }));
  expect(screen.getByText('Game Over!')).toBeInTheDocument();
  expect(screen.queryByText('Next Round')).not.toBeInTheDocument();
});

test('new tabs offer explicit rejoin without taking over another player', () => {
  localStorage.setItem('lying-game-session', JSON.stringify({ roomCode: 'ABC123', token: 'other-player-token', username: 'Bob' }));
  render(<App />); act(() => handlers.connect());
  expect(socket.emit).not.toHaveBeenCalledWith('resume-room', expect.anything(), expect.any(Function));
  expect(screen.getByLabelText('Game nickname')).toBeInTheDocument();
  expect(screen.getByText('Rejoin previous game as Bob')).toBeInTheDocument();
  responses['resume-room'] = { ok: true, state: { ...lobby, username: 'Bob' } };
  fireEvent.click(screen.getByText('Rejoin previous game as Bob'));
  expect(JSON.parse(sessionStorage.getItem('lying-game-session')).token).toBe('other-player-token');
});
test("leaving one tab does not erase another player's saved rejoin session", () => {
  sessionStorage.setItem('lying-game-session', JSON.stringify({ roomCode: 'ABC123', token: 'alice-token', username: 'Alice' }));
  localStorage.setItem('lying-game-session', JSON.stringify({ roomCode: 'OTHER1', token: 'bob-token', username: 'Bob' }));
  responses['resume-room'] = { ok: true, state: { ...lobby, phase: 'finished', totalScores: { Alice: 5 } } };
  responses['leave-room'] = { ok: true };
  render(<App />); act(() => handlers.connect());
  fireEvent.click(screen.getByText('Main Menu'));
  expect(sessionStorage.getItem('lying-game-session')).toBeNull();
  expect(JSON.parse(localStorage.getItem('lying-game-session')).token).toBe('bob-token');
});
