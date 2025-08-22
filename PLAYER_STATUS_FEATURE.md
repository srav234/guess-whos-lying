# Player Status Tracking Feature

## Overview
This feature adds real-time tracking of which players have submitted their answers on the QuestionScreen. Players can see the submission status of all participants through visual status pills.

## Features
- **Real-time Updates**: Player submission status updates in real-time as players submit their answers
- **Visual Status Pills**: Each player is represented by a pill that changes from grey (not submitted) to purple (submitted) with a checkmark
- **Responsive Design**: Pills automatically wrap and center-align for different screen sizes
- **Immediate Feedback**: Players see their own submission status change immediately upon submitting

## Technical Implementation

### Server Side (server/index.js)
- Added `submission-status-update` event emission in `submit-answer` handler
- Added initial submission status emission in `startNewRound` function
- Status includes `submittedUsernames` array and `totalPlayers` count

### Client Side (client/src/App.js)
- Added `submissionStatus` state to track submission status
- Added event listener for `submission-status-update` events
- Passes submission status and players list to QuestionScreen

### QuestionScreen Component (client/src/components/QuestionScreen.jsx)
- Displays player status pills below the question
- Shows grey pills for players who haven't submitted
- Shows purple pills with checkmarks for players who have submitted
- Handles edge cases (empty players array, etc.)

### Styling (client/src/App.css)
- Responsive pill design with smooth transitions
- Purple theme matching the game's color scheme
- Hover effects and visual feedback
- Proper spacing and typography

## User Experience
1. When the game starts, all players see grey pills representing "not submitted"
2. As each player submits their answer, their pill turns purple with a checkmark
3. Players can see at a glance who still needs to submit
4. The status updates in real-time across all connected clients

## Future Enhancements
- Add player avatars or initials to the pills
- Show submission timestamps
- Add animations for status changes
- Include player scores or other metadata in the pills

