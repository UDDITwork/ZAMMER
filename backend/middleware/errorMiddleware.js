const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error(`ERROR: ${err.message}`);
  console.error(err.stack);

  // Handle different types of errors
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }
  
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = `Resource not found with id: ${err.value}`;
  }
  
  if (err.code === 11000) { // Duplicate key error
    statusCode = 400;
    message = `Duplicate field value entered: ${JSON.stringify(err.keyValue)}`;
  }

  // Send the error response
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    error: process.env.NODE_ENV === 'production' ? undefined : err,
  });
};

module.exports = { errorHandler };