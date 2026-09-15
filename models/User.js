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
    deviceId: { type: String, trim: true, default: '', index: true },
    profileImageUrl: { type: String, trim: true, default: '' },
    coins: { type: Number, default: 0, min: 0 },
    gems: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

