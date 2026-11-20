import mongoose from "mongoose";

const receiverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    gstNo: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

receiverSchema.index({ name: 1 });
receiverSchema.index({ createdAt: -1 });

const Receiver = mongoose.model("Receiver", receiverSchema);

export default Receiver;
