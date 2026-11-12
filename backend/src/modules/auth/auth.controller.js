import { loginUser, registerUser } from "./auth.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export async function login(req, res, next) {
  try {
    const { email, password } = req.validated.body;
    const result = await loginUser({ email, password });

    res.status(200).json(
      new ApiResponse(200, "Login successful", result)
    );
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.validated.body;
    const user = await registerUser({ name, email, password, role });

    res.status(201).json(
      new ApiResponse(201, "Account created successfully", user)
    );
  } catch (error) {
    next(error);
  }
}
