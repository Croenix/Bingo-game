const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    gmailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[a-zA-Z0-9._%+-]+@gmail\.com$/
    },
    deviceId: {
      type: String,
      required: [true, 'deviceId is required'],
      trim: true,
      unique: true,
      index: true
    },
    profileImageUrl: { type: String, trim: true, default: '' },
    coins: { type: Number, default: 1000, min: 0 },
    gems: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

// Compound indexes for fast admin sorting and search lookups
userSchema.index({ createdAt: -1 });
userSchema.index({ username: 1 });
userSchema.index({ name: 1, gmailId: 1 });

module.exports = mongoose.model('User', userSchema);

