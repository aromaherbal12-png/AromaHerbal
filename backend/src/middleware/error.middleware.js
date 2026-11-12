import mongoose from "mongoose";
import { env } from "../config/env.js";

export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";
  let details = err.details ?? null;

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Database validation failed";

    details = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid identifier or field value";
    details = null;
  } else if (err?.code === 11000) {
    statusCode = 409;
    message = "A record with this unique value already exists";
    details = null;
  }

  if (
    !Number.isInteger(statusCode) ||
    statusCode < 400 ||
    statusCode > 599
  ) {
    statusCode = 500;
  }

  if (statusCode >= 500) {
    console.error("Server error:", err);

    if (statusCode === 500) {
      message = "Internal server error";
      details = null;
    }
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(details !== null && { details }),
    ...(env.nodeEnv === "development" &&
      statusCode === 500 && {
        debugMessage: err.message,
      }),
  });
}