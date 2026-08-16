import mongoose from 'mongoose';
import Game from './game.schema.js';

const QUALITIES = ['Brilliant', 'Best', 'Good', 'Inaccurate', 'Mistake', 'Blunder'];

export default class GameRepository {
  async getGameStatsByUserId(userId) {
    const objectId = new mongoose.Types.ObjectId(userId);
    const games = await Game.find({ $or: [{ playerWhite: objectId }, { playerBlack: objectId }] })
      .select('status winner')
      .lean();

    const result = { totalGames: games.length, won: 0, lost: 0, draw: 0, noResult: 0 };

    for (const game of games) {
      if (game.status === 'draw') {
        result.draw++;
      } else if (game.status === 'noResult') {
        result.noResult++;
      } else if (game.status === 'finished' && game.winner) {
        if (game.winner.toString() === userId) result.won++;
        else result.lost++;
      }
    }

    return result;
  }

  async getMoveStatsByUserId(userId) {
    const objectId = new mongoose.Types.ObjectId(userId);

    // Only the move *count* is needed, so let Mongo compute it instead of
    // shipping every game's full move list back to the app.
    const games = await Game.aggregate([
      { $match: { $or: [{ playerWhite: objectId }, { playerBlack: objectId }] } },
      {
        $project: {
          _id: 0,
          isWhite: { $eq: ['$playerWhite', objectId] },
          moveCount: { $size: { $ifNull: ['$moves', []] } },
          ...Object.fromEntries(QUALITIES.map((quality) => [quality, 1])),
        },
      },
    ]);

    let totalMoves = 0;
    const counts = Object.fromEntries(QUALITIES.map((quality) => [quality, 0]));

    for (const game of games) {
      const side = game.isWhite ? 'playerWhite' : 'playerBlack';

      // White plays the odd-numbered plies, black the even ones.
      totalMoves += Math.floor(game.moveCount / 2) + (game.isWhite && game.moveCount % 2 !== 0 ? 1 : 0);

      for (const quality of QUALITIES) {
        counts[quality] += game[quality]?.[side] || 0;
      }
    }

    const percent = (count) => (totalMoves > 0 ? ((count / totalMoves) * 100).toFixed(2) : '0.00');

    return {
      totalMoves,
      ...Object.fromEntries(
        QUALITIES.map((quality) => [
          quality.toLowerCase(),
          { count: counts[quality], percentage: percent(counts[quality]) },
        ])
      ),
    };
  }
}
