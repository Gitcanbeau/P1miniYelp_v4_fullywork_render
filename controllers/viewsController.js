const Restaurant = require('../models/restaurantModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
// const restaurantController = require('../controllers/restaurantController');
// const APIFeatures = require('./../utils/apiFeatures');

// this project is the server-side rendered website

// So, remember how in client-side rendering,
// the actual building of the website happens on the client side.
// we need a data source which is usually an API that sends data to the client as requested.

// server-side rendering builds the website on the server.
// And the main aspect of server-side rendering is building the actual HTML,
// basically because that's where all our data will be stored.
// we use templates,which have placeholders where we will then inject our data as necessary.
// So, whenever there is a request, let's say for the homepage, we then get the necessary data from the database, inject it into a template which will then output HTML,
// and finally send that HTML, along with CSS and JavaScript and image files, back to the client.

//the data shown on website is the underlying data from which this website here is dynamically generated
//the url shown on the website is exactly the same backend API

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking')
    res.locals.alert =
      'Your booking is successful! A confirmation letter is sent to your email.';
  next();
};

exports.getAllRestaurants = catchAsync(async (req, res, next) => {
  const restaurants = await Restaurant.find();
  res.status(200).render('overview', {
    title: 'All Restaurants',
    restaurants
  });
});

exports.getRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({
    slug: req.params.slug
  }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });

  if (!restaurant) {
    return next(new AppError('There is no restaurant with that name.', 404));
  }

  res.status(200).render('restaurant', {
    title: `${restaurant.name} Restaurant`,
    restaurant
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account'
  });
};

exports.getSignupForm = (req, res) => {
  res.status(200).render('signup', {
    title: 'Become a new user'
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  });
};

exports.getChineseFood = catchAsync(async (req, res, next) => {
  const chineseRestaurants = await Restaurant.find({
    tag: 'Chinese food'
  });
  res.status(200).render('overview', {
    title: 'Chinese Food',
    restaurants: chineseRestaurants
  });
});

exports.getVegan = catchAsync(async (req, res, next) => {
  const veganRestaurants = await Restaurant.find({
    tag: 'Vegan'
  });
  res.status(200).render('overview', {
    title: 'Vegan',
    restaurants: veganRestaurants
  });
});

exports.getBrunch = catchAsync(async (req, res, next) => {
  const brunchRestaurants = await Restaurant.find({
    tag: 'Brunch'
  });
  res.status(200).render('overview', {
    title: 'Brunch',
    restaurants: brunchRestaurants
  });
});

exports.getTop5Cheap = catchAsync(async (req, res, next) => {
  const top5CheapRestaurants = await Restaurant.aggregate([
    {
      $sort: { price: 1 }
      //1-increasing order
      //-1-decreasing order
    },
    {
      $limit: 5
    }
  ]);
  res.status(200).render('overview', {
    title: 'Top 5 cheap',
    restaurants: top5CheapRestaurants
  });
});

exports.getRecommendation = catchAsync(async (req, res, next) => {
  const recommendation = await Restaurant.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.8 } }
      //match stage allows to select or filter some properties
    },
    {
      $sort: { avgRating: 1 }
      //1-increasing order
      //-1-decreasing order
    }
  ]);

  res.status(200).render('overview', {
    title: 'Brunch',
    restaurants: recommendation
  });
});
exports.getMyBookedRestaurants = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });
  const restaurantIDs = bookings.map(el => el.restaurant);
  const restaurants = await Restaurant.find({ _id: { $in: restaurantIDs } });

  res.status(200).render('overview', {
    title: 'My Booked Restaurants',
    restaurants
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser
  });
});
