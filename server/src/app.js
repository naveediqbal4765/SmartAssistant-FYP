const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'smart-senior-session-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/user', require('./modules/profile/profile.routes'));
app.use('/api/location', require('./modules/location/location.routes'));
app.use('/api/tasks', require('./modules/tasks/task.routes'));
app.use('/api/reminders', require('./modules/reminders/reminder.routes'));
app.use('/api/health', require('./modules/health/health.routes'));
app.use('/api/communication', require('./modules/communication/communication.routes'));
app.use('/api/messages', require('./modules/communication/chat/messageReaction.routes'));
app.use('/api/voice-notes', require('./modules/communication/chat/voiceNoteReaction.routes'));
app.use('/api/emergency', require('./modules/emergency/emergency.routes'));

app.get('/', (req, res) => {
  res.json({ message: 'Smart Assistant Backend is Running!' });
});

app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(err.status || 500).json({
    success: false,
    msg: err.message || 'Something went wrong. Please try again.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
