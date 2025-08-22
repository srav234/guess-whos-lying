function ResultsScreen({ 
  liar, 
  votes, 
  realQuestion, 
  liarQuestion, 
  roundNumber = 1, 
  totalScores = {}, 
  roundScores = {},
  onNextRound, 
  isAdmin,
  username
}) {
  // Debug logging
  console.log('🎯 ResultsScreen props:', { liar, votes, realQuestion, liarQuestion, roundNumber, totalScores, isAdmin, username });
  
  // Calculate if majority guessed correctly
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
  const liarVotes = votes[liar] || 0;
  const majorityGuessedCorrectly = liarVotes > totalVotes / 2;

  // Build a full list of players (include zero-vote players) and sort by vote count desc
  const allPlayers = Object.keys(totalScores).length
    ? Object.keys(totalScores)
    : Object.keys(votes);
  const sortedVoteEntries = allPlayers
    .map((name) => [name, votes[name] || 0])
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="results-screen">
      <div className="results-card">
        <h1 className="game-title">Guess Who's Lying</h1>
        <h2 className="results-header">Round {roundNumber} Results</h2>

        {/* Success Banner */}
        <div className="success-banner">
          <span className="confetti-emoji">🎉</span>
          <span className="success-text">
            {majorityGuessedCorrectly ? (
              <>The majority guessed correctly! <strong>{liar}</strong> was the liar!</>
            ) : (
              <>Liar wins! <strong>{liar}</strong> was the liar!</>
            )}
          </span>
        </div>

        {/* Vote Results Section */}
        <div className="vote-results-section">
          <div className="vote-results-list">
            {sortedVoteEntries.map(([name, count]) => (
              <div key={name} className={`vote-result-item ${name === liar ? 'liar-highlighted' : ''}`}>
                <div className="player-info">
                  <span className="player-name">{name}</span>
                  {name === liar && (
                    <span className="liar-badge">
                      <span className="bandit-icon">🦹</span>
                      LIAR
                    </span>
                  )}
                  {name === username && <span className="you-badge">YOU</span>}
                </div>
                <div className="vote-count">
                  <span className="vote-number">{count}</span>
                  <span className="vote-text"> vote{count !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real Questions Section */}
        <div className="real-questions-section">
          <h3 className="real-questions-header">The Real Questions:</h3>
          <div className="questions-list">
            <div className="question-item">
              <span className="question-label">Everyone else:</span>
              <span className="question-text">{realQuestion}</span>
            </div>
            <div className="question-item">
              <span className="question-label">{liar} (Liar):</span>
              <span className="question-text">{liarQuestion}</span>
            </div>
          </div>
        </div>

        {/* Total Scores Section */}
        <div className="total-scores-section">
          <h3 className="total-scores-header">Overall Scoreboard</h3>
          <div className="total-scores-list">
            {Object.entries(totalScores)
              .sort(([,a], [,b]) => b - a)
              .map(([name, score]) => {
                const roundScore = roundScores[name] || 0;
                return (
                  <div key={name} className="total-score-item">
                    <span className="player-name">{name}</span>
                    <div className="score-display">
                      {roundScore > 0 && (
                        <span className="round-score-pill">+{roundScore}</span>
                      )}
                      <span className="total-score">{score}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Next Round Button or See Results Button */}
        {isAdmin && (
          <div className="next-round-section">
            {roundNumber >= 3 ? (
              <button onClick={onNextRound} className="next-round-button see-results-button">
                See Results
              </button>
            ) : (
              <button onClick={onNextRound} className="next-round-button">
                Next Round
              </button>
            )}
          </div>
        )}

        {/* Waiting Message for Non-Admins */}
        {!isAdmin && (
          <div className="waiting-section">
            <p className="waiting-text">Waiting for admin to start next round...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResultsScreen;
