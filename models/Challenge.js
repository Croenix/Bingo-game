const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    category: { type: String, trim: true, default: 'Standard', maxlength: 60 },
    coverImage: { type: String, trim: true, default: '' },
    color1: { type: String, trim: true, default: '#6366f1' },
    color2: { type: String, trim: true, default: '#a855f7' },
    entryCoin: { type: Number, required: true, min: 0, default: 100 },
    entryCurrencyType: { type: String, enum: ['coins', 'gems'], default: 'coins' },
    rewardCoin: { type: Number, required: true, min: 0, default: 200 },
    rewardCurrencyType: { type: String, enum: ['coins', 'gems'], default: 'coins' },
    maxPlayers: { type: Number, required: true, min: 2, default: 4 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

challengeSchema.index({ status: 1, category: 1, createdAt: -1 });
challengeSchema.index({ createdAt: -1 });
challengeSchema.index({ title: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);
