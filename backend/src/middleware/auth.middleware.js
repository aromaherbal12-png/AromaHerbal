import jwt from "jsonwebtoken";
import User from "../modules/users/models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export async function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication token is required");
    }

    if (!env.jwtSecret) {
      throw new ApiError(500, "JWT configuration is missing");
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      throw new ApiError(401, "Authentication token is required");
    }

    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: "aroma-workflow",
      audience: "aroma-workflow-client",
    });

    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string"
    ) {
      throw new ApiError(401, "Invalid authentication token");
    }

    const user = await User.findById(payload.sub).select("-passwordHash");

    if (!user || !user.isActive) {
      throw new ApiError(401, "User account is unavailable");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(new ApiError(401, "Invalid or expired token"));
    }

    next(error);
  }
}