// components/JoinGameScreen.jsx
import { useState } from 'react';

function JoinGameScreen({ onJoin, onBack, error: serverError }) {
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState('');

  const handleJoinClick = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setLocalError('Please enter a valid 6-character room code');
      return;
    }
    setLocalError(''); // Clear any previous local errors
    onJoin(trimmed);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinClick();
    }
  };

  const handleInputChange = (e) => {
    setCode(e.target.value);
    // Clear errors when user starts typing
    if (localError) {
      setLocalError('');
    }
  };

  // Show server error if it exists, otherwise show local error
  const displayError = serverError || localError;

  return (
    <div className="join-game-screen">
      <div className="join-game-card">
        <h1 className="game-title">Guess Who's Lying</h1>
        <h2 className="join-header">Join Game</h2>
        <p className="join-instruction">Enter the room code to join your friends</p>
        
        <div className="input-container">
          <input
            type="text"
            value={code}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Enter room code"
            maxLength={6}
            className="room-code-input"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
          />
        </div>
        
        <div className="button-group">
          <button onClick={handleJoinClick} className="join-button">
            Join
          </button>
          <button onClick={onBack} className="back-button">
            Back
          </button>
        </div>

        {displayError && (
          <div className="error-message">
            {displayError}
          </div>
        )}
      </div>
    </div>
  );
}

export default JoinGameScreen;
