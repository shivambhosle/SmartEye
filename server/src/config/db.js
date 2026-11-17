import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
  }

  // Mongoose 8 no longer needs useNewUrlParser/useUnifiedTopology — those were
  // removed as defaults years ago. Passing them just produces silent no-ops
  // in old tutorials; leaving them out is correct here.
  await mongoose.connect(uri);
  console.log('[db] connected to MongoDB');

  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message);
  });
}