'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const VALID_VILLAGES = [
  'Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo',
  'Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka',
  'Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira',
  'Kogol','Kabuor Omuga',
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Full name is required'],
      trim:     true,
      minlength: [3,  'Name must be at least 3 characters'],
      maxlength: [100,'Name must not exceed 100 characters'],
    },
    id_number: {
      type:     String,
      required: [true, 'National ID number is required'],
      unique:   true,
      trim:     true,
      match:    [/^\d{7,8}$/, 'National ID must be 7 or 8 digits'],
    },
    phone: {
      type:     String,
      required: [true, 'Phone number is required'],
      unique:   true,
      trim:     true,
      // Normalised to +2547XXXXXXXX format on save
      match: [/^\+2547\d{8}$|^07\d{8}$/, 'Enter a valid Kenyan phone number'],
    },
    email: {
      type:      String,
      trim:      true,
      lowercase: true,
      match:     [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
      default:   null,
    },
    village: {
      type:     String,
      required: [true, 'Village is required'],
      enum:     { values: VALID_VILLAGES, message: '{VALUE} is not a valid village in Jimo East' },
    },
    role: {
      type:    String,
      enum:    ['citizen', 'admin', 'chief', 'assistant_chief'],
      default: 'citizen',
    },
    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select:   false, // Never returned in queries unless explicitly requested
    },
    verified: {
      type:    Boolean,
      default: false,
    },
    verified_at:   { type: Date, default: null },
    profile_photo_url: { type: String, default: null },
    is_active:     { type: Boolean, default: true },
    last_login:    { type: Date,    default: null },

    // Refresh token stored hashed for rotation
    refresh_token: {
      type:   String,
      select: false,
      default: null,
    },

    // Password reset
    password_reset_token: { type: String, select: false, default: null },
    password_reset_expires: { type: Date, select: false, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:  { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ id_number: 1 });
userSchema.index({ phone:     1 });
userSchema.index({ village:   1 });
userSchema.index({ role:      1 });

// ─── Normalise phone to +2547XXXXXXXXX ───────────────────────────────────────
userSchema.pre('save', function (next) {
  if (this.isModified('phone')) {
    if (this.phone.startsWith('07')) {
      this.phone = '+254' + this.phone.slice(1);
    }
  }
  next();
});

// ─── Hash password before save ────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refresh_token;
  delete obj.password_reset_token;
  delete obj.password_reset_expires;
  return obj;
};

// ─── Virtual ──────────────────────────────────────────────────────────────────
userSchema.virtual('display_phone').get(function () {
  if (!this.phone) return null;
  return this.phone.replace('+254', '0');
});

module.exports = mongoose.model('User', userSchema);
