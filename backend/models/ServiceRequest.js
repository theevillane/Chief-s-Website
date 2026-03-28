'use strict';

const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema(
  {
    ref_number: {
      type:   String,
      unique: true,
      index:  true,
    },

    // ── Letter metadata ────────────────────────────────────────────────────────
    letter_type: {
      type:     String,
      required: [true, 'Letter type is required'],
      enum: {
        values:  ['id_letter', 'residence', 'school', 'conduct', 'intro_id'],
        message: '{VALUE} is not a valid letter type',
      },
    },
    type_label: {
      type: String, // Human-readable, derived from letter_type
    },

    // ── Applicant info (snapshot at time of request) ───────────────────────────
    citizen_uid: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Citizen reference is required'],
      index:    true,
    },
    citizen_name:     { type: String, required: true },
    citizen_id_number: { type: String },
    village: {
      type:     String,
      required: [true, 'Village is required'],
    },

    // ── Request details ────────────────────────────────────────────────────────
    purpose: {
      type:      String,
      required:  [true, 'Purpose is required'],
      minlength: [10, 'Purpose must be at least 10 characters'],
      maxlength: [500, 'Purpose must not exceed 500 characters'],
    },
    destination: {
      type:    String, // e.g. school name, employer, institution
      default: null,
    },

    // ── Workflow status ────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['submitted', 'under_review', 'approved', 'rejected', 'resolved'],
      default: 'submitted',
      index:   true,
    },

    // ── Admin fields ───────────────────────────────────────────────────────────
    reviewed_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewed_at:  { type: Date, default: null },
    approved_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at:  { type: Date, default: null },
    rejection_reason: { type: String, default: null },
    admin_notes:  { type: String, default: null },

    // ── Generated PDF ─────────────────────────────────────────────────────────
    letter_pdf_url:  { type: String, default: null },
    letter_pdf_path: { type: String, select: false, default: null },

    // ── Notification tracking ─────────────────────────────────────────────────
    sms_sent_approval: { type: Boolean, default: false },
    sms_sent_rejection: { type: Boolean, default: false },

    // ── Priority ──────────────────────────────────────────────────────────────
    urgency: {
      type:    String,
      enum:    ['normal', 'high', 'urgent'],
      default: 'normal',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:  { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
serviceRequestSchema.index({ citizen_uid: 1, status: 1 });
serviceRequestSchema.index({ village: 1 });
serviceRequestSchema.index({ created_at: -1 });

// ─── Auto set type_label from letter_type ────────────────────────────────────
const LABEL_MAP = {
  id_letter: 'Identification Letter',
  residence: 'Residence Confirmation',
  school:    'School Admission Letter',
  conduct:   'Good Conduct / Character Letter',
  intro_id:  'Introduction Letter (ID Application)',
};

serviceRequestSchema.pre('save', function (next) {
  if (this.isModified('letter_type')) {
    this.type_label = LABEL_MAP[this.letter_type] || this.letter_type;
  }
  next();
});

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
