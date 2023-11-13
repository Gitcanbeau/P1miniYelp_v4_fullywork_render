const express = require('express');
const restaurantController = require('../controllers/restaurantController');
// const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// we implemented a simple nested post route, so this means that the review route is kind of within the restaurant route.
// And again, because reviews belong to restaurants in a sense.
// But a bit messy and a bit confusing.
// below is not good
// router
//   .route(':/restaurantID/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );

//And so let's now fix this confused nested routes using an advanced express feature called mergeParams.
//login and get token
//Headers tab, put Authorization as key, and Bearer + token as value
//localhost:3000/api/v1/restaurants/5c88fa8cf4afda39709c2951/reviews
//get
//this is how express merged params to help build nested routes
//if you see a url like below, direct to reviewRouter
router.use('/:restaurantId/reviews', reviewRouter);
//because the reviewRouter should also have the access to the :restaurantId, we need to declare in reviewRouter by providing const router = express.Router({ mergeParams: true });

router
  .route('/top-5-cheap')
  .get(
    restaurantController.aliasTopRestaurants,
    restaurantController.getAllRestaurants
  );

router.route('/recommendation').get(restaurantController.getRecommendation);
router.route('/statics').get(restaurantController.getStatics);
router.route('/monthly-plan').get(restaurantController.getMonthlyPlan);

router
  .route('/restaurants-within/:distance/center/:latlng/unit/:unit')
  .get(restaurantController.getRestaurantsWithin);

router
  .route('/')
  .get(restaurantController.getAllRestaurants)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'leader'),
    restaurantController.createRestaurant
  );

router
  .route('/:id')
  .get(restaurantController.getRestaurant)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'leader'),
    restaurantController.uploadRestaurantImages,
    restaurantController.resizeRestaurantImages,
    restaurantController.updateRestaurant
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'leader'),
    restaurantController.deleteRestaurant
  );

module.exports = router;
