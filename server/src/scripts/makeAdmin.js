// Run with: node src/scripts/makeAdmin.js someone@example.com
// Since /api/auth/register deliberately refuses to create admin accounts
// (never trust the client to self-assign a privileged role), the only way to
// get an admin account is to register normally as a citizen, then run this
// script to promote that account directly in the database.

import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

const email = process.argv[2];

if (!email) {
  console.error('Usage: node src/scripts/makeAdmin.js someone@example.com');
  process.exit(1);
}

await connectDB();

const user = await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { role: 'admin' },
  { new: true }
);

if (!user) {
  console.error(`No user found with email ${email}. Register that account first.`);
} else {
  console.log(`${user.email} is now an admin.`);
}

await mongoose.disconnect();