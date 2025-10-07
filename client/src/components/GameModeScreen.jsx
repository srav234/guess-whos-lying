// components/GameModeScreen.jsx
function GameModeScreen({ username, onCreate, onJoin }) {
  return (
    <div className="game-mode-screen">
      <div className="game-mode-card">
        <h1 className="game-title">Who's the Liar</h1>
        <p className="welcome-text">Welcome, {username}!</p>
        
        <div className="game-options">
          <div className="option-card" onClick={onCreate}>
            <div className="option-icon">🎮</div>
            <h3 className="option-title">Create Game</h3>
            <p className="option-description">Start a new game and invite friends.</p>
          </div>
          
          <div className="option-card" onClick={onJoin}>
            <div className="option-icon">🚪</div>
            <h3 className="option-title">Join Game</h3>
            <p className="option-description">Enter a game code to join.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameModeScreen;
