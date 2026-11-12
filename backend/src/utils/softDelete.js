/**
 * Soft delete utility functions
 * Use these instead of Model.deleteOne() or Model.deleteMany()
 */

/**
 * Soft delete a single document
 * 
 * @param {Model} model - Mongoose model
 * @param {string} id - Document ID
 * @param {string} userId - User performing the delete
 * @returns {Promise<Object>} Updated document
 */
export async function softDeleteOne(model, id, userId) {
  const result = await model.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    },
    { new: true }
  );

  return result;
}

/**
 * Soft delete multiple documents
 * 
 * @param {Model} model - Mongoose model
 * @param {Object} filter - MongoDB filter
 * @param {string} userId - User performing the delete
 * @returns {Promise<Object>} Update result
 */
export async function softDeleteMany(model, filter, userId) {
  const result = await model.updateMany(filter, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: userId,
  });

  return result;
}

/**
 * Restore a soft-deleted document
 * 
 * @param {Model} model - Mongoose model
 * @param {string} id - Document ID
 * @returns {Promise<Object>} Restored document
 */
export async function restoreDeleted(model, id) {
  const result = await model.findByIdAndUpdate(
    id,
    {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    },
    { new: true }
  );

  return result;
}

/**
 * Add soft delete filter to query
 * Use this to exclude deleted documents from queries
 * 
 * @param {Object} filter - Existing MongoDB filter
 * @param {boolean} includeDeleted - Whether to include deleted documents
 * @returns {Object} Filter with soft delete condition
 */
export function addSoftDeleteFilter(filter = {}, includeDeleted = false) {
  if (!includeDeleted) {
    return {
      ...filter,
      isDeleted: { $ne: true },
    };
  }
  return filter;
}
