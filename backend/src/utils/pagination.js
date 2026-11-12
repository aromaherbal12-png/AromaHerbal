/**
 * Pagination utility to standardize paginated responses across the API
 * 
 * @param {Object} query - Request query object (from req.query)
 * @param {number} defaultLimit - Default items per page
 * @returns {Object} Pagination parameters
 */
export function getPaginationParams(query, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit) || defaultLimit)); // Max 100 items per page
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Create paginated response object
 * 
 * @param {Array} data - Array of items for current page
 * @param {number} totalCount - Total number of items in database
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated response object
 */
export function createPaginatedResponse(data, totalCount, page, limit) {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
    },
  };
}

/**
 * Execute paginated MongoDB query
 * 
 * @param {Model} model - Mongoose model
 * @param {Object} filter - MongoDB filter object
 * @param {Object} options - Query options (sort, populate, select)
 * @param {Object} paginationParams - Pagination parameters from getPaginationParams
 * @returns {Promise<Object>} Paginated result
 */
export async function executePaginatedQuery(model, filter = {}, options = {}, paginationParams) {
  const { page, limit, skip } = paginationParams;
  const { sort = { createdAt: -1 }, populate = null, select = null } = options;

  // Execute count and find queries in parallel
  const [totalCount, data] = await Promise.all([
    model.countDocuments(filter),
    model
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(select)
      .populate(populate)
      .lean(),
  ]);

  return createPaginatedResponse(data, totalCount, page, limit);
}
