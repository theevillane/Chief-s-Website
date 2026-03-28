'use strict';

const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    ref_number: {
      type:   String,
      unique: true,
      index:  true,
    },

    type: {
      type:     String,
      required: [true, 'Dispute type is required'],
      enum: {
        values: ['Land Boundary','Family Conflict','Inheritance','Neighbor Dispute','Water Rights','Other'],
        message: '{VALUE} is not a recognised dispute type',
      },
    },

    // ── Complainant ───────────────────────────────────────────────────────────
    complainant_uid: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'User',
      index: true,
    },
    complainant_name: { type: String, default: null },
    anonymous:        { type: Boolean, default: false },

    // ── Dispute details ───────────────────────────────────────────────────────
    parties: {
      type:      String,
      required:  [true, 'Names of parties involved are required'],
      minlength: [3,   'Parties must be at least 3 characters'],
    },
    description: {
      type:      String,
      required:  [true, 'Dispute description is required'],
      minlength: [20,  'Description must be at least 20 characters'],
      maxlength: [2000,'Description must not exceed 2000 characters'],
    },
    village: {
      type:     String,
      required: [true, 'Village is required'],
      index:    true,
    },
    location_description: { type: String, default: null },

    // ── Evidence uploads ──────────────────────────────────────────────────────
    evidence_urls: [{ type: String }],

    // ── Workflow ──────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['submitted','under_review','hearing_scheduled','resolved','closed'],
      default: 'submitted',
      index:   true,
    },

    // ── Hearing scheduling ────────────────────────────────────────────────────
    hearing_date:  { type: Date,   default: null },
    hearing_venue: { type: String, default: 'Jimo East DO Grounds' },
    hearing_notes: { type: String, default: null },

    // ── Resolution ────────────────────────────────────────────────────────────
    resolution_notes: { type: String, default: null },
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null },

    // ── Admin internals ───────────────────────────────────────────────────────
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    admin_notes: { type: String, default: null },

    // ── Notification ──────────────────────────────────────────────────────────
    hearing_sms_sent: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:  { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

disputeSchema.index({ village: 1, status: 1 });
disputeSchema.index({ created_at: -1 });

module.exports = mongoose.model('Dispute', disputeSchema);
