function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  console.error("========== ERROR ==========");
  console.error("URL:", req.originalUrl);
  console.error("METHOD:", req.method);
  console.error(err.stack);   // <-- This is the important line
  console.error("===========================");

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
}

module.exports = { notFound, errorHandler };
