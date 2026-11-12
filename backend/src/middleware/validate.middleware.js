import { ApiError } from "../utils/ApiError.js";

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body ?? {},
      params: req.params ?? {},
      query: req.query ?? {},
    });

    if (!result.success) {
      return next(
        new ApiError(
          400,
          "Request validation failed",
          result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        )
      );
    }

    req.validated = result.data;
    return next();
  };
}