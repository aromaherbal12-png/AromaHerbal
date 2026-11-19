import bcrypt from "bcryptjs";
import User, { USER_ROLES } from "./models/User.js";
import { ApiError } from "../../utils/ApiError.js";

export async function getCurrentUser(userId) {
  const user = await User.findById(userId).select("-passwordHash");
  if (!user) throw new ApiError(404, "User not found");
  return user.toJSON();
}

export async function listUsers() {
  return await User.find()
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();
}

export async function updateUserRole(userId, role, actorId) {
  const target = await User.findById(userId).select("-passwordHash");
  if (!target) throw new ApiError(404, "User not found");
  if (
    target._id.toString() === actorId.toString() &&
    target.role === USER_ROLES.ADMINISTRATOR &&
    role !== USER_ROLES.ADMINISTRATOR
  ) {
    throw new ApiError(400, "You cannot remove your own Administrator role");
  }
  target.role = role;
  await target.save();
  return target.toJSON();
}

export async function updateUserStatus(userId, isActive, actorId) {
  const target = await User.findById(userId).select("-passwordHash");
  if (!target) throw new ApiError(404, "User not found");
  if (target._id.toString() === actorId.toString() && !isActive) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }
  if (target.role === USER_ROLES.ADMINISTRATOR && !isActive) {
    const activeAdmins = await User.countDocuments({ role: USER_ROLES.ADMINISTRATOR, isActive: true });
    if (activeAdmins <= 1) throw new ApiError(400, "The last active Administrator cannot be deactivated");
  }
  target.isActive = isActive;
  await target.save();
  return target.toJSON();
}

export async function updateUserPassword(userId, newPassword) {
  const target = await User.findById(userId);
  if (!target) throw new ApiError(404, "User not found");
  
  const passwordHash = await bcrypt.hash(newPassword, 12);
  target.passwordHash = passwordHash;
  await target.save();
  
  // Return without exposing the password hash
  return target.toJSON();
}
