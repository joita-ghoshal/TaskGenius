const errorHandler = (err, req, res, next) => {
  console.error(err.message || err);

  if (err.code === 'P2002') {
    return res.status(400).json({ success: false, message: 'Duplicate field value' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
