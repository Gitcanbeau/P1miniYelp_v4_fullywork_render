const path = require('path');
//The Path module provides a way of working with directories and file paths.
const express = require('express');
//Express is a node js web application framework that provides broad features for building web and mobile applications.
//It is used to build a single page, multipage, and hybrid web application.
//It's a layer built on the top of the Node js that helps manage servers and routes.
const morgan = require('morgan');
//Morgan is another HTTP request logger middleware for Node. js.
//It simplifies the process of logging requests to your application.
//Winston gives you a lot more flexibility with additional transports and also makes it easy to query your logs for analysis.
const rateLimit = require('express-rate-limit');
//Basic rate-limiting middleware for Express.
//Use to limit repeated requests to public APIs and/or endpoints such as password reset.
//Plays nice with express-slow-down and ratelimit-header-parser.
const helmet = require('helmet');
//The well-known Node. js package Helmet. js can secure your Internet apps by monitoring, managing, and controlling their HTTP headers.
//A Content Security Policy (CSP), which is one of the core features of Helmet.
const mongoSanitize = require('express-mongo-sanitize');
//Express Mongo Sanitize is a package that provides middleware to sanitize user input before it is used in a database query.
//It is designed specifically to prevent NoSQL injection attacks in Node. js applications that use MongoDB.
const xss = require('xss-clean');
//The "xss-clean" module, on the other hand, prevents XSS attacks by sanitizing user input.
//It does this by escaping characters that could be used to execute scripts, such as "<" and ">".
//This ensures that any user input is safe to use and cannot be used to execute malicious scripts.
const hpp = require('hpp');
//HTTP Parameter Pollution (HPP) is an attack in which multiple params are sent with the same name, causing your Node. js app to parse them differently.
//👉🏼 Use hpp with Express to always resolve with the last value as a String.
const cookieParser = require('cookie-parser');
//Cookie Parser is a middleware of Node JS used to get cookie data.
//To get Cookie data in ExpressJS, req. cookies property is used. req.
const bodyParser = require('body-parser');
//What Is Body-parser? Express body-parser is an npm module used to process data sent in an HTTP request body.
//It provides four express middleware for parsing JSON, Text, URL-encoded, and raw data sets over an HTTP request body
const compression = require('compression');
//Compression in Node. js and Express decreases the downloadable amount of data that's served to users.
//Through the use of this compression, we can improve the performance of our Node. js applications as our payload size is reduced drastically.
const cors = require('cors');
//All requests made from the front end of a different origin or to a back end of a different origin will be blocked by the browser.
//CORS allows us to bypass this policy in case of scenarios where accessing third-party resources becomes necessary.

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const restaurantRouter = require('./routes/restaurantRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.enable('trust proxy');
// etting up our templating engine in Express, which will then allow us
// to render out websites using simple templates
app.set('view engine', 'pug');
//MVC architecture, launch the __dirname/views folder to 'views'
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.options('*', cors());
app.use(express.static(path.join(__dirname, 'public')));

//SECURITY SECTION
//compromised database
//-strongly encrypt passwords with salt and hash
//-storngly encrpy password reset tokens

//brute force attacks
//-use bcrypt ot make login request slow
//-implement express-rate-limit
//-implement maximum login attempts

//cross-site scripting attacks
//-store JWT in HTTPOnly cookie
//-sanitize user input data
//-set special HTTP headers by helmet package

//denial-of-service attack
//-implement express-rate-limit
//-limit body payload in body-parser
//avoid evel regular expression

//nosql query injection
//-use mongoose for MongoDB because of schemaTypes
//-sanitize user input data

//other best practices and suggestions
//-always use HTTPS
//-create random password reset tokens with expiry dates
//-deny access to JWT after password change
//-dont commit sensitive config data to GIT
//-dont send error details to client
//-prevent cross-site request forgery by csurf package
//-require re-authentication before a high-value action
//-implement a blacklist of untrusted JWT
//-confirm user email address after first creating account
//-keep user logged in with refresh tokens
//-implement two-factor authentication
//-prevent parameter pollution causing Uncaught Exceptions

//http headers
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//localhost:3000/api/v1/restaurants
//X-RateLimit-Remaining:99
//if you change the max to 3, then you can only access to this url from same IP up to 3 times
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

app.post(
  '/webhook-checkout',
  bodyParser.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

app.use(express.json({ limit: '10kb' }));
//By default, express. json() limits the request body to 100kb. If the request body is any larger,
//Express will throw an HTTP 413 "Payload Too Large" error. You can configure this limit using the limit option to express.
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
//The express.urlencoded() function is a built-in middleware function in Express.
//It parses incoming requests with URL-encoded payloads and is based on a body parser.
//extended: true.
//The extended option allows to choose between parsing the URL-encoded data with the querystring library (when false ) or the qs library (when true ).
//The “extended” syntax allows for rich objects and arrays to be encoded into the URL-encoded format, allowing for a JSON-like experience with URL-encoded.
app.use(cookieParser());

//you can login with invalid email, but mongoSanitize can help prevent this malicious attack.
//express
// {
//   "email":{"$gt":""},
//   "password":"pass1234"
// }
app.use(mongoSanitize());
app.use(xss());
// xss willlook at the request body, the request query string, and also at Request.Params
// after that, xss will basically filter out all of the $ signs and dots,
// because that's how MongoDB operators are written.
// By removing that, well, these operators are then no longer going to work.
app.use(
  hpp({
    whitelist: [
      'opentime',
      'endtime',
      'ratingsQuantity',
      'ratingsAverage',
      'tag',
      'popularity',
      'price'
    ]
  })
);

app.use(compression());
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/', viewRouter);
app.use('/api/v1/restaurants', restaurantRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//console.log(x);//here will show up UNCAUGHT EXCEPTION!

//method1
// app.all('*', (req, res, next) => {
//   res.status(404).json({
//     status:'fail',
//     message:`cannot find ${req.originalUrl} on this server!`
//   });
// });

//method2
// app.all('*', (req, res, next) => {
//   const err = new Error(`cannot find ${req.originalUrl} on this server!`);
//   err.status = 'fail';
//   err.statusCode = 404;
//   next(err);
//    //pass the err to next middleware, which is namely the code 125-132
// });
// app.use((err, req, res, next) => {
//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || 'error';
//   res.status(err.statusCode).json({
//     status: err.status,
//     message: err.message
//   });
// });

//method3 create a child class AppError to extend Error class
//localhost:3000/api/restaurants
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
//this error handler should be put at the last, bc * represents all the routes
//prior to this error handler, we provide as much as possible the routes, if cannot match with any of above
//we could consider the url sent by client is invalid, then this unhandled routes error handler can work

app.use(globalErrorHandler);

module.exports = app;

//console.log(x);//here will show up UNCAUGHT EXCEPTION!

//The order in which middleware and route handlers are declared in Express matters.
//In the provided code, app.use(globalErrorHandler) is placed at the end of the middleware and route handlers, and it serves as a global error handling middleware.
//1.Before reaching the global error handler, the code sets up specific routes and middleware.
// In our case, restaurantRouter and userRouter are mounted with specific prefixes (/api/v1/restaurants and /api/v1/users).
// This ensures that if a request matches one of these routes, the corresponding route handler will be executed.
//2.The app.all('*', ...) middleware acts as a fallback for any request that doesn't match the specific routes defined earlier.
// If a request reaches this point, it means that there was no matching route for the requested URL.
// In such cases, it triggers a 404 error by creating an instance of AppError and passing it to next().
// After attempting to match specific routes and handling the case where no route matches, the global error handler (globalErrorHandler) is used. Placing it at the end ensures that it catches any errors that were thrown or passed to next() during the request lifecycle.
//3.This global error handler is responsible for handling errors that might have occurred at any point during the request-response cycle.
// It is invoked if next() is called with an argument (an error).
// This allows for consistent error handling and responses regardless of where the error originated.
