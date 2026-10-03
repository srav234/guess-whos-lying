import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import UsernameScreen from './components/UsernameScreen';
import GameModeScreen from './components/GameModeScreen';
import JoinGameScreen from './components/JoinGameScreen';
import LobbyScreen from './components/LobbyScreen';
import QuestionScreen from './components/QuestionScreen';
import VotingScreen from './components/VotingScreen';
import ResultsScreen from './components/ResultsScreen';
import FinalScoreboardScreen from './components/FinalScoreboardScreen';
import GameEndedScreen from './components/GameEndedScreen';
import config from './config';
import './App.css';

const SESSION_KEY = 'lying-game-session';
function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function saveSession(value) {
  try { if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value)); else localStorage.removeItem(SESSION_KEY); } catch { /* Storage can be unavailable in private browsing. */ }
}

function App() {
  const socketRef = useRef(null);
  const sessionRef = useRef(readSession());
  const [username, setUsername] = useState(sessionRef.current?.username || '');
  const [mode, setMode] = useState('menu');
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(Boolean(sessionRef.current));
  const [error, setError] = useState('');
  const [showFinal, setShowFinal] = useState(false);

  useEffect(() => {
    const socket = io(config.backendUrl, { autoConnect: false }); socketRef.current = socket;
    const onState = state => { setRoom(state); setUsername(state.username); setError(''); };
    const onConnect = () => {
      setConnected(true);
      const session = sessionRef.current;
      if (!session) { setPending(false); return; }
      setPending(true);
      socket.timeout(10000).emit('resume-room', session, (timeout, response) => {
        setPending(false);
        if (timeout) { setError('Could not restore your session. Tap Reconnect to try again.'); return; }
        if (!response?.ok) { sessionRef.current = null; saveSession(null); setRoom(null); setMode('menu'); setError(response?.error || 'Session expired'); return; }
        onState(response.state);
      });
    };
    socket.on('room-state', onState); socket.on('connect', onConnect);
    socket.on('disconnect', () => { setConnected(false); setPending(false); });
    socket.on('connect_error', () => { setConnected(false); setPending(false); setError('Cannot connect to the game server. Retrying…'); });
    const onVisible = () => { if (document.visibilityState === 'visible' && !socket.connected) socket.connect(); };
    document.addEventListener('visibilitychange', onVisible); socket.connect();
    return () => { document.removeEventListener('visibilitychange', onVisible); socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; };
  }, []);

  function request(event, data, success) {
    const socket = socketRef.current;
    if (!socket?.connected) { setError('Waiting for connection. Please try again when connected.'); return; }
    setPending(true); setError('');
    socket.timeout(10000).emit(event, data, (timeout, response) => {
      setPending(false);
      if (timeout) { setError('The server did not respond. Reconnect before trying again.'); return; }
      if (!response?.ok) { setError(response?.error || 'Request failed'); return; }
      if (success) success(response);
    });
  }
  function enterRoom(event, code) {
    request(event, { username, roomCode: code }, response => {
      const session = { roomCode: response.state.roomCode, token: response.token, username: response.state.username };
      sessionRef.current = session; saveSession(session); setRoom(response.state); setShowFinal(false);
    });
  }
  function mainMenu() {
    request('leave-room', { roomCode: room.roomCode }, () => {
      sessionRef.current = null; saveSession(null); setRoom(null); setMode('menu'); setShowFinal(false);
    });
  }
  function reconnect() { socketRef.current?.disconnect(); socketRef.current?.connect(); }
  const isAdmin = room?.currentAdmin === username;
  const disconnected = room?.disconnectedPlayers || [];
  const notification = disconnected.length ? `${disconnected.join(', ')} disconnected. Their place is held for two minutes.` : null;
  let screen;
  if (!username) screen = <UsernameScreen onSubmit={setUsername} />;
  else if (!room && sessionRef.current) screen = <p>Restoring your game…</p>;
  else if (!room && mode === 'join') screen = <JoinGameScreen onJoin={code => enterRoom('join-room', code)} onBack={() => { setMode('menu'); setError(''); }} error={error} pending={pending || !connected} />;
  else if (!room) screen = <GameModeScreen username={username} onCreate={() => { if (!pending) enterRoom('create-room'); }} onJoin={() => { setMode('join'); setError(''); }} />;
  else if (room.phase === 'lobby') screen = <LobbyScreen roomCode={room.roomCode} players={room.players} username={username} currentAdmin={room.currentAdmin} isAdmin={isAdmin} onStart={() => request('start-game', { roomCode: room.roomCode })} error={notification} pending={pending || !connected} />;
  else if (room.phase === 'finished' || showFinal) screen = <FinalScoreboardScreen totalScores={room.totalScores} onMainMenu={mainMenu} />;
  else if (room.phase === 'ended') screen = <GameEndedScreen message={room.endedMessage} onSeeResults={() => setShowFinal(true)} />;
  else if (room.phase === 'results') screen = <ResultsScreen {...room.results} totalScores={room.totalScores} roundNumber={room.roundNumber} disconnectedPlayers={disconnected} disconnectNotification={notification} username={username} isAdmin={isAdmin} onNextRound={() => request('next-round', { roomCode: room.roomCode })} />;
  else if (room.phase === 'voting') screen = <VotingScreen key={`${room.roomCode}-${room.roundNumber}-vote`} answers={room.answers} username={username} realQuestion={room.realQuestion} players={room.players} votingStatus={room.votingStatus} submitted={room.voted} pending={pending || !connected} disconnectNotification={notification} onVote={target => request('submit-vote', { roomCode: room.roomCode, roundNumber: room.roundNumber, target })} />;
  else screen = <QuestionScreen key={`${room.roomCode}-${room.roundNumber}-answer`} username={username} question={room.question} players={room.players} submissionStatus={room.submissionStatus} submitted={room.submitted} pending={pending || !connected} disconnectNotification={notification} onSubmit={answer => request('submit-answer', { roomCode: room.roomCode, roundNumber: room.roundNumber, answer })} />;
  return <div className="App">
    {(!connected || (error && (room || mode !== 'join'))) && <div role="status" className="error-message">{error || 'Reconnecting… Your place is held for two minutes.'}<button onClick={reconnect}>Reconnect</button></div>}
    {pending && <p role="status">Connecting…</p>}
    {screen}
  </div>;
}
export default App;
