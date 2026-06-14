// src/channel-service/app.js
// Express app setup for Channel Service — no port binding here.

const express = require('express');
const cors = require('cors');
const router = require('./routes/index');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' })); // Large batches of messages

app.use((req, _res, next) => {
  console.log(`[Channel] ${req.method} ${req.path} (${req.body?.messages?.length ?? ''} msgs)`);
  next();
});

app.use('/', router);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use(errorHandler);

module.exports = app;
