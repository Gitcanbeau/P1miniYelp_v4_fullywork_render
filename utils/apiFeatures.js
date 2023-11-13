class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    //query is the mongoose query
    //queryString is from the route
    //this.query is actually req.query, because you construct a new instance, we can use this keyword
  }

  filter() {
    //1)Filtering
    const queryObj = { ...this.queryString };
    //1. the = operator just copy the reference, that means, if you delete sth in queryObj then it will also get deleted in req.query
    //2. using the ES6 feature of spread operator is one way to make hard copy, then we can created a brand new object
    //... is spread operator allows deconstrution of req.query
    //which can take all the fields out of the object and save all the key-values
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    //about the reason why we want to exlude these fields
    //when you try to find restaurants by saying tag is Korean food, ratingsAverage is 5, page is 2
    //but it could show nothing because the desired items could be only a few and cannot fill page 2
    //in order to prevent this happen, we should only keep useful fields to filter query, and exclude some fields like page, sort, limit, fields
    excludedFields.forEach(el => delete queryObj[el]);
    //queryObj looks like following:
    //{tag:'Korean food', ratingsAverage:5, price:{gte:'20'}, page:2}
    //delete queryObj[page]
    //eventually the queryObj looks like follwing:
    //{tag:'Korean food', ratingsAverage:5, price:{gte:'20'}}

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    //`const` is a signal that the identifier won't be reassigned.
    //`let` is a signal that the variable may be reassigned.
    //because we need to edit the queryStr by adding the $ sign, and reassign back to queryStr, we need to use let here to allow the changes on queryStr
    //besides this reason, we need to chain more filtering after current query, that means we also need to change this queryStr in future
    //therefore using let is much ideal than using const
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    //regular experssion
    // \b means match exact word among (gte|gt|lte|lt)
    // /g allows to remove all the words; it will only remove the first match without /g
    //the queryObj looks like follwing:
    //{tag:'Korean food', ratingsAverage:5, price:{gte:'20'}}
    //BUT the mongoose queryObj looks like:
    //{tag:'Korean food', ratingsAverage:5, price:{$gte:5}}
    //in order to pass mongoose queryObj to Restautrant.find method, we need to adding $ to queryStr

    this.query = this.query.find(JSON.parse(queryStr));
    //remember that Restaurant.find returns a query
    //this.query.find <=> Restaurant.find

    return this;
    //return this object and then we can chain other features afterwards
    //review the reason why we use let keyword rather than const keyword to declared queryStr
  }

  sort() {
    //localhost:3000/api/v1/restaurants?tag=Korean food&sort=-price,ratingsAverage
    //the second sort can be added after a comma
    //{sort:'-price'} decreasing order
    //{sort:'price'} increasing order
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
      //in case there is no sort, we can provide a default sort
    }

    return this;
  }

  limitFields() {
    //localhost:3000/api/v1/restaurants?fields=name,price
    //the second field can be added after a comma
    //show info to user including name and price
    //localhost:3000/api/v1/restaurants?fields=-price,-opentime
    //show info to user exluding price and opentime
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
      //in case there is no selectedField, we can provide a default selectedField
    }

    return this;
  }

  paginate() {
    //localhost:3000/api/v1/restaurants?limit=5&page=2
    //limit: how many items per page
    //page: which page do you want to see
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = APIFeatures;
