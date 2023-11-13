const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
//It validates a request's body, query, or params.
//It also supports async filters and complex JSON structures like arrays or nested objects.
const bcrypt = require('bcryptjs');
//It is important to salt and hash users' passwords before storing them for data safety intents.
//Bcrypt turns a simple password into fixed-length characters called a hash.
//Before hashing a password, bcrypt applies a salt — a unique random string that makes the hash unpredictable.

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
    //"message": "UserMiniYelp validation failed: email: Please provide a valid email",
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please comfirm your password'],
    validate: {
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'referee', 'leader', 'admin'],
    default: 'user'
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  // And so the higher this cost parameter 12 here,
  // the more CPU intensive the process will be
  // and the better the password will be encrypted

  // hash here is the async version
  // But as you already know, we do not want to use the synchronous version because
  // that will block the event loop and then prevent other users from using the application.

  //  the asynchronous version will then return a promise
  //  and we need to await that promise, of course,
  this.passwordConfirm = undefined;
  //And so after this validation was successful,
  //we actually no longer need this field
  //so we really do not want to persist it to the database.
  //And so that's why we simply set it here to undefined.
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
  //Instead, passwords are “hashed”, or transformed with a one-way function.
  //The result of the transformation, if one is performed correctly, cannot be reversed, and the original password cannot be “decrypted” from the result of a hash function.
  //if you completely forgot the pwd in the user database, i would suggest to change pwd
};

//localhost:3000/api/v1/users/signup
//post
// {
//   "name":"testuser3",
//   "email":"testuser3@email.com",
//   "password":"Pwduser3test",
//   "passwordConfirm":"Pwduser3test",
//   "passwodChangedAt":"2023-11-23"
// }
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
    //JWT iat 300
    //changedTimeStamp at 200
    //means dont actually change the pwd
    //return false
    //therefore put "<" above
  }
  return false; //dont change the pwd at all, therefore return false
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  //The crypto.randomBytes() method is used to generate a cryptographically well-built artificial random data
  //and the number of bytes to be generated in the written code.
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  //crypto.createHash() method is used to create a Hash object that can be used to create hash digests by using the stated algorithm.

  //The hash.digest( ) method is an inbuilt function of the crypto module’s Hash class.
  //This is used to create the digest of the data which is passed when creating the hash.
  //For example, when we create a hash we first create an instance of Hash using crypto.createHash() and then we update the hash content using the update( ) function but till now we did not get the resulting hash value,
  //So to get the hash value we use the digest function which is offered by the Hash class.
  // This function takes a string as an input which defines the type of the returning value for example hex or base64.
  //If you leave this field you will get Buffer as a result.
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('UserMiniYelp', userSchema);

module.exports = User;
