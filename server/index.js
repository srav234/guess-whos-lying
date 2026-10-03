const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Get frontend URL from environment variable or use localhost for development
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Debug logging for CORS configuration
console.log('🔧 CORS Configuration:');
console.log('   FRONTEND_URL:', FRONTEND_URL);
console.log('   Allowed origins:', [FRONTEND_URL, 'http://localhost:3000']);

const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

const questionPairs = [
  {
    real: "What's the age you had your first crush?",
    liar: "State a number between 5-20"
  },
  {
    real: "What's the most amount of alcoholic drinks you've had in one night?",
    liar: "State a number between 2-30"
  },

  {
    real: "What time period in history would be the most interesting to time travel to?",
    liar: "What would be the most dangerous period in history to time travel to?"
  },
  {
    real: "What's the one thing you can't live without in your house?",
    liar: "What's the most expensive thing you own?"
  },
  {
    real: "What animal would you choose to turn into?",
    liar: "What's an overrated animal?"
  },
  {
    real: "How many push ups can you do?",
    liar: "State a number from 1-40"
  },
  {
    real: "What is your favourite cusine to eat out",
    liar: "What cuisine can you cook the best?"
  },
  {
    real: "What's the last movie that made you cry?",
    liar: "What's the last movie you couldn't finish?"
  },

  {
    real: "What's your favourite form of exercise?",
    liar: "What form of exercise do you avoid at all costs?"
  },
  {
    real: "What's your go to pizza topping?",
    liar: "What pizza topping should be banned?"
  },
  
  {
    real: "What social media app do you use the most?",
    liar: "What social media app do you think is most toxic?"
  },
  {
    real: "How many unread emails do you currently have?",
    liar: "State a number between 0-1000"
  },
  {
    real: "What's your favorite song to sing in the shower?",
    liar: "What's one song that irritates you?"
  },
  {
    real: "How many cups of coffee do you drink per day?",
    liar: "State a number between 0-8"
  },
  {
    real: "What city would you love to live in one day?",
    liar: "What's one city you think is overrated to live in?"
  },
  {
    real: "How many pairs of shoes do you own?",
    liar: "State a number between 5-50"
  },

  {
    real: "What's the most number of days you've gone without showering?",
    liar: "State a number between 0-7"
  },
  {
    real: "If you could be a contestant on any reality TV show, what would it be?",
    liar: "What reality TV show do you hate?"
  },
  {
    real: "What is the household chore you do most frequently?",
    liar: "What is your most enjoyable household chore?"
  },
  {
    real: "What is a word you wish you could delete from everyone's vocabulary?",
    liar: "What's your favourite Gen Z slang?"
  },
  {
    real: "How much money would it take to publish your entire search history online?",
    liar: "State a dollar amount between $0 - $50 million"
  },
  {
    real: "What's a hobby that is a green flag in a partner?",
    liar: "What is a hobby you want to pick up?"
  },
  {
    real: "How old were you when you found out the truth about Santa Claus?",
    liar: "State a number between 4-13"
  },
  {
    real: "What is one hill you are willing to die on?",
    liar: "What do you think is an underrated food combination?"
  },
  {
    real: "What is something people only pretend to like?",
    liar: "What trend or fad would you bring back if you could?"
  },
  {
    real: "What fictional villain do you secretly root for?",
    liar: "Who is your least favourite villain in movie/TV?"
  },

  {
    real: "What's your most irrational fear?",
    liar: "What fear do you think is totally valid?"
  },

  {
    real: "What's a conspiracy theory you kind of believe?",
    liar: "What's the dumbest conspiracy theory you've heard?"
  },
  {
    real: "How many hours per day are you on your phone?",
    liar: "State a number between 2-12"
  },
  {
    real: "What's your go-to excuse to get out of plans?",
    liar: "What excuse do people use to get out of plans that you never believe?"
  },
  {
    real: "What's the most money you've spent on a single meal?",
    liar: "State a dollar amount between $100-1000"
  },

  {
    real: "What celebrity would you want to be best friends with?",
    liar: "What celebrity do you think is overrated?"
  },

  {
    real: "What's your comfort movie that you've watched the most?",
    liar: "What's a movie everyone loves that you think is boring?"
  },

  {
    real: "How many times do you wash your hair per week?",
    liar: "State a number between 1-7"
  },

  {
    real: "What app do you waste the most time on?",
    liar: "What app should no one have?"
  },



  {
    real: "How many hours of sleep do you need to function?",
    liar: "State a number between 4-12"
  },
  {
    real: "What's the dumbest thing you've cried about as an adult?",
    liar: "What's the last thing that made you genuinely happy-cry?"
  },

  {
    real: "What's your most expensive impulse purchase?",
    liar: "What's something you regret buying?"
  },
  {
    real: "How many first dates have you been on?",
    liar: "State a number between 0-50"
  },


  {
    real: "What's your go-to karaoke song?",
    liar: "What's an overrated karaoke song?"
  },
 
  {
    real: "What's your biggest spending category each month (excluding rent/mortgage)?",
    liar: "What's something you wish you spent less money on?"
  },

  {
    real: "What's a song that makes you want to dance?",
    liar: "What's a popular song that is an instant skip?"
  },

  {
    real: "Who’s the most famous person you’ve ever DMed?",
    liar: "Who’s the most famous person you'd like to DM?"
  },

  {
    real: "What TV show would you show your kids",
    liar: "What popular kids TV show did you never watch?"
  },
 
  {
    real: "What is the best name for a dog (you can't use your actual dog's name)",
    liar: "What human name could also be a dog's name?"
    
  },

  {
    real: "What age should you get your first phone?",
    liar: "State a number between 7-16"
  },

  {
    real: "How many people would you have at your wedding",
    liar: "State a number between 50-500"
  },

  {
    real: "If you could receive one gift from Santa this year, what it would be?",
    liar: "What's the first item you would buy for a new apartment?"
  },

  {
    real: "What's the best sport to watch live?",
    liar: "What's the sport you think you're best at?"
  },

  {
    real: "What Christmas song would go hardest in the club?",
    liar: "What is the most overplayed Christmas song?"
  },

  {
    real: "What's the best Christmas movie?",
    liar: "What is the most overplayed Christmas movie?"
  },

  {
    real: "What's your comfort meal?",
    liar: "What meal can you cook the best?"
  },

  {
    real: "If you won the lottery what % would you give to your parents?",
    liar: "List a % between 10-100%"
  },

  {
    real: "If you could make an inanimate object come to life, what would it be?",
    liar: "What's the best physical gift (object) you've ever received?"
  },

  {
    real: "Would you slap a toddler (hard) for $10K?",
    liar: "Answer either Yes or No"
  },

  {
    real: "How much have you made or spent on OnlyFans?",
    liar: "State a $ amount between 0-$10K"
  },

  {
    real: "What's your pitch for an invention that would change the world?",
    liar: "Name any futuristic technology that doesn't yet exist"
  },

  {
    real: "Who's someone that inspires you?",
    liar: "Who's your favourite TV show character?"
  },

  {
    real: "If you could go back in time and tell your 10 year old self one thing, what would it be?",
    liar: "What advice could you give a dog if you could talk to it?"
  },

  {
    real: "How long would you last in a match with a professional boxer?",
    liar: "Name a time between 1 second to 10 minutes"
  },

  {
    real: "Where would you hide buried treasure?",
    liar: "What's a memorable location from your childhood?"
  },

  {
    real: "What's your favourite activity to do with the homies?",
    liar: "What's a group activity that you want to do more of?"
  },

  {
    real: "Can you bench press your bodyweight?",
    liar: "Answer either Yes or No"
  },

  {
    real: "What animal can you do the best impression of?",
    liar: "What animal makes the most annoying sound?"
  },

 ];


require('./game-server')(io, questionPairs);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
