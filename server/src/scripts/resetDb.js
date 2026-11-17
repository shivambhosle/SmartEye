import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config(); // fallback to cwd .env
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Issue } from '../models/Issue.js';
import { Notification } from '../models/Notification.js';

async function reset() {
  await connectDB();

  console.log('Clearing database collections...');
  const usersDeleted = await User.deleteMany({});
  const issuesDeleted = await Issue.deleteMany({});
  const notifsDeleted = await Notification.deleteMany({});

  console.log(`- Deleted ${usersDeleted.deletedCount} users`);
  console.log(`- Deleted ${issuesDeleted.deletedCount} issues`);
  console.log(`- Deleted ${notifsDeleted.deletedCount} notifications`);

  // Create default Municipal Admin
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@1234';
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@smarteye.gov.in';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await User.create({
    name: 'Municipal Administrator',
    email: adminEmail.toLowerCase(),
    passwordHash,
    role: 'admin',
    isVerified: true,
  });

  console.log('\nDefault Admin Account Created:');
  console.log(`- Email:    ${admin.email}`);
  console.log(`- Password: ${adminPassword}`);
  console.log(`- Role:     ${admin.role}`);

  console.log('\nDatabase reset complete and ready for fresh registration & testing!\n');
  await mongoose.disconnect();
}

reset().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
