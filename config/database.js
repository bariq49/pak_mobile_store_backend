const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Check if MONGO_URI is set
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI is not set in environment variables!");
      console.error("Please create a .env file with MONGO_URI");
      process.exit(1);
    }

    console.log("🔄 Connecting to MongoDB...");
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 10000, // 10 seconds connection timeout
    });
    
    console.log("✅ MongoDB Connected Successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}`);
  } catch (error) {
     
    // Provide helpful error messages
    if (error.message.includes("ETIMEOUT") || error.message.includes("queryTxt")) {
      console.error("\n💡 Possible Solutions:");
      console.error("1. Check your internet connection");
      console.error("2. If using MongoDB Atlas, ensure your cluster is not paused");
      console.error("3. Check if your IP is whitelisted in MongoDB Atlas");
      console.error("4. Verify your MONGO_URI in .env file is correct");
      console.error("5. Try using local MongoDB: mongodb://localhost:27017/pak-mobile-store");
    } else if (error.message.includes("authentication failed")) {
      console.error("\n💡 Authentication Error:");
      console.error("1. Check your MongoDB username and password in MONGO_URI");
      console.error("2. Verify your database user has proper permissions");
    } else if (error.message.includes("ENOTFOUND")) {
      console.error("\n💡 DNS Resolution Error:");
      console.error("1. Check if the MongoDB hostname is correct");
      console.error("2. Verify your network connection");
      console.error("3. If using MongoDB Atlas, check if cluster is active");
    }
    
    process.exit(1); // Stop the app if DB fails
  }
};

module.exports = connectDB;
