const mongoose = require('mongoose');
const slugify = require('slugify');
//The slugify filter returns a text into one long word containing nothing but
//lower case ASCII characters and hyphens (-).

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A restaurant must have a name'],
      unique: true,
      trim: true,
      maxlength: [
        40,
        'A restaurant name must have less or equal then 40 characters'
      ],
      minlength: [
        4,
        'A restaurant name must have more or equal then 4 characters'
      ]
      // validate: [validator.isAlpha, 'A restaurant name must only contain characters']
    },
    slug: String,
    opentime: {
      type: Number, //should be updated to Date. will update it later
      required: [true, 'A restaurant must have a opentime'],
      maxhour: [24, 'An opentime must be smaller than 24'],
      minhour: [0, 'An opentime must be larger than 0']
    },
    endtime: {
      type: Number,
      required: [true, 'A restaurant must have a endtime'],
      maxhour: [24, 'An endtime must be smaller than 24'],
      minhour: [0, 'An endtime must be larger than 0']
    },
    averageEatingTime: {
      type: Number,
      required: [true, 'A restaurant must have a averageEatingTime']
    },
    price: {
      type: Number,
      required: [true, 'A restaurant must have a price']
    },
    priceAfterDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price'
      }
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A restaurant must have a group size']
    },
    popularity: {
      type: String,
      //required: [true, 'A restaurant must have a popularity'],
      enum: {
        values: [
          'rising star',
          'high customer retention rate',
          'top 10 popular'
        ],
        message:
          'Popularity is either: rising star, high customer retention rate, top 10 popular'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // 4.666666, 46.6666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A restaurant must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String
      // required: [true, 'A restaurant must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
      //select property determines whether this property can be shown to user
      // eslint-disable-next-line prettier/prettier
      //see the limitField part 
    },
    startDates: [Date],
    favouriteRestaurant: {
      type: Boolean,
      default: false
    },
    tag: {
      type: String,
      required: [true, 'A restaurant must have a tag'],
      enum: {
        values: [
          'Chinese food',
          'Korean food',
          'Japanese food',
          'Thai food',
          'Vietnamese food',
          'American food',
          'Mexican food',
          'Italian food',
          'Brunch',
          'Barbeque',
          'Beer bar',
          'Coffee and tea',
          'Salad',
          'Vegan'
        ],
        message: 'Tag should be selected from the tag pool'
      }
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'UserMiniYelp'
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
//Virtuals are document properties that you can get and set but that do not want to save them to MongoDB.
//If you want the virtual field to be displayed on client side,
//then set {virtuals: true} for toObject and toJSON in schema options

//virtual properties make a lot of sense for fields that can be derived from one another.
//For example a conversion from miles to kilometers, it doesn't make sense to store these two fields
//in a database if we can easily convert

// sort the doc in the mongoDB Compass with price increasing, ratingsAverage decreasing
// this can enhance the read performance for developers
// So basically we need to carefully study the access patterns of our application in order to figure out which fields are queried the most and then set the indexes for these fields.
// For example, I'm not setting an index here on the group size because I don't really believe that many people will query for that parameter, and so I don't need to create an index there.
// Because we really do not want to overdo it with indexes, we don't want to blindly set indexes on all the fields and then hope for the best basically.
// And the reason for that is that each index actually uses resources, and each index needs to be updated each time that the underlying collection is updated.
// So if you have a collection with a high write-read ratio, so a collection that is mostly written to, then it would make absolutely no sense to create an index on any field in this collection
// because the cost of always updating the index and keeping it in memory clearly outweighs the benefit
// So in summary, when deciding whether to index a certain field or not, we must kind of balance the frequency of queries using that exact field
// with the cost of maintaining this index, and also with the read-write pattern of the resource.
restaurantSchema.index({ price: 1, ratingsAverage: -1 });
restaurantSchema.index({ slug: 1 });
restaurantSchema.index({ startLocation: '2dsphere' });

//method1 to use virtual is provided as attributes in the schema
//method2 to use virtual property outside the schema
restaurantSchema.virtual('averageEatingTimeWeeks').get(function() {
  return this.averageEatingTime / 7;
});

// Virtual populate which connects two schemas by child reference
//the reviews wouldnt be saved to database but will show when you search the restaurants
restaurantSchema.virtual('reviews', {
  ref: 'ReviewMiniYelp',
  //ref should put the nick NAME of this schema in database
  foreignField: 'restaurant',
  localField: '_id'
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
restaurantSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  //a slug is basically just a string that we can put in the URL, usually based on some string like the name.
  next();
});

// QUERY MIDDLEWARE
// restaurantSchema.pre('find', function(next) {
//regular expression here, means pre every query starting with "find", findOne, findOneandUpdate,etc
restaurantSchema.pre(/^find/, function(next) {
  this.find({ favouriteRestaurant: { $eq: false } });
  this.start = Date.now();
  next();
});
//pre('find')which will make this query middleware and not document middleware.
//the big difference here is that the this keyword will now point at the current query and not at the current document,
//because we're not really processing any documents here.
//We're really gonna be processing a query.
//if we want to present favouriteRestaurant only, we should use the pre find query to find the items of which favouriteRestaurant is true
//that means we totally have 9 restaurants, 8 are false and 1 is true
//when we try to getAllRestaurants, it will only show 8 results of which favouriteRestaurant is false
//if you comment this pre find middleware, you will see all 9 restaurants

restaurantSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  next();
});

// restaurantSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// });

// restaurantSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { favouriteRestaurant: { $eq: true } } });
//   //use unshift to add an element at the beginning of an array
//   //use shift to add an element at the end of an array
//   console.log(this.pipeline);
//   //this refers to the aggregation object in this pre-hook
//   next();
// });

const Restaurant = mongoose.model('RestaurantMiniYelp', restaurantSchema);
//the model name is conventionally capitalized the first character, Restaurant instead of restaurant
//the mongoose model name is correlated with the collection name in the MongoDB Atlas,
//if you simply change the model name in the '', but didn't change the collection name,
//probably the webpage wouldnt be shown correctly because the data (i.e. img) is dynamically uploaded from the Atlas collection

module.exports = Restaurant;
