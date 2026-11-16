import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    // 'citizen' reports issues, 'officer' resolves assigned ones, 'admin' sees everything
    role: { type: String, enum: ['citizen', 'officer', 'admin'], default: 'citizen' },

    // Gamification (Phase 5) — modeled now so we don't have to migrate data later
    points: { type: Number, default: 0 },
    badges: [{ type: String }],

    // Anti-bot & Account Verification (OTP / Email)
    isVerified: { type: Boolean, default: false },
    verificationOtp: { type: String },
    otpExpiresAt: { type: Date },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

// NOTE: we never store the plain password, only passwordHash (bcrypt).
// Hashing happens in the route handler, not here, so it's obvious where it happens.

export const User = mongoose.model('User', userSchema);