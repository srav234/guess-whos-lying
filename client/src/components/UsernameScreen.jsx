import { useState } from 'react';

function UsernameScreen({ onSubmit }) {
  const [username, setUsername] = useState('');

  const handleSubmit = () => {
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      alert('Username must be at least 2 characters');
      return;
    }

    onSubmit(trimmed);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="username-screen">
      <div className="username-card">
        <h1 className="game-title">Guess Who's Lying</h1>
        <p className="game-subtitle">The ultimate party game of deception and detection</p>
        
        <div className="how-to-play-section">
          <h3 className="how-to-play-header">How to Play:</h3>
          <ul className="how-to-play-list">
            <li>3-10 players join a lobby</li>
            <li>Everyone gets a question (but one player gets a different one!)</li>
            <li>Submit your answers</li>
            <li>Vote for who you think got the different question</li>
            <li>If the majority guesses right, they get a point</li>
            <li>If the majority does not vote out the liar, the liar gets a point</li>
          </ul>
        </div>
        
        <p className="instruction-text">Enter your username to get started.</p>
        
        <div className="input-container">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your username"
            maxLength={20}
            className="username-input"
          />
        </div>
        
        <button 
          onClick={handleSubmit} 
          className="continue-button"
          disabled={username.trim().length < 2}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default UsernameScreen;
