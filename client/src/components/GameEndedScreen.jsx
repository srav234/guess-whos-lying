function GameEndedScreen({ message, disconnectedPlayer, onSeeResults }) {
  return (
    <div className="game-ended-screen">
      <div className="game-ended-card">
        <div className="game-ended-icon">⚠️</div>
        <h1 className="game-ended-title">Game Ended</h1>

        <div className="game-ended-message">
          <p>{message}</p>
        </div>

        <div className="game-ended-explanation">
          <p>The game cannot continue with fewer than 3 players.</p>
        </div>

        <div className="game-ended-actions">
          <button onClick={onSeeResults} className="see-results-button">
            See Results
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameEndedScreen;
