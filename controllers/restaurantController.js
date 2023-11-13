const multer = require('multer');
//Multer is a node. js middleware for handling multipart/form-data, which is primarily used for uploading files.
//NOTE: Multer will not process any form which is not multipart ( multipart/form-data )
const sharp = require('sharp');
//sharp compresses images faster than most other Node. js modules, like ImageMagick, Jimp, and produces high-quality results.
//sharp converts large common image formats to smaller, web-friendly images.
//sharp can read JPEG, PNG, WebP, AVIF, TIFF, GIF, and SVG image formats.
const Restaurant = require('../models/restaurantModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadRestaurantImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeRestaurantImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  req.body.imageCover = `restaurant-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/restaurants/${req.body.imageCover}`);

  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `restaurant-${req.params.id}-${Date.now()}-${i +
        1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/restaurants/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

// const aliasTopRestaurant1 = async (req, res) => {
//   try {
//     //console.log(req.query);
//     //method1: directly call the find method provided by mongoose
//     const findTopRestaurants1 = await Restaurant.find({
//       tag: 'Korean food',
//       ratingsAverage: 5
//     });
//     //method2:using query method to find
//     const findTopRestaurants2 = await Restaurant.find()
//       .where('tag')
//       .equals('Korean food')
//       .where('ratingsAverage')
//       .equals(5);

//     res.status(200).json({
//       status: 'success',
//       results: findTopRestaurants1.length,
//       data: {
//         findTopRestaurants1
//         //findTopRestaurants2
//       }
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'fail',
//       message: err
//     });
//   }
// };

//localhost:3000/api/v1/restaurants?sort=-ratingsAverage,price&limit=5&fields=name,price,ratingsAverage,summary,tag
exports.aliasTopRestaurants = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,tag';
  next();
};

exports.getAllRestaurants = factory.getAll(Restaurant);
exports.getRestaurant = factory.getOne(Restaurant, { path: 'reviews' });
exports.createRestaurant = factory.createOne(Restaurant);
exports.updateRestaurant = factory.updateOne(Restaurant);
exports.deleteRestaurant = factory.deleteOne(Restaurant);

//Aggregation is a way of processing a large number of documents in a collection by means of passing them through different stages.
//The stages make up what is known as a pipeline.
//The stages in a pipeline can filter, sort, group, reshape and modify documents that pass through the pipeline.
//The aggregation pipeline is a bit like a regular query
exports.getRecommendation = catchAsync(async (req, res, next) => {
  const stats = await Restaurant.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
      //match stage allows to select or filter some properties
    },
    {
      $group: {
        _id: { $toUpper: '$tag' }, //group items based on their tag
        numRestaurants: { $sum: 1 }, //sum each one as 1 doc
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' }
        //The $group stage separates documents into groups according to a "group key".
        //The output is one document for each unique group key.
      }
    },
    {
      $sort: { avgRating: 1 }
      //1-increasing order
      //-1-decreasing order
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getStatics = catchAsync(async (req, res, next) => {
  const stats = await Restaurant.aggregate([
    {
      $group: {
        _id: { $toUpper: '$popularity' }, //group items based on popularity
        numRestaurants: { $sum: 1 }, //sum each one as 1 doc
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    },
    {
      $match: { _id: { $ne: 'RISING STAR' } } //note that here should be all capital
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getRestaurantsWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat, lng',
        400
      )
    );
  }

  const restaurants = await Restaurant.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: restaurants.length,
    data: {
      data: restaurants
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Restaurant.aggregate([
    {
      $unwind: '$startDates'
      //unwind can deconstruct an array field from the info documents
      //and then output one document for each element of the array.
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' }, //group items based on months
        numRestaurantStarts: { $sum: 1 },
        restaurants: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
      //add additional fields underneath each group, adding the id of each month
    },
    {
      $project: { _id: 0 }
      //project can give each of the field names 0 or 1.
      //0-the ID no longer shows up.
      //1-it would actually show up.
    },
    {
      $sort: { numRestaurantStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});
