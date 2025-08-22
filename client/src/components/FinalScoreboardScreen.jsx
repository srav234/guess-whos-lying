// components/FinalScoreboardScreen.jsx
function FinalScoreboardScreen({ totalScores, onMainMenu }) {
  // Calculate winner(s)
  const sortedPlayers = Object.entries(totalScores)
    .sort(([,a], [,b]) => b - a);
  
  const maxScore = sortedPlayers[0]?.[1] || 0;
  const winners = sortedPlayers.filter(([, score]) => score === maxScore);
  const isTie = winners.length > 1;

  return (
    <div className="final-scoreboard-screen">
      {/* Game Over Banner */}
      <div className="game-over-banner">
        <div className="trophy-icon">🏆</div>
        <h1 className="game-over-title">Game Over!</h1>
        <p className="game-over-subtitle">Thanks for playing Guess Who's Lying</p>
      </div>

      {/* Winner Announcement */}
      <div className="winner-announcement">
        <h2 className="winner-title">
          🎉 {isTie ? 'Winners' : 'Winner'} 🎉
        </h2>
        <div className="winners-list">
          {winners.map(([username, score]) => (
            <div key={username} className="winner-card">
              <div className="winner-avatar">
                <span className="avatar-letter">{username.charAt(0).toUpperCase()}</span>
                <div className="crown-icon">👑</div>
              </div>
              <div className="winner-info">
                <h3 className="winner-name">{username}</h3>
                <p className="winner-score">
                  {isTie ? 'Co-Champion' : 'Champion'} with {score} point{score !== 1 ? 's' : ''}!
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Leaderboard */}
      <div className="final-leaderboard">
        <h2 className="leaderboard-title">Final Leaderboard</h2>
        <div className="leaderboard-list">
          {sortedPlayers.map(([username, score], index) => {
            const rank = index + 1;
            const isWinner = score === maxScore;
            const isTopThree = rank <= 3;
            
            return (
              <div key={username} className={`leaderboard-entry ${isWinner ? 'winner-entry' : ''} ${isTopThree ? 'top-three' : ''}`}>
                <div className="player-info">
                  <span className="player-name">{username}</span>
                </div>
                <div className="score-section">
                  <span className="player-score">{score}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="final-actions">
        <button onClick={onMainMenu} className="main-menu-button">
          Main Menu
        </button>
      </div>
    </div>
  );
}

export default FinalScoreboardScreen;
