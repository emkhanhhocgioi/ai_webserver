const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

async function connectDB() {
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined');
    return;
  }else{
    console.log('MongoDB URI:', uri);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // QUAN TRỌNG
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    // ❌ KHÔNG process.exit
  }
}

// Events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// KHÔNG tự động kill app
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

connectDB();

module.exports = mongoose;
