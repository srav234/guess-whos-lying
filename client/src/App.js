import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import UsernameScreen from './components/UsernameScreen';
import GameModeScreen from './components/GameModeScreen';

import JoinGameScreen from './components/JoinGameScreen';
import LobbyScreen from './components/LobbyScreen';
import QuestionScreen from './components/QuestionScreen';
import VotingScreen from './components/VotingScreen';
import ResultsScreen from './components/ResultsScreen';
import FinalScoreboardScreen from './components/FinalScoreboardScreen';
import config from './config';
import './App.css';

const socket = io(config.backendUrl);

function App() {
  const [username, setUsername] = useState('');
  const [modeSelected, setModeSelected] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [roomCreator, setRoomCreator] = useState('');
  const [currentAdmin, setCurrentAdmin] = useState('');

  const [inLobby, setInLobby] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [question, setQuestion] = useState('');
  const [answersForVoting, setAnswersForVoting] = useState([]);
  const [realQuestion, setRealQuestion] = useState('');
  const [votingStarted, setVotingStarted] = useState(false);
  const [results, setResults] = useState(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalScores, setTotalScores] = useState({});
  const [joinError, setJoinError] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [lobbyError, setLobbyError] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState({ submittedUsernames: [], totalPlayers: 0 });
  const [votingStatus, setVotingStatus] = useState({ votedUsernames: [], totalPlayers: 0 });

  useEffect(() => {
    const handleUpdatePlayers = (playerData) => {
      // Clear any lobby errors when players are updated, EXCEPT for "not enough players" errors
      // This prevents the error from being cleared before it can be displayed
      setLobbyError(prevError => {
        if (prevError && prevError.includes('Need at least 3 players')) {
          return prevError;
        }
        return '';
      });
      
      if (typeof playerData === 'object' && playerData.players) {
        setPlayers(playerData.players);
        setRoomCreator(playerData.creator);
        setCurrentAdmin(playerData.currentAdmin || playerData.creator);
      } else {
        // Handle legacy format for backward compatibility
        setPlayers(playerData);
        setRoomCreator(playerData[0] || '');
        setCurrentAdmin(playerData[0] || '');
      }
    };

    const handleError = (msg) => {
      // Special handling for "Need at least 3 players" error - always show in lobby if we have a roomCode
      if (msg.includes('Need at least 3 players') && roomCode) {
        // Force the user to stay in lobby and show the error
        setInLobby(true);
        setLobbyError(msg);
        
        // Clear error after 10 seconds
        setTimeout(() => setLobbyError(''), 10000);
        return;
      }
      
      // CRITICAL FIX: For "not enough players" errors, ALWAYS try to show in lobby
      // even if roomCode is empty, because this error should never cause a redirect
      if (msg.includes('Need at least 3 players')) {
        setInLobby(true);
        setLobbyError(msg);
        setTimeout(() => setLobbyError(''), 10000);
        return;
      }
      
      // If we're trying to join a room, show the error in JoinGameScreen
      if (modeSelected === 'join') {
        setJoinError(msg);
        setInLobby(false);
        setRoomCode('');
      } else if (inLobby) {
        // If we're in the lobby, show the error there
        setLobbyError(msg);
        // Clear error after 5 seconds
        setTimeout(() => setLobbyError(''), 5000);
      } else if (gameStarted) {
        // If we're in a game, show the error in the current screen
        alert(msg);
      } else {
        // For other errors (like when not in any specific state), show alert
        alert(msg);
        setInLobby(false);
      }
    };

    const handleGameStarted = ({ question, roundNumber }) => {
      console.log('🎮 Question received:', question);
      
      // Clear any lobby errors
      setLobbyError('');
      
      // Reset game state for new round
      setResults(null);
      setVotingStarted(false);
      setAnswersForVoting([]);
      setRealQuestion('');
      
      // Reset submission status for new round
      setSubmissionStatus({ submittedUsernames: [], totalPlayers: players.length });
      
      // Set new question and start game
      setQuestion(question);
      setGameStarted(true);
      if (roundNumber) {
        setRoundNumber(roundNumber);
      }
    };

    const handleVotingStart = ({ answers, realQuestion }) => {
      console.log('🗳️ Voting phase started');
      setAnswersForVoting(answers);
      setRealQuestion(realQuestion);
      setVotingStarted(true);
      // Reset voting status for new voting phase
      setVotingStatus({ votedUsernames: [], totalPlayers: players.length });
    };

    const handleResults = (data) => {
      console.log('🎉 Results received:', data);
      setResults(data);
      setTotalScores(data.totalScores || {});
      if (data.roundNumber) {
        setRoundNumber(data.roundNumber);
      }
    };

    const handleGameOver = (data) => {
      console.log('🏁 Game over:', data);
      setGameOver(true);
      setTotalScores(data.totalScores || {});
    };

    const handleSubmissionStatusUpdate = (data) => {
      console.log('📊 Submission status update:', data);
      setSubmissionStatus(data);
    };

    const handleVotingStatusUpdate = (data) => {
      console.log('🗳️ Voting status update:', data);
      setVotingStatus(data);
    };

    socket.on('connect', () => {
      console.log('✅ Connected to server:', socket.id);
    });

    socket.on('update-players', handleUpdatePlayers);
    socket.on('error-message', handleError);
    socket.on('game-started', handleGameStarted);
    socket.on('voting-start', handleVotingStart);
    socket.on('results', handleResults);
    socket.on('game-over', handleGameOver);
    socket.on('submission-status-update', handleSubmissionStatusUpdate);
    socket.on('voting-status-update', handleVotingStatusUpdate);

    return () => {
      socket.off('update-players', handleUpdatePlayers);
      socket.off('error-message', handleError);
      socket.off('game-started', handleGameStarted);
      socket.off('voting-start', handleVotingStart);
      socket.off('results', handleResults);
      socket.off('game-over', handleGameOver);
      socket.off('submission-status-update', handleSubmissionStatusUpdate);
      socket.off('voting-status-update', handleVotingStatusUpdate);
    };
  }, []);

  const handleUsernameSubmit = (name) => {
    setUsername(name);
  };

  const handleCreateGame = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setModeSelected('create');
    setInLobby(true); // Go directly to lobby
    setRoundNumber(1);
    setTotalScores({});
    
    // Initialize the admin as the first player in the room
    setPlayers([username]);
    setRoomCreator(username);
    setCurrentAdmin(username);

    console.log('🏠 Creating room:', { code, username });
    socket.emit('create-room', { roomCode: code, username });
  };

  const handleJoinGame = () => {
    setModeSelected('join');
    setJoinError(''); // Clear any previous errors
  };

  const handleJoinRoom = (code) => {
    setJoinError(''); // Clear any previous errors
    setRoomCode(code);
    setInLobby(true);

    socket.emit('join-room', { roomCode: code, username });
  };

  const handleBackToModeSelect = () => {
    setModeSelected(false);
    setRoomCode('');
    setJoinError(''); // Clear errors when going back
  };



  const handleMainMenu = () => {
    setGameOver(false);
    setResults(null);
    setGameStarted(false);
    setVotingStarted(false);
    setQuestion('');
    setAnswersForVoting([]);
    setRealQuestion('');
    setRoundNumber(1);
    setTotalScores({});
    setSubmissionStatus({ submittedUsernames: [], totalPlayers: 0 });
    setVotingStatus({ votedUsernames: [], totalPlayers: 0 });
    setInLobby(false);
    setRoomCode('');
    setModeSelected(false);
    setPlayers([]);
    setRoomCreator('');
  };

  const handleStartGame = () => {
    socket.emit('start-game', { roomCode });
  };

  const handleVote = (suspectUsername) => {
    console.log(`🗳️ Voted for ${suspectUsername}`);
    socket.emit('submit-vote', {
      roomCode,
      voter: username,
      target: suspectUsername
    });
  };

  const handleNextRound = () => {
    console.log('🚀 Starting next round');
    socket.emit('next-round', { roomCode });
    
    // Don't reset game state here - the server will emit game-started to all players
    // and that will reset the state for everyone
  };

  const isAdmin = currentAdmin === username;
  


  return (
    <div className="App">
      {!username ? (
        <UsernameScreen onSubmit={handleUsernameSubmit} />
      ) : gameOver ? (
        <FinalScoreboardScreen
          totalScores={totalScores}
          onMainMenu={handleMainMenu}
        />
      ) : results ? (
        <ResultsScreen
          liar={results.liar}
          votes={results.votes}
          realQuestion={results.realQuestion}
          liarQuestion={results.liarQuestion}
          roundNumber={roundNumber}
          totalScores={totalScores}
          roundScores={results.roundScores || {}}
          onNextRound={handleNextRound}
          isAdmin={isAdmin}
          username={username}
          onMainMenu={handleMainMenu}
        />
      ) : votingStarted ? (
        <VotingScreen
          answers={answersForVoting}
          username={username}
          realQuestion={realQuestion}
          onVote={handleVote}
          votingStatus={votingStatus}
          players={players}
        />
      ) : gameStarted ? (
        <QuestionScreen
          username={username}
          question={question}
          roomCode={roomCode}
          socket={socket}
          submissionStatus={submissionStatus}
          players={players}
        />
      ) : inLobby ? (
        <LobbyScreen
          roomCode={roomCode}
          players={players}
          username={username}
          isAdmin={isAdmin}
          onStart={handleStartGame}
          currentAdmin={currentAdmin}
          error={lobbyError}
        />
      ) : !modeSelected ? (
        <GameModeScreen
          username={username}
          onCreate={handleCreateGame}
          onJoin={handleJoinGame}
        />
      ) : (
        <JoinGameScreen
          onJoin={handleJoinRoom}
          onBack={handleBackToModeSelect}
          error={joinError}
        />
      )}
    </div>
  );
}

export default App;

