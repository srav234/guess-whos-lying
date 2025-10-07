import { useState } from 'react';
import io from 'socket.io-client';

function QuestionScreen({ username, question, roomCode, socket, submissionStatus, players, disconnectNotification }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  


  const handleSubmit = () => {
    const trimmed = answer.trim();
    if (trimmed.length === 0) {
      alert('Please enter an answer.');
      return;
    }

    socket.emit('submit-answer', {
      roomCode,
      username,
      answer: trimmed
    });

    setSubmitted(true);
    
    // Update local submission status immediately for better UX
    const updatedSubmissionStatus = {
      ...submissionStatus,
      submittedUsernames: [...submissionStatus.submittedUsernames, username]
    };
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="question-screen">
      <div className="question-card">
        {disconnectNotification && (
          <div className="disconnect-notification">
            ⚠️ {disconnectNotification}
          </div>
        )}
        <h1 className="game-title">Who's the Liar</h1>
        <h2 className="question-header">Answer the Question</h2>
        <p className="question-instruction"><strong>{username}</strong>, your question is:</p>

        <div className="question-display">
          {question}
        </div>

        <div className="player-status-section">
          <h3 className="player-status-title">Player Status</h3>
          <div className="player-status-pills">
            {players && players.length > 0 ? (
              players.map((player, index) => {
                const hasSubmitted = submissionStatus.submittedUsernames.includes(player);
                return (
                  <div
                    key={index}
                    className={`player-status-pill ${hasSubmitted ? 'submitted' : 'not-submitted'}`}
                  >
                    <span className="player-username">{player}</span>
                    {hasSubmitted && <span className="checkmark">✓</span>}
                  </div>
                );
              })
            ) : (
              <p className="no-players-message">No players available</p>
            )}
          </div>
        </div>

        {!submitted ? (
          <div className="answer-section">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={4}
              placeholder="Type your answer here..."
              className="answer-input"
            />
            <button
              onClick={handleSubmit}
              className="submit-button"
              disabled={answer.trim().length === 0}
            >
              Submit Answer
            </button>
          </div>
        ) : (
          <div className="submitted-message">
            <p>✅ Answer submitted! Waiting for others...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionScreen;
