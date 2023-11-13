const express = require('express');
// const restaurantController = require('../controllers/restaurantController');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(viewsController.alerts);

router.get('/', authController.isLoggedIn, viewsController.getAllRestaurants);

router.get(
  '/restaurant/:slug',
  authController.isLoggedIn,
  viewsController.getRestaurant
);
router.get('/signup', authController.isLoggedIn, viewsController.getSignupForm); //?
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/me', authController.protect, viewsController.getAccount);

router.get(
  '/get-chinese-food',
  authController.isLoggedIn,
  viewsController.getChineseFood
);
router.get('/get-vegan', authController.isLoggedIn, viewsController.getVegan);
router.get('/get-brunch', authController.isLoggedIn, viewsController.getBrunch);
router.get(
  '/get-top-5-cheap',
  authController.isLoggedIn,
  viewsController.getTop5Cheap
);
router.get(
  '/get-recommendation',
  authController.isLoggedIn,
  viewsController.getRecommendation
);

router.get(
  '/my-booked-restaurants',
  authController.protect,
  viewsController.getMyBookedRestaurants
);

router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

module.exports = router;
