import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { USER_ROLES } from "../users/models/User.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

function createToken(user) {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new ApiError(
      500,
      "JWT_SECRET must be configured with at least 32 characters"
    );
  }

  return jwt.sign(
    { role: user.role },
    env.jwtSecret,
    {
      subject: user._id.toString(),
      expiresIn: env.jwtExpiresIn,
      issuer: "aroma-workflow",
      audience: "aroma-workflow-client",
    }
  );
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.passwordHash);

  if (!matches) {
    throw new ApiError(401, "Invalid email or password");
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    token: createToken(user),
    user: user.toJSON(),
  };
}

export async function registerUser({ name, email, password, role }) {
  if (role === USER_ROLES.ADMINISTRATOR) {
    throw new ApiError(
      403,
      "Administrator accounts must be created through the protected setup process"
    );
  }

  const existingUser = await User.exists({ email });

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
    });

    return user.toJSON();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, "An account with this email already exists");
    }

    throw error;
  }
}