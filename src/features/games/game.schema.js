import mongoose from 'mongoose';

// Per-player counter for one move-quality bucket.
const qualityCount = () => ({
  playerWhite: { type: Number, default: 0 },
  playerBlack: { type: Number, default: 0 },
});

const gameSchema = new mongoose.Schema(
  {
    playerWhite: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    playerBlack: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    moves: [{ type: String }],
    status: { type: String, enum: ['draw', 'finished', 'noResult', 'onGoing'], default: 'onGoing' },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    Brilliant: qualityCount(),
    Best: qualityCount(),
    Good: qualityCount(),
    Inaccurate: qualityCount(),
    Mistake: qualityCount(),
    Blunder: qualityCount(),

    whiteTimeLeft: { type: Number, default: 600 },
    blackTimeLeft: { type: Number, default: 600 },
    lastMoveTimestamp: { type: Number },
    turn: { type: String, enum: ['white', 'black'], default: 'white' },
  },
  { timestamps: true }
);

// Both stats endpoints and the "resume an ongoing game" lookup filter on the two
// player columns, so each needs its own index.
gameSchema.index({ playerWhite: 1, status: 1 });
gameSchema.index({ playerBlack: 1, status: 1 });

const Game = mongoose.model('Game', gameSchema);
export default Game;
