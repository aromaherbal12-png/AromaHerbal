import sanitizeHtml from "sanitize-html";

/**
 * Recursively sanitize all string values in an object
 * Removes HTML/script tags and dangerous characters
 */
function sanitizeValue(value) {
  if (typeof value === "string") {
    return sanitizeHtml(value, {
      allowedTags: [],
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
 * Middleware to sanitize request body only.
 * Prevents XSS attacks by stripping HTML from body fields.
 *
 * NOTE: req.query and req.params are read-only getters in Express 5
 * and cannot be reassigned. Those are handled at the Zod validation layer.
 */
export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
}
