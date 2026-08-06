function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error("========== ERROR ==========");
  console.error("Message:", err.message);
  console.error("Code:", err.code);
  console.error("SQL:", err.sql);
  console.error("SQL Message:", err.sqlMessage);
  console.error("Stack:", err.stack);
  console.error("===========================");

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry. This record already exists.'
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
}
}

module.exports = { notFound, errorHandler };
