const crypto = require('crypto');
//Crypto is a module in Node. js which deals with an algorithm that performs data encryption and decryption.
//This is used for security purpose like user authentication where storing the password in Database in the encrypted form.
//Crypto module provides set of classes like hash, HMAC, cipher, decipher, sign, and verify.
const { promisify } = require('util');
//Asynchronous function types: util. promisify is primarily designed
//for converting traditional Node. js-style callback functions that follow the (error, result) signature.
const jwt = require('jsonwebtoken');
//A JSON Web Token, popularly known as JWT, is an open standard that defines
//a compact way for securely sharing information between two parties: a client and a server.
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

//1.the user's client starts by making a post request with the username or email and the password.
//2.the server then checks if the user exists and if the password is correct.
//And if so, a unique Json Web Token for only that user is created using a secret string that is stored on a server.
//3.the server then sends that JWT back to the client
//4.the JWT will store it either in a cookie or in local storage of client

//5.Now once the request hits the server with other url request GET/POST/etc, our app will then verify if the Json Web Token is actually valid
//6. if is valid,  then the requested data will be sent to the client
//7. if not, then there will be an error telling the user that he's not allowed to access that resource

// And just like this the user is authenticated and basically logged into our application without leaving any state on the server.
// therefore this process is completely stateless.
// So the server does in fact not know which users are actually logged in.
// But of course, the user knows that he's logged in because he has a valid Json Web Token which like a passport to access protected parts of the application.

// note that all this communication must happen over https.
// So secure encrypted http in order to prevent that anyone can get access to passwords or Json Web Tokens.
//
//
//
//
//
//JWT is an encoding string made up of three parts: the header, the payload and the signature.
//1.the header is just some metadata about the token itself
//2.the payload is the data that we can encode into the token, any data really that we want.
// Anyway, these two parts are just plain text that will get encoded, but not encrypted.
// So anyone will be able to decode them and to read them. So we cannot store any sensitive data in here.
//3.The signature is created using the header, the payload and the secret that is saved on the server.
//this whole process is then called signing the Json Web Token.
// So again, the signing algorithm takes the header, the payload and the secret to create a unique signature.
// which then gets sent to the client.

// once the server receives a JWT to grant access to a protected route, it needs to verify it in order to determine if the user really is who he claims to be, right?
// In other words, it will verify if no one changed the header and the payload data of the token.
// So again, this verification step will check if no third party actually altered either the header or the payload of the Json Web Token.
//
// So once the server receive the JWT from client, the verification will take it's header and payload and together with the secret that is still saved on the server, basically create a test signature.
// But the original signature that was generated when the JWT was first created is still in the token, right?
// Because now all we have to do is to compare the test signature with the original signature.
// And if the test signature is the same as the original signature, then it means that the payload and the header have not been modified, right?
// Because if they had been modified, then the test signature would have to be different.
// Therefore in this case where there has been no alteration of the data, we can then authenticate the user.
// And of course, if the two signatures are actually different, well, then it means that someone tampered with the data. Usually by trying to change the payload.
// But that third party manipulating the payload does of course not have access to the secret, so they cannot sign the JWT.
// So the original signature will never correspond to the manipulated data. And therefore, the verification will always fail in this case.
// And that's the key to making this whole system work.

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });
  // secure: true, means, the cookie would not be created and not be sent to the client.

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

//localhost:3000/api/v1/users/signup
// {
//   "name":"testuser2",
//   "email":"testuser2@email.com",
//   "password":"Pwduser2test",
//   "passwordConfirm":"Pwduser2test"
// }
//post
//should provide the token after sending the request
// "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1NTBkYzE2Njk2NTY3MTk1NzA0ZjBhNSIsImlhdCI6MTY5OTc5ODk4OCwiZXhwIjoxNzA3NTc0OTg4fQ.wdgvUQaARszrIMTzVpW5XttnhWdAiMZXR2qJX6OBdx4",
//go to https://jwt.io to see how the token above work
//you can also obtain token by providing the "id":"6550dc16696567195704f0a5" in the payload
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

//localhost:3000/api/v1/users/login
//post
// {
//   "email":"testuser2@email.com",
//   "password":"Pwduser2test"
// }
//after you login, in postman, you will see status success. if check the cookie tab, you will see the jwt is temporarily saved in cookie
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //extract these two variables from req.body

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

//after login, collect the token
//localhost:3000/api/v1/users/me
//get
//Headers tab add Authorization as a key, and Bearer + token as the value
//Headers tab add Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1NTBkYzE2Njk2NTY3MTk1NzA0ZjBhNSIsImlhdCI6MTY5OTgwMDczMywiZXhwIjoxNzA3NTc2NzMzfQ.0ZOnuFolZFKYx3cY3X_8ycL9TgPP7jhjHFBe9XVqu_0
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  //because we may need to update the token, so using let keyword is much better than using const keyword
  // console.log(req.headers);
  //login the postman, you can check the headers by console log or directly check in the postman headers tab
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //make it return a promise

  //console.log(decoded);
  //it contains id, iat, exp
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  //sign up a new user, login this new user, collect the token
  //localhost:3000/api/v1/users/me
  //Headers tab add Authorization as a key, and Bearer + token as the value
  //you can access the getMe page
  //in the database, add passwordChangedAt property which is in future
  //localhost:3000/api/v1/users/me
  //use the previous Bearer + token
  //you cannot access the getMe page
  //"message": "User recently changed password! Please log in again.",
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

//advanced feature of Postman
//add dev environment, provide URL as http://127.0.0.1:300/
//replace the original url with {{URL}}
// under dev environment
//{{URL}}api/v1/users/signup
//under Tests tab, select "Set an environment variable" as snippets
//pm.environment.set("jwt", pm.response.json().token);
//post
//open the dev environment, you can see jwt is automatically added underneath URL key-value pair
//{{URL}}api/v1/users/me
//delete Headers and Body, open Authorization tab and select Bearer and Token, put {{jwt}}
//get
//success
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

//localhost:3000/api/v1/users/forgotPassword
// {
//   "email":"loulou@example.com"
// }
//post
//check in the database, under user of "loulou@example.com", resetToken is provided
// passwordResetExpires 2023-11-12T17:23:25.777+00:00
// passwordResetToken "0ede63d8ca36f074d8a83ad2ce2b2359197a17db90428d3067491f8f5e9f4dce"
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

//copy the resetToken provided in the database
//localhost:3000/api/v1/users/resetPassword/0ede63d8ca36f074d8a83ad2ce2b2359197a17db90428d3067491f8f5e9f4dce
// {
//   "password":"Pwdcanw2336",
//   "passwordConfirm":"Pwdcanw2336"
// }

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, req, res);
});

//login and get the token
//localhost:3000/api/v1/users/updateMyPassword
//use Headers tab, provide Authentication as key, provide Bearer+token as value
//patch
// {
//   "passwordCurrent":"Pwdcanw2335",
//   "password":"Pwdcanw2336",
//   "passwordConfirm":"Pwdcanw2336"
// }
//every time test, first login with correct pwd and get token; after first step updateMyPassword with that token and correct old password
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, req, res);
});
