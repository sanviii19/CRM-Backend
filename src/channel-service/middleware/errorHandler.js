// src/channel-service/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  console.error(`[Channel-Service ERROR] ${req.method} ${req.path} → ${status}: ${err.message}`);
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}

module.exports = { errorHandler };
