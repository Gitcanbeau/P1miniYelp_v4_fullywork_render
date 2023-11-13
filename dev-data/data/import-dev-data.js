const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
//Dotenv is a zero-dependency module that loads environment variables from a .env file into process.env .
const Restaurant = require('./../../models/restaurantModel');
const User = require('./../../models/userModel');
const Review = require('./../../models/reviewModel');
const Booking = require('./../../models/bookingModel');

dotenv.config({ path: './config.env' });

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

// READ JSON FILE

const restaurants = JSON.parse(
  fs.readFileSync(`${__dirname}/restaurants.json`, 'utf-8')
);
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);
const bookings = JSON.parse(
  fs.readFileSync(`${__dirname}/bookings.json`, 'utf-8')
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Restaurant.create(restaurants);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    await Booking.create(bookings);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await Restaurant.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    await Booking.deleteMany();
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

//console.log(processs.argv);
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

//terminal
//node dev-data/data/import-dev-data.js --import
//node dev-data/data/import-dev-data.js --delete
