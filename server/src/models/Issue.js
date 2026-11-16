import mongoose from 'mongoose';
import { CANONICAL_CATEGORIES, ALL_SUPPORTED_CATEGORIES } from '../config/departments.js';

// Canonical 8 SmartEye issue categories
const ISSUE_CATEGORIES = CANONICAL_CATEGORIES;

const issueSchema = new mongoose.Schema(
  {
    // --- What the citizen submitted ---
    photoUrl: { type: String, required: true },
    // Uses ALL_SUPPORTED_CATEGORIES so historical records with legacy categories can still be updated
    category: { type: String, enum: ALL_SUPPORTED_CATEGORIES, required: true },
    userNote: { type: String, default: '' }, // optional free-text from citizen
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
      ward: { type: String },
    },

    // Citizen-selected urgency — separate from the AI's own severity guess below
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },

    // How the image was taken: 'live' (device camera on-site) or 'gallery' (file upload)
    captureMode: { type: String, enum: ['live', 'gallery'], default: 'gallery' },

    // --- What the AI Vision Engine produced (Phase 2) ---
    // Optional: if the AI call fails (rate limit, bad image, etc.) we still want
    // the report to save successfully rather than blocking the citizen entirely.
    aiAnalysis: {
      category: { type: String, enum: ALL_SUPPORTED_CATEGORIES },
      description: { type: String },
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      confidence: { type: Number, min: 0, max: 1 },
      recommendedDepartment: { type: String },
      isAuthentic: { type: Boolean, default: true },
      authenticityNote: { type: String, default: '' },
      rawModelResponse: { type: String },
    },

    // --- Computed by our own logic (later phase), not the AI ---
    priorityScore: { type: Number, default: 0 },
    department: { type: String },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
    supportCount: { type: Number, default: 1 },
    upvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // --- Lifecycle ---
    // Matches the frontend's status vocabulary directly, so the dashboard and
    // the database never need a translation layer between them.
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved'],
      default: 'open',
    },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionPhotoUrl: { type: String },
    resolutionNote: { type: String, default: '' },
    resolvedAt: { type: Date, default: null }, // set when status flips to 'resolved' — powers resolution-time analytics
  },
  { timestamps: true }
);

issueSchema.index({ 'location.lat': 1, 'location.lng': 1 });
issueSchema.index({ status: 1, priorityScore: -1 });
issueSchema.index({ reportedBy: 1 });

export const Issue = mongoose.model('Issue', issueSchema);
export { ISSUE_CATEGORIES };