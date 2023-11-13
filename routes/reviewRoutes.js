const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

//this is the finish step of how express merged params to help build nested routes
const router = express.Router({ mergeParams: true });
// recall that we have this router.use('/:restaurantId/reviews', reviewRouter); in the restaurantRoutes
//if you see a url like below, direct to reviewRouter
//because the reviewRouter should also have the access to the :restaurantId, we need to declare in reviewRouter by providing const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setRestaurantUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
