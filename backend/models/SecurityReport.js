'use strict';

const mongoose = require('mongoose');

const securityReportSchema = new mongoose.Schema(
  {
    ref_number: {
      type:   String,
      unique: true,
      index:  true,
    },

    type: {
      type:     String,
      required: [true, 'Incident type is required'],
      enum: {
        values: ['Theft','Violence','Suspicious Activity','Emergency','Livestock Theft','Other'],
        message: '{VALUE} is not a recognised incident type',
      },
    },

    urgency: {
      type:     String,
      required: [true, 'Urgency level is required'],
      enum:     { values: ['low','medium','high','urgent'], message: 'Invalid urgency level' },
      index:    true,
    },

    description: {
      type:      String,
      required:  [true, 'Incident description is required'],
      minlength: [15,  'Description must be at least 15 characters'],
      maxlength: [2000,'Description must not exceed 2000 characters'],
    },

    village: {
      type:     String,
      required: [true, 'Village is required'],
      index:    true,
    },
    location_detail: { type: String, default: null },

    // ── Reporting user (null if anonymous) ────────────────────────────────────
    reported_by: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'User',
      default: null,
    },
    anonymous: { type: Boolean, default: false, index: true },

    // ── Evidence ──────────────────────────────────────────────────────────────
    evidence_urls: [{ type: String }],

    // ── Workflow ──────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['submitted','under_review','escalated','resolved','closed'],
      default: 'submitted',
      index:   true,
    },

    // ── Admin fields ───────────────────────────────────────────────────────────
    assigned_to:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    response_notes: { type: String, default: null },
    escalated_to:   { type: String, default: null }, // e.g. 'Kenya Police, Jimo Station'

    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null },

    // ── Alert flag: urgent reports trigger immediate notification ─────────────
    alert_sent: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:  { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

securityReportSchema.index({ urgency: 1, status: 1 });
securityReportSchema.index({ village: 1 });
securityReportSchema.index({ created_at: -1 });

module.exports = mongoose.model('SecurityReport', securityReportSchema);
