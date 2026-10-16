import mongoose from "mongoose";
import dns from "dns";

// Ensure reliable DNS resolution for MongoDB Atlas SRV records on Windows/local networks
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore if running in a restricted sandbox
}

export async function connectDB(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/synapse";

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
    return null;
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("[MongoDB] Connection closed through app termination");
  process.exit(0);
});
