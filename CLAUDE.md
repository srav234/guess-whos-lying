# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A multiplayer social deduction game where one player (the "liar") receives a different question than everyone else. Players submit answers, then vote on who they think is the liar based on the responses.

**Tech Stack:**
- Frontend: React (Create React App) with Socket.IO client
- Backend: Express + Socket.IO server for real-time WebSocket communication
- Deployment: Vercel (frontend) + Render (backend)

## Development Commands

### Client (React)
```bash
cd client
npm start          # Start dev server on localhost:3000
npm test           # Run tests
npm run build      # Production build
```

### Server (Express + Socket.IO)
```bash
cd server
npm start          # Start server on port 3001 (or PORT env var)
npm run dev        # Start with nodemon (auto-reload)
```

### Running Both
Run server and client in separate terminals. Client connects to `REACT_APP_BACKEND_URL` (defaults to localhost:3001 in dev).

## Architecture

### Real-time Communication Model

The game uses Socket.IO for all real-time updates. The server maintains authoritative game state in memory:

- **rooms**: `{ [roomCode]: { players, liarSocketId, realQuestion, liarQuestion, scores, creator, currentAdmin, gameQuestions, currentRound } }`
- **socketToRoom**: Maps socket IDs to room codes
- **answers**: `{ [roomCode]: [{ username, answer }] }`
- **votes**: `{ [roomCode]: [{ voter, target }] }`

All game state is ephemeral - rooms are deleted when all players disconnect.

### Key Socket Events

**Client → Server:**
- `create-room`: Creates new room with generated code
- `join-room`: Joins existing room
- `start-game`: Admin starts game (selects 3 random questions)
- `submit-answer`: Player submits answer to their question
- `submit-vote`: Player votes for who they think is the liar
- `next-round`: Admin advances to next round

**Server → Client:**
- `update-players`: Broadcasts current player list with admin info
- `error-message`: Error notifications
- `game-started`: Individual question sent to each player (liar gets different question)
- `submission-status-update`: Real-time tracking of who has submitted
- `voting-start`: All answers ready, begin voting phase
- `results`: Round results with vote tally and liar reveal
- `game-over`: Final scores after 3 rounds

### Game Flow

1. **Lobby Phase**: Players join room, admin starts when ≥3 players
2. **Question Phase**: Each player sees their question (liar sees different one), submits answer
3. **Voting Phase**: All answers shown anonymously, players vote for suspected liar
4. **Results Phase**: Reveal liar and votes. If majority voted for liar → non-liars get +1 point. Otherwise → liar gets +1 point
5. Repeat for 3 rounds total (questions pre-selected at game start)
6. **Final Scoreboard**: Game over, display winners

### Frontend State Management

`App.js` is the main orchestrator with ~20+ state variables managing:
- User identity (username)
- Room info (roomCode, players, roomCreator, currentAdmin)
- Game phase (inLobby, gameStarted, votingStarted, results, gameOver)
- Current data (question, answersForVoting, roundNumber, totalScores)
- UI state (joinError, lobbyError, submissionStatus)

Socket event handlers update state, triggering conditional rendering of screen components.

### Admin System

The room creator is the initial admin. If admin disconnects, server randomly assigns a new admin from remaining players. Only admins can:
- Start the game
- Advance to next round

### Question System

Server has 20+ question pairs (real vs liar versions). On `start-game`, server randomly selects 3 pairs and stores them in `room.gameQuestions`. Each round uses the next question pair.

### Submission Status Feature

Real-time visual feedback showing which players have submitted answers:
- Server emits `submission-status-update` after each submission
- Client displays status pills in QuestionScreen (grey = pending, purple + checkmark = submitted)
- Automatically advances to voting when all players submit

## Important Implementation Notes

### CORS Configuration

Frontend URL must be configured in server CORS settings. Server reads `FRONTEND_URL` env var (defaults to localhost:3000). Both Socket.IO and Express middleware require CORS config.

### Error Handling

"Need at least 3 players" errors have special handling - they force user to stay in lobby and display error there (not as alert). This prevents accidental navigation away from lobby.

### Player Reconnection

No reconnection logic - if a player disconnects, they're removed from the room. If the room becomes empty, it's deleted along with associated game state.

### Config Files

- `client/src/config.js`: Backend URL configuration (reads `REACT_APP_BACKEND_URL`)
- `server/index.js`: Main server file with all Socket.IO event handlers
- `client/src/App.js`: Main client orchestrator with all socket event listeners

### Scoring Logic

- Majority threshold: `Math.ceil(totalPlayers / 2)`
- If liar votes ≥ majority → all non-liars get +1 point
- Otherwise → liar gets +1 point
- Scores accumulate across 3 rounds

### Component Architecture

All screen components are in `client/src/components/`:
- UsernameScreen → GameModeScreen → JoinGameScreen/LobbyScreen
- LobbyScreen → QuestionScreen → VotingScreen → ResultsScreen (repeats 3x) → FinalScoreboardScreen

Each screen receives relevant props from App.js (state + callbacks).

## Deployment

See DEPLOYMENT.md for full deployment guide. Key points:
- Frontend: Vercel (set `REACT_APP_BACKEND_URL`)
- Backend: Render (set `FRONTEND_URL`, `NODE_ENV=production`, `PORT=10000`)
- Health check endpoint: `/health` (for Render monitoring)
