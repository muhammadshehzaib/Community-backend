const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const connectionString = process.env.mongoDbConnection;
    if (!connectionString) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;