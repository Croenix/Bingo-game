const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    profileImageUrl: { type: String, default: '' },
    socketId: { type: String, default: '' },
    isCreator: { type: Boolean, default: false },
    isReady: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
    bingoCard: {
      numbers: { type: [Number], default: undefined },
      freeCenter: { type: Boolean, default: true }
    }
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Bingo Room'
    },
    password: {
      type: String,
      default: '',
      trim: true
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    creatorId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    creatorName: {
      type: String,
      required: true,
      trim: true
    },
    capacity: {
      type: Number,
      required: true,
      default: 4,
      min: 2,
      max: 10
    },
    players: [playerSchema],
    status: {
      type: String,
      enum: ['waiting', 'playing', 'finished'],
      default: 'waiting'
    },
    vivoxChannelUri: {
      type: String,
      default: ''
    },
    expiresAt: {
      type: Date,
      required: true
    },
    gameData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

// Indexes for zero-lag socket lookups, TTL cleanup, and fast room listing
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
roomSchema.index({ status: 1, isPublic: 1, createdAt: -1 });
roomSchema.index({ 'players.socketId': 1 });
roomSchema.index({ 'players.userId': 1 });

module.exports = mongoose.model('Room', roomSchema);
