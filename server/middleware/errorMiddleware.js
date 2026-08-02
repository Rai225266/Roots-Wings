function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  if (err.stack && process.env.NODE_ENV !== 'production') console.error(err.stack);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Duplicate entry. This record already exists.' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
}

module.exports = { notFound, errorHandler };
