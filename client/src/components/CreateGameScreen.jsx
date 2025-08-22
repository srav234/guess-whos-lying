// components/CreateGameScreen.jsx
function CreateGameScreen({ username, roomCode, onStart }) {
  return (
    <div className="screen">
      <h2>Room Created</h2>
      <p>Welcome, {username}! You are the admin of this game.</p>

      <div style={{
        margin: '2rem 0',
        padding: '1.5rem',
        border: '2px dashed #667eea',
        borderRadius: '12px',
        background: '#f8f9ff',
        textAlign: 'center'
      }}>
        <h3>Room Code</h3>
        <div style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          color: '#333'
        }}>
          {roomCode}
        </div>
      </div>

      <button
        onClick={onStart}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          borderRadius: '8px',
          backgroundColor: '#667eea',
          color: 'white',
          border: 'none'
        }}
      >
        Start Game
      </button>
    </div>
  );
}

export default CreateGameScreen;
