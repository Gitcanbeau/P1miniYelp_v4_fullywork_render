const mongoose = require('mongoose');
const dotenv = require('dotenv');

// console.log(x);// will NOT show up UNCAUGHT EXCEPTION!

// this uncaught exception handler should be at the very top of our code
// Or at least before any other code is really executed.
// Because watch what happens if I move "console.log(x)" before this uncaught exception handler.
// it does not catch this exception
// this is because only at the end of process.on(uncaught exception), we actually start listening for an uncaught exception.
// But in this case here, the uncaught exception happens before we even listen to

//all errors or bugs which occur in our synchronous code but are not handled anywhere are called uncaught exceptions.
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
  // when there is an uncaught exception,
  // we really, really need to crash our application
  // because after there was an uncaught exception,
  // the entire node process is in a so-called unclean state, all right?
  // And so to fix that, the process need to terminate by process.exit(1)
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//Errors outside express: unhandled rejections and uncaught exceptions should be provided in server.js
//errors inside express, like global error handler will be provided in app.js
//ex, providing wrong mongoDB connection uri
//'unhandledRejection' is the event name
process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
    // not like uncaught exception, crashing the application is optional in the unhandled rejection
  });
});

// Now, in Node.js, it's not really a good practice to just blindly rely on these two error handlers
// uncaught exception and unhandled rejection
// So ideally errors should really be handled right where they occur.
// So for example, in the problem connecting to the database, we should add a catch handler there
// and not just simply rely on the unhandled rejection callback that we have here, okay?

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});

// console.log(x);// will show up UNCAUGHT EXCEPTION!
