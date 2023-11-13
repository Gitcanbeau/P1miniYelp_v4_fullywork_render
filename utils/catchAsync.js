module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
    //fn(req,res,next).catch(err => next(err));
    //the simplified format would be the upper one.
  };
};

//the goal of this function is to simply catch our asynchronous errors.
// And remember, the function below is the fn that we're gonna pass in

// const createRestaurant = fn(async (req, res, next) => {
//   try {
//     const newRestaurant = await Restaurant.create(req.body);
//     res.status(201).json({
//       status: 'success',
//       data: {
//         restaurant: newRestaurant
//       }
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err
//     });
//   }
// });

// when we call catchAsync, function fn is passed into catchAsync
// and this fn function should receive request, response, and next.
// we need the next function to pass the error into it, so that that error can then be handled in the global error handling middleware.
//
// fn is an asynchronous function, and will return promises
// And when there is an error inside of an async function, that basically means that the promise gets rejected.
// So we catch that error here in the catchAsync, instead of catching it in the previous try catch block.
// So catch, and error, and then next, and pass the error.

// eventually, in the fn itself, we can focus on the try block and dont need to worry about the catch block
