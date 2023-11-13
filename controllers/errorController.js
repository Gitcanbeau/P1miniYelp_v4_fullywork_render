const AppError = require('./../utils/appError');

//localhost:3000/api/v1/restaurants/111111111
//"message": "Cast to ObjectId failed for value \"111111111\" (type string) at path \"_id\" for model \"RestaurantMiniYelp\"",
const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

//localhost:3000/api/v1/restaurants
//POST
//in the body, provide json, "name":"BCD TOFU HOUSE"
//which is same to the data in DB
//"message": "E11000 duplicate key error collection: test.userminiyelps index: email_1 dup key: { email: \"testuser1@email.com\" }",
const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

//localhost:3000/api/v1/restaurants
//POST
//in the body, provide json, "opentime":100
//which doesnt meet the requirement of restaurant model
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  //Object here is the {"name":["message":"xxxxxx", "xx":"xxxx"]}
  //map the value of the Object, which means map the array
  //print each element.message
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

//localhost:3000/api/v1/users/me
//get
//Headers tab add Authorization as a key, and Bearer + token as the value
//provide a wrong token
//"message": "invalid token",
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

//change the config.env file JWT_EXPIRES_IN=5s JWT_COOKIE_EXPIRES_IN=5
//login first
//localhost:3000/api/v1/users/me
//get
// "message": "jwt expired",
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

//During development, you're building and running the application on your local machine.
//Going to production is the process of making your application ready to be deployed and consumed by users.
//provide as detailed as possible of the error message in the Dev stage
const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  //operatinoal, trusted error: send message to client
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }

    console.error('ERROR 💥', err);
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }

  //programming error or other unkown error: dont leak error details to client
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    //let keyword allows to make a hard copy of the original err
    //The spread (...) syntax allows an iterable, such as an array or string, to be expanded in places
    //where zero or more arguments (for function calls) or elements (for array literals) are expected.
    //In an object literal, the spread syntax enumerates the properties of an object
    //and adds the key-value pairs to the object being created.
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
