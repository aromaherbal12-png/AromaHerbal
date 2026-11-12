import { USER_ROLES } from "../modules/users/models/User.js";
import { ApiError } from "../utils/ApiError.js";

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication is required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, "You do not have permission to perform this action")
      );
    }

    next();
  };
}

export const administratorOnly = allowRoles(USER_ROLES.ADMINISTRATOR);