const mongoose = require('mongoose');
const Restaurant = require('./restaurantModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review must have more than 10 characters!']
    },
    rating: {
      type: Number,
      required: [true, 'A rating must between 1.0 and 5.0!'],
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    restaurant: {
      type: mongoose.Schema.ObjectId,
      ref: 'RestaurantMiniYelp',
      required: [true, 'Review must belong to a restaurant.']
      //once you perform this parent referencing. you also need to provide child referencing in restaurant model
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'UserMiniYelp',
      required: [true, 'Review must belong to a user']
      ////once you perform this parent referencing. you also need to provide child referencing in user model
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.index({ restaurant: 1, user: 1 }, { unique: true });
//unique:true means one user can only provide one review for one restaurant
//you cannot repeat providing reviews on same restaurant, otherwise duplicateKey error will pop up

// reviewSchema.pre(/^find/, function(next) {
//   this.populate({
//     path: 'restaurant',
//     select: 'name'
//   }).populate({
//     path: 'user',
//     select: 'name photo'
//   });
//   next();
// });

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function(restaurantId) {
  const stats = await this.aggregate([
    {
      $match: { restaurant: restaurantId }
    },
    {
      $group: {
        _id: '$restaurant',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Restaurant.findByIdAndUpdate(restaurantId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Restaurant.findByIdAndUpdate(restaurantId, {
      ratingsQuantity: 0,
      ratingsAverage: 3.0
    });
  }
};

//this.constructor is very interesting,
//the obj in this file is this, it called the constructor to create a review Obj based on schema
//call the calcAverageRatings method provided in model schema
//wrong1: ReviewMiniYelp.calcAverageRatings would not work, because you declare ReviewMiniYelp underneath
//wrong2: move this post-save-hook underneath the declaration of ReviewMiniYelp, would not work neither
//wrong2: because if that's the case, the ReviewMiniYelp would not contain the post-save-hook middleware at all
reviewSchema.post('save', function() {
  this.constructor.calcAverageRatings(this.restaurant);
});

// below is update the rating when a review is updated or deleted.
// a review is updated or deleted using findByIdAndUpdate or also findByIdAndDelete, right?
// So for these, we actually do not have document middleware, but only query middleware.
// And so in the query, we actually don't have direct access to the document in order to update then
// Because, remember, we need access to the current review,
// we can extract the restaurant ID, and then calculate the statistics from there.

// remember that findByIdAndUpdate is only just a shorthand for findOneAndUpdate with the current ID
// So here, we actually need to use the findOneAndDelete and findOneAndUpdate middleware hooks
// pre-save is a middleware, we can pass the next keyword into the function
// remember that the goal is to get access to the current review document
// this keyword refers to the current query.
// So in order to get the current review document, we can use findOne() method to process this current query.
// await this query and then save it as r.
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  await this.r.constructor.calcAverageRatings(this.r.restaurant);
});

const Review = mongoose.model('ReviewMiniYelp', reviewSchema);

module.exports = Review;
