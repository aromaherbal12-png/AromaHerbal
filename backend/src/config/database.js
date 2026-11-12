import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    // Connection pool settings for better performance
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 2, // Minimum number of connections to maintain
    maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    // Compression
    compressors: ["zlib"], // Enable compression for data transfer
  });

  console.log("MongoDB connected successfully with connection pooling.");
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
}