import { getCurrentUser, listUsers, updateUserRole, updateUserStatus } from "./users.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export async function getMe(req, res, next) {
  try {
    const user = await getCurrentUser(req.user._id);
    res.status(200).json(new ApiResponse(200, "Profile retrieved successfully", user));
  } catch (error) { next(error); }
}

export async function getUsers(req, res, next) {
  try {
    const users = await listUsers();
    res.status(200).json(new ApiResponse(200, "Users retrieved successfully", users));
  } catch (error) { next(error); }
}

export async function changeRole(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { role } = req.validated.body;
    const user = await updateUserRole(id, role, req.user._id);
    res.status(200).json(new ApiResponse(200, "User role updated successfully", user));
  } catch (error) { next(error); }
}

export async function changeStatus(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { isActive } = req.validated.body;
    const user = await updateUserStatus(id, isActive, req.user._id);
    res.status(200).json(new ApiResponse(200, "User status updated successfully", user));
  } catch (error) { next(error); }
}
