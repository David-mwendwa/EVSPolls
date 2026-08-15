import { NotFoundError } from '../errors/customErrors.js';

/**
 * Utility class that wraps a Mongoose query and incrementally applies
 * common API features based on the incoming Express query string.
 *
 * Typical usage (in getMany):
 *   const features = new APIFeatures(Model.find(filter), req.query)
 *     .search()
 *     .filter()
 *     .sort()
 *     .limitFields()
 *     .paginate(pageSize);
 *
 * The final query is available on `features.query` and can be awaited.
 */
class APIFeatures {
  /**
   * @param {import('mongoose').Query} query   Base Mongoose query, e.g. Model.find(filter)
   * @param {Object} queryStr                  Raw Express query string (req.query)
   */
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  /**
   * Apply a simple text search on the `name` field using either
   * `?keyword=` or `?search=` from the query string.
   *
   * Example: /users?search=john → { name: /john/i }
   *
   * @returns {APIFeatures} this (for chaining)
   */
  search() {
    let search = this.queryStr.keyword || this.queryStr.search;
    const keyword = search ? { name: { $regex: search, $options: 'i' } } : {};
    this.query = this.query.find({ ...keyword });
    return this;
  }

  /**
   * Apply field-based filtering using the remaining query-string keys
   * after removing reserved params (keyword, page, sort, limit, fields).
   *
   * Supports basic comparison operators via the `gte|gt|lte|lt` syntax,
   * e.g. ?createdAt[gte]=2024-01-01.
   *
   * @returns {APIFeatures} this (for chaining)
   */
  filter() {
    const queryCopy = { ...this.queryStr };
    const excludedFields = ['keyword', 'page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryCopy[el]);
    let queryStr = JSON.stringify(queryCopy);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  /**
   * Apply sorting based on a comma-separated list of fields in
   * `?sort=`. Defaults to `-createdAt` if no sort is provided.
   *
   * Example: ?sort=createdAt,-name → `.sort('createdAt -name')`
   *
   * @returns {APIFeatures} this (for chaining)
   */
  sort() {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  /**
   * Limit which fields are returned using `?fields=`. If no explicit
   * projection is provided, `__v` is excluded by default.
   *
   * Example: ?fields=name,email → `.select('name email')`
   *
   * @returns {APIFeatures} this (for chaining)
   */
  limitFields() {
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  /**
   * Apply server-side pagination based on `?page` and `?limit`.
   * Falls back to `pageSize` (or 100) if `limit` is not provided.
   *
   * Example: ?page=2&limit=10 → skip 10, limit 10.
   *
   * @param {number} pageSize Default page size to use if `limit` is absent.
   * @returns {APIFeatures} this (for chaining)
   */
  paginate(pageSize) {
    const currentPage = parseInt(this.queryStr.page) || 1;
    const limit = parseInt(this.queryStr.limit) || pageSize || 100; // results per page
    const skip = (currentPage - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

/**
 * Generic create handler.
 *
 * @template T
 * @param {import('mongoose').Model<T>} Model Mongoose model to create with.
 * @returns {import('express').RequestHandler} Express handler that creates
 *          a document from `req.body` and responds with `{ success, data }`.
 */
const createOne = (Model) => async (req, res, next) => {
  const doc = await Model.create(req.body);
  res.status(200).json({ success: true, data: doc });
};

/**
 * Generic "get one" handler.
 *
 * Looks up a single document by ID (from `req.params.id` or `req.query.id`).
 * Optionally applies Mongoose `populate` options before executing.
 * Throws a NotFoundError if no document is found.
 *
 * @template T
 * @param {import('mongoose').Model<T>} Model Mongoose model to query.
 * @param {import('mongoose').PopulateOptions|import('mongoose').PopulateOptions[]} [populateOptions]
 *        Optional populate configuration.
 * @returns {import('express').RequestHandler} Express handler.
 */
const getOne = (Model, populateOptions) => async (req, res, next) => {
  const documentId = req.params.id || req.query.id;
  let query = Model.findById(documentId);
  if (populateOptions) {
    query = query.populate(populateOptions);
  }
  const doc = await query;
  if (!doc)
    throw new NotFoundError(`No document found with that ID: ${documentId}`);
  res.status(200).json({ success: true, data: doc });
};

/**
 * Generic "get many" handler with search, filter, sort, field limiting
 * and pagination.
 *
 * - Supports nested routes by building a base `filter` from `req.params`.
 * - Uses APIFeatures to apply search/filter/sort/fields/pagination.
 * - For the User model, admins and sysadmins can bypass the automatic
 *   `active !== false` filter so they can see all accounts.
 * - Responds with `{ success, data, meta: { pagination } }` where
 *   `pagination.total` is the count of documents matching the same filters.
 *
 * @template T
 * @param {import('mongoose').Model<T>} Model Mongoose model to query.
 * @returns {import('express').RequestHandler} Express handler.
 */
const getMany = (Model) => async (req, res, next) => {
  let filter = {};
  const isNestedRoute = !!Object.keys(req.params).length;
  if (isNestedRoute === true) {
    for (const key in req.params) {
      filter[[key]] = req.params[key];
    }
  }

  let pageSize = 10;

  let baseQuery = Model.find(filter);
  if (Model.modelName === 'User') {
    const role = req.user?.role;
    if (role === 'admin' || role === 'sysadmin') {
      baseQuery = baseQuery.setOptions({ bypassActiveFilter: true });
    }
  }

  const features = new APIFeatures(baseQuery, req.query)
    .search()
    .filter()
    .sort()
    .limitFields()
    .paginate(pageSize);

  // Count against the same conditions the query was built from, so `total`
  // describes the filtered result set rather than the whole collection.
  const countFilter = features.query.getFilter();
  const [doc, total] = await Promise.all([
    features.query,
    Model.countDocuments(countFilter),
  ]);

  res.status(200).json({
    success: true,
    data: doc,
    meta: {
      pagination: {
        page: Number(req.query.page) || 1,
        pageSize: Number(req.query.limit) || pageSize || 100,
        pageCount: doc.length,
        total,
      },
    },
  });
};

/**
 * Generic "update one" handler.
 *
 * Finds a document by ID (from `req.params.id` or `req.query.id`) and
 * applies `req.body` as an update. If no document is found, a NotFoundError
 * is thrown. Responds with the updated document.
 *
 * Note: this uses `findByIdAndUpdate`, so Mongoose middleware that only
 * runs on `.save()` will not be triggered.
 *
 * @template T
 * @param {import('mongoose').Model<T>} Model Mongoose model to update.
 * @returns {import('express').RequestHandler} Express handler.
 */
const updateOne = (Model) => async (req, res, next) => {
  const documentId = req.params.id || req.query.id;
  const doc = await Model.findByIdAndUpdate(documentId, req.body, {
    new: true,
    runValidators: true,
  });
  if (!doc)
    throw new NotFoundError(`No document found with that ID: ${documentId}`);
  res.status(201).json({ success: true, data: doc });
};

/**
 * Generic "delete one" handler.
 *
 * Deletes a document by ID (from `req.params.id` or `req.query.id`). If the
 * document does not exist, a NotFoundError is thrown. On success, responds
 * with a simple confirmation payload.
 *
 * @template T
 * @param {import('mongoose').Model<T>} Model Mongoose model to delete from.
 * @returns {import('express').RequestHandler} Express handler.
 */
const deleteOne = (Model) => async (req, res, next) => {
  const documentId = req.params.id || req.query.id;
  const doc = await Model.findByIdAndDelete(documentId);
  if (!doc)
    throw new NotFoundError(`No document found with that ID: ${documentId}`);

  res.status(200).json({
    success: true,
    message: 'Resource deleted successfully',
    data: null,
  });
};

export { APIFeatures, getMany, getOne, createOne, updateOne, deleteOne };
