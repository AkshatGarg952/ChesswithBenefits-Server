import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  playerWhite: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  playerBlack: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moves: [{ type: String }], 
  status: { type: String, enum: ['draw', 'finished','noResult','onGoing'], default: 'onGoing' },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  Brilliant: {playerBlack:{type:Number, default:0},
    playerWhite:{type:Number, default:0}
  },
   Best: {playerBlack:{type:Number, default:0},
    playerWhite:{type:Number, default:0}
  },
   Good: {playerBlack:{type:Number, default:0},
    playerWhite:{type:Number, default:0}
  },
   Inaccurate: {playerBlack:{type:Number, default:0},
    playerWhite:{type:Number, default:0}
  },
   Mistake: {playerBlack:{type:Number, default:0},
    playerWhite:{type:Number, default:0}
  },
   Blunder: {playerBlack:{type:Number, default:0},
    playerWhite:{type:Number, default:0}
  },
})

const Game = mongoose.model('Game', gameSchema);
export default Game;