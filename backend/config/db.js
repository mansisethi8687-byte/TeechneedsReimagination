const mongoose = require("mongoose");

const connectDB = async (uri = process.env.MONGO_URI) => {
    try {
        await mongoose.connect(uri);
        console.log("MongoDB Connected...");
    } catch (error) {
        console.error("Connection error:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
