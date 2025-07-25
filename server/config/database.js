import mongoose from 'mongoose';
import Grid from 'gridfs-stream';

let gfs;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    // Initialize GridFS
    gfs = Grid(conn.connection.db, mongoose.mongo);
    gfs.collection('uploads');
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return { connection: conn.connection, gfs };
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

export { connectDB, gfs };