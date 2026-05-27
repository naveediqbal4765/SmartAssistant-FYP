const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const http = require('http');
const app = require('./app');
const { connectDatabase } = require('./config/database');
const { initializeCommunicationSockets } = require('./modules/communication/sockets/socket.server');
const { startReminderWorker } = require('./modules/reminders/reminder.worker');
const { startTelemetrySimulator } = require('./modules/health/telemetry/telemetry.simulator');

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initializeCommunicationSockets(httpServer);

connectDatabase()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      startReminderWorker();
      startTelemetrySimulator();
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });
