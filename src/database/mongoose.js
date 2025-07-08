import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const connectDB = async () => {
    try {
      await mongoose.connect(process.env.DATABASE_URL, {

      });
      console.log('MongoDB connected');
    } catch (error) {
      console.error('Database connection error:', error.message);
    }
  };
  export default connectDB;