import Game from "./game.schema.js";
import { Chess } from 'chess.js';
import mongoose from 'mongoose';
export default class gameR{
    async create(wId, bId){
        if(wId && bId){
        const game = new Game({
            playerWhite:wId,
            playerBlack:bId
        })
        return await game.save();
        }
        else{
            throw new Error("Please make sure both id's are correct!");
        }
    }
          

   async getGameStatsByUserId(userId) {
  try {
    const objectId = new mongoose.Types.ObjectId(userId); 
    const games = await Game.find({
      $or: [
        { playerWhite: objectId },
        { playerBlack: objectId }
      ]
    });

    const result = {
      totalGames: games.length,
      won: 0,
      lost: 0,
      draw: 0,
      noResult: 0
    };

    games.forEach(game => {
      if (game.status === 'draw') {
        result.draw++;
      } else if (game.status === 'noResult') {
        result.noResult++;
      } else if (game.status === 'finished' && game.winner?.toString() === userId.toString()) {
        result.won++;
      } else if (game.status === 'finished' && game.winner && game.winner.toString() !== userId.toString()) {
        result.lost++;
      }
    });

    return result;

  } catch (err) {
    console.error('Error fetching game stats:', err);
    throw err;
  }
}

async getMoveStatsByUserId(userId) {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch all games where the user played
    const games = await Game.find({
      $or: [{ playerWhite: userObjectId }, { playerBlack: userObjectId }],
    });

    let totalMoves = 0;
    const stats = {
      brilliant: 0,
      best: 0,
      good: 0,
      inaccurate: 0,
      mistake: 0,
      blunder: 0,
    };

    for (const game of games) {
      const isWhite = game.playerWhite.equals(userObjectId);
      const side = isWhite ? 'playerWhite' : 'playerBlack';

      const moveCount = Math.floor(game.moves.length / 2) + (isWhite && game.moves.length % 2 !== 0 ? 1 : 0);
      totalMoves += moveCount;

      stats.brilliant += game.Brilliant?.[side] || 0;
      stats.best += game.Best?.[side] || 0;
      stats.good += game.Good?.[side] || 0;
      stats.inaccurate += game.Inaccurate?.[side] || 0;
      stats.mistake += game.Mistake?.[side] || 0;
      stats.blunder += game.Blunder?.[side] || 0;
    }

    // Calculate percentages
    const percent = (count) => (totalMoves > 0 ? ((count / totalMoves) * 100).toFixed(2) : "0.00");

    return {
      totalMoves,
      brilliant: { count: stats.brilliant, percentage: percent(stats.brilliant) },
      best: { count: stats.best, percentage: percent(stats.best) },
      good: { count: stats.good, percentage: percent(stats.good) },
      inaccurate: { count: stats.inaccurate, percentage: percent(stats.inaccurate) },
      mistake: { count: stats.mistake, percentage: percent(stats.mistake) },
      blunder: { count: stats.blunder, percentage: percent(stats.blunder) },
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
}




    
    async move(gameId, move, userId){
      const game = await Game.findById(gameId);
      if (!game) throw new Error("Cannot find the game!");

      const chess = new Chess();
      for (const m of game.moves) {
      chess.move(m);
    }

    const isWhitesTurn = chess.turn() === 'w';
    const isUserTurn = (isWhitesTurn && game.playerWhite.toString() === userId) || (!isWhitesTurn && game.playerBlack.toString() === userId);

    if (!isUserTurn) {
      throw new Error("Not your turn!");
    }
  
    const result = chess.move(move);
    if (!result) {
      return res.status(400).json({ error: 'Illegal move' });
    }

    game.moves.push(result.san); 

    if (chess.game_over()) {
      game.status = 'finished';

      if (chess.in_draw()) {
        game.winner = null;
      } else {
        
        game.winner = chess.turn() === 'w' ? game.playerBlack : game.playerWhite;
      }
    }

    return await game.save();
    
    }

}
