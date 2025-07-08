import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  playerWhite: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  playerBlack: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  result: {
    type: String,
    enum: ['white', 'black', 'draw', 'undecided'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
});

const Result = mongoose.model('Result', resultSchema);
export default Result;
