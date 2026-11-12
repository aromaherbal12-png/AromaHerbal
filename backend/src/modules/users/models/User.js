import mongoose from "mongoose";

export const USER_ROLES = Object.freeze({
  ADMINISTRATOR:      "Administrator",
  MANAGER:            "Manager",
  PRODUCTION_INCHARGE:"Production-Incharge",
  STORE_INCHARGE:     "Store-Incharge",
  QUALITY_INCHARGE:   "Quality-Incharge",
});

export const USER_ROLE_VALUES = Object.freeze(Object.values(USER_ROLES));

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLE_VALUES,
      required: true,
      default: USER_ROLES.MANAGER,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

export default User;
