const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');
// const catchAsync = require('./../utils/catchAsync');

exports.setRestaurantUserIds = (req, res, next) => {
  if (!req.body.restaurant) req.body.restaurant = req.params.restaurantId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

//localhost:3000/api/v1/reviews
//select Bearer Token under Authorization tab and select {{jwt}}
//get
exports.getAllReviews = factory.getAll(Review);
//localhost:3000/api/v1/reviews/5c8a34ed14eb5c17645c9108
//select Bearer Token under Authorization tab and select {{jwt}}
//get
exports.getReview = factory.getOne(Review);
//login and get the token
//under Header tab, provide Authorization as key, Bearer + token as value
//localhost:3000/api/v1/reviews
// {
//   "review":"this is updated review.",
//   "rating":2.0,
//   "restaurant":"5c88fa8cf4afda39709c2951",
//   "user":"6550dc16696567195704f0a5"
// }
//post
exports.createReview = factory.createOne(Review);
//localhost:3000/api/v1/reviews/5c8a34ed14eb5c17645c9108
//select Bearer Token under Authorization tab and select {{jwt}}
//patch
// {
//   "review":"this is updated review."
// }
exports.updateReview = factory.updateOne(Review);
//localhost:3000/api/v1/reviews/65513bc6446d8721ae2042b8
//select Bearer Token under Authorization tab and select {{jwt}}
//delete
exports.deleteReview = factory.deleteOne(Review);
