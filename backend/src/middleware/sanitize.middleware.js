import sanitizeHtml from "sanitize-html";

/**
 * Recursively sanitize all string values in an object
 * Removes HTML/script tags and dangerous characters
 */
function sanitizeValue(value) {
  if (typeof value === "string") {
    // Remove HTML tags and scripts
    return sanitizeHtml(value, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {},
      disallowedTagsMode: "discard",
    }).trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === "object") {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Middleware to sanitize request body, query, and params
 * Prevents XSS attacks by removing potentially dangerous content
 */
export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  // Query and params are usually already parsed and safe to modify
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }

  next();
}
