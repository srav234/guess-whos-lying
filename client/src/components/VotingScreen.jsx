import { useState } from 'react';

function VotingScreen({ answers, username, realQuestion, onVote, votingStatus, players }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleCardClick = (suspect) => {
    if (submitted) return;
    if (suspect === username) return; // cannot vote for yourself
    setSelectedTarget(suspect);
  };

  const handleSubmitVote = () => {
    if (!selectedTarget || submitted) return;
    setSubmitted(true);
    onVote(selectedTarget);
  };

  return (
    <div className="voting-screen">
      <div className="voting-card">
        <h1 className="game-title">Guess Who's Lying</h1>
        
        <div className="real-question-section">
          <p className="question-label">The real question was:</p>
          <div className="real-question-display">
            {realQuestion}
          </div>
        </div>

        {submitted ? (
          <>
            <div className="voted-message">
              <p>✅ You voted for <strong>{selectedTarget}</strong>. Waiting for others...</p>
            </div>

            <div className="player-status-section">
              <h3 className="player-status-title">Voting Status</h3>
              <div className="player-status-pills">
                {players && players.length > 0 ? (
                  players.map((player, index) => {
                    const hasVoted = votingStatus?.votedUsernames?.includes(player) || false;
                    return (
                      <div
                        key={index}
                        className={`player-status-pill ${hasVoted ? 'submitted' : 'not-submitted'}`}
                      >
                        <span className="player-username">{player}</span>
                        {hasVoted && <span className="checkmark">✓</span>}
                      </div>
                    );
                  })
                ) : (
                  <p className="no-players-message">No players available</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="answers-section">
            <h3 className="answers-header">Vote for who you think had the different question</h3>
            <div className="answers-list">
              {answers.map((a, index) => {
                const isOwn = a.username === username;
                const isSelected = a.username === selectedTarget;
                const selectable = !isOwn;
                return (
                  <div
                    key={index}
                    className={`answer-card ${isOwn ? 'own-answer' : ''} ${selectable ? 'selectable-card' : ''} ${isSelected ? 'selected-answer' : ''}`}
                    onClick={() => selectable && handleCardClick(a.username)}
                    role={selectable ? 'button' : undefined}
                    aria-disabled={!selectable}
                  >
                    <div className="answer-header">
                      <span className="player-name">{a.username} answered...</span>
                      {isOwn && <span className="you-badge">(You)</span>}
                    </div>
                    <div className="answer-text">{a.text}</div>
                  </div>
                );
              })}
            </div>

            <div className="vote-actions">
              <button
                className={`submit-button cast-vote-button`}
                onClick={handleSubmitVote}
                disabled={!selectedTarget}
              >
                {selectedTarget ? `Cast Vote for ${selectedTarget}` : 'Cast Vote'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VotingScreen;
