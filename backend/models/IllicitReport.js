'use strict';

const mongoose = require('mongoose');

// IllicitReport is always treated as confidential.
// Reporter identity is NEVER stored regardless of auth state.
const illicitReportSchema = new mongoose.Schema(
  {
    ref_number: {
      type:   String,
      unique: true,
      index:  true,
    },

    type: {
      type:     String,
      required: [true, 'Activity type is required'],
      enum: {
        values: [
          'Illicit Alcohol Brewing',
          'Drug Abuse',
          'Criminal Activity',
          'Gender-Based Violence',
          'Rape / Defilement',
          'Other',
        ],
        message: '{VALUE} is not a recognised illicit activity type',
      },
    },

    description: {
      type:      String,
      required:  [true, 'Description is required'],
      minlength: [15,  'Description must be at least 15 characters'],
      maxlength: [2000,'Description must not exceed 2000 characters'],
    },

    village: {
      type:     String,
      required: [true, 'Village is required'],
      index:    true,
    },
    location_detail: { type: String, default: null },

    // ── Evidence ──────────────────────────────────────────────────────────────
    evidence_urls: [{ type: String }],

    // ── Workflow ──────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['received','investigating','action_taken','closed'],
      default: 'received',
      index:   true,
    },

    // ── Admin only notes (never exposed to public) ────────────────────────────
    confidential_notes: {
      type:   String,
      default: null,
      select: false, // Only returned when explicitly selected by admin
    },

    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at: { type: Date, default: null },

    // Severity flag for GBV / defilement cases — triggers social services alert
    requires_social_services: { type: Boolean, default: false },
    social_services_notified: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:  { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

illicitReportSchema.index({ village: 1, status: 1 });
illicitReportSchema.index({ created_at: -1 });

// ─── Pre-save: auto-flag GBV/defilement for social services ──────────────────
illicitReportSchema.pre('save', function (next) {
  if (this.isNew) {
    const sensitiveTypes = ['Gender-Based Violence', 'Rape / Defilement'];
    if (sensitiveTypes.includes(this.type)) {
      this.requires_social_services = true;
    }
  }
  next();
});

module.exports = mongoose.model('IllicitReport', illicitReportSchema);
