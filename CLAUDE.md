# Project guide

Multiplayer social deduction game using React, Express and Socket.IO. Frontend deploys to Vercel; backend to Render.

## Commands

- Client: `npm start`, `npm run build`, `CI=true npm test -- --watchAll=false --runInBand`
- Server: `npm start`, `npm run dev`, `npm test` (Node's built-in test runner)

Run these commands in `client/` or `server/` respectively.

## Architecture

`server/index.js` configures HTTP/CORS and contains the question pool. `server/game-server.js` owns rooms, stable player tokens, scores, phase transitions and socket validation. `client/src/App.js` renders screens from authoritative `room-state` snapshots and persists a room code/player token in localStorage for refresh/reconnect recovery.

Phases: `lobby`, `answering`, `voting`, `results`, `finished`, `ended`.

Client requests: `create-room`, `join-room`, `resume-room`, `leave-room`, `start-game`, `next-round`, `submit-answer`, `submit-vote`. Every request uses an acknowledgement `{ ok, error?, token?, state? }`. Answers/votes include `roundNumber`; identity comes from the socket's authenticated membership rather than submitted usernames. Room codes are generated on the server. Only room members may submit, and only the admin may advance phases. New players cannot join after a game starts.

Snapshots are personalized: each player sees only their assigned question during answering. Submission state is owned by the server, so remounting or reconnecting does not enable duplicate answers/votes. Answers are limited to 1000 characters; rooms support 3–10 players.

## Reconnect and leaving

A disconnected player's seat is retained for two minutes. `resume-room` verifies the saved token and rebinds the new socket, restoring the phase, question, scores and submission flags. Admin transfers to a connected player when the current admin disconnects. Starting a round waits for everyone to be connected. If a participant leaves or expires during answering/voting, the round is cancelled and the final-score screen is available. Empty rooms are deleted after sessions expire. Explicit Main Menu requests leave the room and clear localStorage.

Rooms are stored in process memory. Reconnect recovery works while this backend process remains alive. Process restarts lose rooms; multiple backend replicas would require shared storage and Socket.IO coordination. Deploy client and server together because the event protocol changed.

## Scoring

Strictly more than half of all round participants must vote for the liar to catch them. If caught, every non-liar receives one point; otherwise the liar receives one point. The server computes this result once. As soon as any score reaches five, the phase becomes `finished`; players reaching five together share victory. Final scores are frozen so departures cannot change the completed scoreboard.

## Tests

Server tests cover authorization, phases, duplicates, stale rounds, reconnect and expiry, private questions, majority ties, immediate five-point wins, and final-score preservation. Client tests cover failed/acknowledged lobby entry, stored session recovery, restored answer submissions, and immediate final-screen display.

## Configuration

- `REACT_APP_BACKEND_URL`: frontend backend URL (default localhost:3001).
- `FRONTEND_URL`: server allowed frontend origin (default localhost:3000).
- `PORT`: backend port (default 3001).

See DEPLOYMENT.md for hosting setup. Name/code inputs use explicit field names and `autocomplete=off`; mobile browser autofill behavior must be checked on the affected device.
