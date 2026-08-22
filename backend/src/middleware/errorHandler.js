// Centralized error handler. Any thrown error or next(err) call lands here.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.type === "validation") {
    return res.status(400).json({ error: err.message, details: err.details });
  }

  const status = err.status || 500;
  const message = status === 500 ? "Something went wrong on our end." : err.message;
  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
