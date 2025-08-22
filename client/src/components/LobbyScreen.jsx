// components/LobbyScreen.jsx
import { useState } from 'react';

function LobbyScreen({ roomCode, players, username, isAdmin, onStart, rejoiningPlayers = [], currentAdmin, error }) {
  const [copySuccess, setCopySuccess] = useState(false);
  
  const handleRejoin = () => {
    // This will trigger the rejoin logic in App.js
    window.location.reload(); // Simple approach - reload to rejoin
  };
  
  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const isRejoining = rejoiningPlayers.includes(username);
  const canStartGame = isAdmin && rejoiningPlayers.length === 0;

  return (
    <div className="lobby-screen">
      <div className="lobby-container">
        <div className="lobby-header">
          <h1 className="game-title">Guess Who's Lying</h1>
          <p className="lobby-instruction">
            {rejoiningPlayers.length > 0 
              ? "Wait for everyone to rejoin, then start the game!" 
              : "Join the game and wait for the admin to start!"
            }
          </p>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        


        <div className="room-code-section">
          <div className="room-code-box">
            <span className="room-code-label">Room Code</span>
            <div className="room-code-value">{roomCode}</div>
            <button 
              onClick={handleCopyRoomCode}
              className={`copy-room-code-btn ${copySuccess ? 'copied' : ''}`}
              title="Copy room code to clipboard"
            >
              {copySuccess ? (
                <>
                  <span className="copy-icon">✓</span>
                  <span className="copy-text">Copied!</span>
                </>
              ) : (
                <>
                  <span className="copy-icon">📋</span>
                  <span className="copy-text">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="players-section">
          <h3 className="players-heading">
            Players ({players.length > 0 ? players.length : 1}/10)
          </h3>
          
          <div className="players-grid">
            {players.length > 0 ? (
              players.map((player) => (
                <div key={player} className="player-card">
                  <div className="player-name">{player}</div>
                  {player === currentAdmin && (
                    <div className="admin-badge">Admin</div>
                  )}
                  {player === username && (
                    <div className="you-badge">You</div>
                )}
                  <div className="player-status">
                    {rejoiningPlayers.includes(player) ? 'Rejoining...' : 'Ready'}
                  </div>
                </div>
              ))
            ) : (
              // Show at least the current user if players array is empty
              <div className="player-card">
                <div className="player-name">{username}</div>
                {username === currentAdmin && (
                  <div className="admin-badge">Admin</div>
                )}
                <div className="you-badge">You</div>
                <div className="player-status">Ready</div>
              </div>
            )}
          </div>
        </div>

        {isRejoining ? (
          <div className="rejoin-section">
            <button onClick={handleRejoin} className="rejoin-button">
              Rejoin Game
            </button>
          </div>
        ) : canStartGame ? (
          <div className="start-game-section">
            <button onClick={onStart} className="start-game-button">
              Start Game
            </button>
          </div>
        ) : (
          <div className="waiting-section">
            <p className="waiting-text">
              {isAdmin 
                ? `Waiting for ${rejoiningPlayers.length} player${rejoiningPlayers.length !== 1 ? 's' : ''} to rejoin...`
                : "Waiting for admin to start the game..."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LobbyScreen;
