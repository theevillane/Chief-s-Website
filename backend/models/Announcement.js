'use strict';

const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      required:  [true, 'Title is required'],
      trim:      true,
      minlength: [5,   'Title must be at least 5 characters'],
      maxlength: [150, 'Title must not exceed 150 characters'],
    },
    body: {
      type:      String,
      required:  [true, 'Announcement body is required'],
      minlength: [10,  'Body must be at least 10 characters'],
      maxlength: [2000,'Body must not exceed 2000 characters'],
    },
    category: {
      type:    String,
      enum:    ['baraza','health','government','development','security','general'],
      default: 'general',
      index:   true,
    },

    // ── Targeting ─────────────────────────────────────────────────────────────
    // ['all'] = broadcast to all villages, else array of specific village names
    target_villages: {
      type:    [String],
      default: ['all'],
    },

    // ── Author ────────────────────────────────────────────────────────────────
    published_by: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    published_by_name: { type: String }, // snapshot

    // ── Visibility ────────────────────────────────────────────────────────────
    is_active:   { type: Boolean, default: true,  index: true },
    is_pinned:   { type: Boolean, default: false },
    expiry_date: { type: Date,    default: null },

    // ── Notification delivery ─────────────────────────────────────────────────
    send_sms:       { type: Boolean, default: false },
    sms_sent:       { type: Boolean, default: false },
    sms_sent_at:    { type: Date,    default: null },
    sms_recipient_count: { type: Number, default: 0 },

    // ── Engagement ────────────────────────────────────────────────────────────
    view_count: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:  { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

announcementSchema.index({ is_active: 1, created_at: -1 });
announcementSchema.index({ category: 1 });

// ─── Virtual: is this announcement expired? ───────────────────────────────────
announcementSchema.virtual('is_expired').get(function () {
  if (!this.expiry_date) return false;
  return new Date() > this.expiry_date;
});

module.exports = mongoose.model('Announcement', announcementSchema);
