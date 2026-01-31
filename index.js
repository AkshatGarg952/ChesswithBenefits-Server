import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from "http";
import { Server } from "socket.io";
import { Chess } from 'chess.js';
import connectDB from "./src/database/mongoose.js";
import userRouter from './src/features/users/user.routes.js';
import gameRouter from './src/features/games/game.routes.js';
import Game from "./src/features/games/game.schema.js";
import analyzeMove from './src/helper/analyse.js';
import { getGeminiCommentary, getPromptTemplate } from "./src/features/commentary.js";
import User from "./src/features/users/user.schema.js";
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose, { Types } from 'mongoose';


const app = express();
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = ['https://chesswith-benefits-client.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    res.json({ user, token });
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
});

// API Routes
app.use('/api/users', userRouter);
app.use('/api/games', gameRouter);
app.post('/api/commentary', async (req, res) => {
  try {
    const { mode, move, fen, lastMoves, isUserMove } = req.body.prompt;
    const prompt = getPromptTemplate(mode, { move, fen, lastMoves, isUserMove });
    const commentary = await getGeminiCommentary(prompt);
    res.status(200).json({ commentary });
  } catch (err) {
    console.error("Error generating commentary:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const http = createServer(app);
const io = new Server(http, {
  cors: {
    origin: ['https://chesswith-benefits-client.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});


const rooms = {};

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on("joinRoom", async ({ userId, roomId, color }) => {
    try {
      // Validation
      if (!userId || !roomId) {
        console.error("Missing userId or roomId");
        socket.emit("errorMessage", "Invalid request: userId and roomId are required.");
        return;
      }

      if (!rooms[roomId]) rooms[roomId] = [];

      // Check if user is already in the room
      const isAlreadyJoined = rooms[roomId].some(player => player.userId === userId);
      if (isAlreadyJoined) {
        console.log(`User ${userId} is already in room ${roomId}`);
        socket.emit("errorMessage", "You are already in this room.");
        return;
      }

      // Get current players (excluding this user if they somehow got in)
      let players = rooms[roomId].filter(p => p.userId !== userId);

      // Check if room is full
      if (players.length >= 2) {
        console.log(`Room ${roomId} is full`);
        socket.emit("errorMessage", "Room is full.");
        return;
      }

      // Assign color
      const takenColors = players.map(p => p.color);
      if (!color || color === "random") {
        color = players.length === 0
          ? (Math.random() < 0.5 ? "white" : "black")
          : (takenColors.includes("white") ? "black" : "white");
      }

      if (takenColors.includes(color)) {
        console.log(`Color ${color} already taken in room ${roomId}`);
        socket.emit("errorMessage", `Color ${color} already taken.`);
        return;
      }

      // Add player to room
      players.push({ socketId: socket.id, userId, color });
      rooms[roomId] = players;
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;

      console.log(`User ${userId} (socket ${socket.id}) joined room ${roomId} as ${color}`);

      socket.emit("assignedColor", color);
      socket.to(roomId).emit("playerJoined", { message: `${userId} joined as ${color}` });

      // If both players are now in the room
      if (rooms[roomId].length === 2) {
        const firstPlayer = rooms[roomId].find(p => p.socketId !== socket.id);
        if (firstPlayer) {
          io.to(firstPlayer.socketId).emit("opponentJoined", {
            message: `${userId} joined as ${color}`,
            opponentSocketId: socket.id,
            opponentUserId: userId,
            opponentColor: color,
            shouldInitiateCall: true
          });
        }

        socket.emit("opponentJoined", {
          message: `${firstPlayer.userId} is already here as ${firstPlayer.color}`,
          opponentSocketId: firstPlayer.socketId,
          opponentUserId: firstPlayer.userId,
          opponentColor: firstPlayer.color,
          shouldInitiateCall: false
        });

        const whitePlayer = rooms[roomId].find(p => p.color === 'white');
        const blackPlayer = rooms[roomId].find(p => p.color === 'black');

        if (!whitePlayer || !blackPlayer) {
          console.error("Error: Could not find both players after room join");
          socket.emit("errorMessage", "Error setting up game.");
          return;
        }

        let game = await Game.findOne({
          $or: [
            { playerWhite: whitePlayer.userId, playerBlack: blackPlayer.userId },
            { playerWhite: blackPlayer.userId, playerBlack: whitePlayer.userId }
          ],
          status: 'onGoing'
        });

        if (!game) {
          game = await Game.create({
            playerWhite: whitePlayer.userId,
            playerBlack: blackPlayer.userId,
            moves: [],
            status: 'onGoing',
            winner: null,
            whiteTimeLeft: 600,
            blackTimeLeft: 600,
            turn: 'white',
            lastMoveTimestamp: Date.now()
          });
          console.log(`Created new game ${game._id} for room ${roomId}`);
        } else {
          console.log(`Resumed existing game ${game._id} for room ${roomId}`);
        }

        const chess = new Chess();
        for (const move of game.moves) chess.move(move);

        rooms[roomId].forEach(player => {
          const opponent = rooms[roomId].find(p => p.socketId !== player.socketId);
          console.log(`Emitting bothPlayersJoined to ${player.socketId}`);
          io.to(player.socketId).emit("bothPlayersJoined", {
            gameId: game._id.toString(),
            moves: game.moves,
            fen: chess.fen(),
            opponentSocketId: opponent?.socketId || null,
            opponentUserId: opponent?.userId || null,
            opponentColor: opponent?.color || null,
            whiteTimeLeft: game.whiteTimeLeft,
            blackTimeLeft: game.blackTimeLeft
          });
        });
      }
    } catch (error) {
      console.error("Error in joinRoom:", error);
      socket.emit("errorMessage", "An error occurred while joining the room.");
    }
  });

  socket.on("Draw", ({ roomId }) => {
    try {
      if (!roomId) {
        console.error("Draw event missing roomId");
        return;
      }
      console.log(`Draw offer sent in room ${roomId}`);
      socket.to(roomId).emit("Opponent Draw");
    } catch (error) {
      console.error("Error in Draw event:", error);
    }
  });

  socket.on("Resign", async ({ roomId, gameId, userId }) => {
    try {
      if (!roomId || !gameId || !userId) {
        console.error("Resign event missing required fields");
        socket.emit("errorMessage", "Invalid resign request.");
        return;
      }

      const game = await Game.findById(gameId);
      if (!game) {
        console.error(`Game ${gameId} not found`);
        socket.emit("errorMessage", "Cannot find the game");
        return;
      }

      game.status = "finished";
      if (game.playerWhite.toString() === userId) {
        game.winner = game.playerBlack;
      } else {
        game.winner = game.playerWhite;
      }

      await game.save();
      console.log(`User ${userId} resigned in game ${gameId}`);
      socket.to(roomId).emit("Opponent Resign");
    } catch (error) {
      console.error("Error in Resign event:", error);
      socket.emit("errorMessage", "An error occurred while resigning.");
    }
  });

  socket.on("DrawAccepted", async ({ roomId, gameId }) => {
    try {
      if (!roomId || !gameId) {
        console.error("DrawAccepted event missing required fields");
        socket.emit("errorMessage", "Invalid draw accept request.");
        return;
      }

      const game = await Game.findById(gameId);
      if (!game) {
        console.error(`Game ${gameId} not found`);
        socket.emit("errorMessage", "Cannot find the game");
        return;
      }

      game.status = "draw";
      await game.save();
      console.log(`Draw accepted in game ${gameId}`);
      socket.to(roomId).emit("DrawAccepted");
    } catch (error) {
      console.error("Error in DrawAccepted event:", error);
      socket.emit("errorMessage", "An error occurred while accepting draw.");
    }
  });

  socket.on("DrawDeclined", ({ roomId }) => {
    try {
      if (!roomId) {
        console.error("DrawDeclined event missing roomId");
        return;
      }
      console.log(`Draw declined in room ${roomId}`);
      socket.to(roomId).emit("DrawDeclined");
    } catch (error) {
      console.error("Error in DrawDeclined event:", error);
    }
  });

  socket.on("SendMove", async ({ move, gameId, userId, roomId, timeLeft }) => {
    try {
      const objectId = Types.ObjectId.isValid(gameId) ? new Types.ObjectId(gameId) : gameId;

      const game = await Game.findById(objectId);
      if (!game) throw new Error("Game not found");

      const now = Date.now();
      const elapsed = Math.floor((now - game.lastMoveTimestamp) / 1000);

      if (game.turn === 'white') {
        game.whiteTimeLeft -= elapsed;
        console.log(`White time left: ${game.whiteTimeLeft}`);
        if (game.whiteTimeLeft <= 0) {
          game.status = 'finished';
          game.winner = game.playerBlack;

          await game.save();

          io.to(game.playerWhite.toString()).emit("gameOver", {
            reason: "timeout",
            status: "lost",
            winner: game.playerBlack
          });

          // Send to black player → won
          io.to(game.playerBlack.toString()).emit("gameOver", {
            reason: "timeout",
            status: "won",
            winner: game.playerBlack
          });

          return;
        }
      } else {
        game.blackTimeLeft -= elapsed;
        if (game.blackTimeLeft <= 0) {
          game.status = 'finished';
          game.winner = game.playerWhite;

          await game.save();

          io.to(game.playerBlack.toString()).emit("gameOver", {
            reason: "timeout",
            status: "lost",
            winner: game.playerWhite
          });

          io.to(game.playerWhite.toString()).emit("gameOver", {
            reason: "timeout",
            status: "won",
            winner: game.playerWhite
          });

          return;
        }
      }



      game.turn = game.turn === 'white' ? 'black' : 'white';
      game.lastMoveTimestamp = now;

      const chess = new Chess();
      for (const m of game.moves) chess.move(m);

      const isWhitesTurn = chess.turn() === 'w';
      const isUserTurn = (
        (isWhitesTurn && game.playerWhite.toString() === userId) ||
        (!isWhitesTurn && game.playerBlack.toString() === userId)
      );

      if (!isUserTurn) {
        socket.emit("moveRejected", { error: "Not your turn!" });
        return;
      }

      const result = chess.move(move);
      if (!result) {
        socket.emit("moveRejected", { error: "Illegal move!" });
        return;
      }

      game.moves.push(result.san);

      const { moveQuality } = await analyzeMove(game, game.moves.slice(0, -1), move);

      if (moveQuality && game[moveQuality]) {
        if (isWhitesTurn) {
          game[moveQuality].playerWhite += 1;
        } else {
          game[moveQuality].playerBlack += 1;
        }
      }

      if (chess.isGameOver()) {
        if (chess.isDraw()) {
          game.status = "draw";
          game.winner = null;
        } else {
          game.status = "finished";
          game.winner = chess.turn() === "w" ? game.playerBlack : game.playerWhite;
        }
      }

      const updatedGame = await game.save();
      socket.to(roomId).emit("receiveMove", {
        move: result,
        fen: chess.fen(),
        gameStatus: updatedGame.status,
        winner: updatedGame.winner || null,
        allMoves: updatedGame.moves,
        whiteTimeLeft: game.whiteTimeLeft,
        blackTimeLeft: game.blackTimeLeft
      });
    } catch (err) {
      console.error("Move error:", err.message);
      socket.emit("moveRejected", { error: "Server error." });
    }
  });

  socket.on("SendMessage", ({ message, roomId }) => {
    try {
      if (!roomId || !message) {
        console.error("SendMessage event missing required fields");
        return;
      }
      const serverMessage = { message, time: new Date().toISOString() };
      socket.to(roomId).emit("ReceiveMessage", serverMessage);
    } catch (error) {
      console.error("Error in SendMessage event:", error);
    }
  });

  socket.on("call-user", ({ targetSocketId, offer }) => {
    try {
      if (!targetSocketId || !offer) {
        console.error("call-user event missing required fields");
        return;
      }
      console.log("call received on backend, forwarding to", targetSocketId);
      io.to(targetSocketId).emit("incoming-call", { from: socket.id, offer });
    } catch (error) {
      console.error("Error in call-user event:", error);
    }
  });

  socket.on("answer-call", ({ targetSocketId, answer }) => {
    try {
      if (!targetSocketId || !answer) {
        console.error("answer-call event missing required fields");
        return;
      }
      console.log("answer received on backend, forwarding to", targetSocketId);
      io.to(targetSocketId).emit("call-answered", { from: socket.id, answer });
    } catch (error) {
      console.error("Error in answer-call event:", error);
    }
  });

  socket.on('reconnect-call', ({ targetSocketId }) => {
    try {
      if (!targetSocketId) {
        console.error("reconnect-call event missing targetSocketId");
        return;
      }
      io.to(targetSocketId).emit('reconnect-call', { from: socket.id });
    } catch (error) {
      console.error("Error in reconnect-call event:", error);
    }
  });

  socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
    try {
      if (!targetSocketId || !candidate) {
        console.error("ice-candidate event missing required fields");
        return;
      }
      console.log("Ice candidate received on backend, forwarding to", targetSocketId);
      io.to(targetSocketId).emit("ice-candidate", { from: socket.id, candidate });
    } catch (error) {
      console.error("Error in ice-candidate event:", error);
    }
  });

  socket.on("end-call", ({ targetSocketId }) => {
    try {
      if (!targetSocketId) {
        console.error("end-call event missing targetSocketId");
        return;
      }
      io.to(targetSocketId).emit("call-ended", { from: socket.id });
    } catch (error) {
      console.error("Error in end-call event:", error);
    }
  });


  socket.on("disconnect", () => {
    const roomId = socket.data.roomId; // Get the roomId from socket.data

    if (roomId && rooms[roomId]) {
      // Find the opponent before removing the disconnected player
      const opponent = rooms[roomId].find(player => player.socketId !== socket.id);

      // Remove the disconnected player from the room
      rooms[roomId] = rooms[roomId].filter(player => player.socketId !== socket.id);

      // If an opponent was found, notify them
      if (opponent) {
        console.log(`Notifying ${opponent.socketId} that ${socket.id} has disconnected.`);
        io.to(opponent.socketId).emit("opponent-disconnected", { opponentSocketId: socket.id });
      }

      // Clean up the room if it's now empty
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
        console.log(`Room ${roomId} is now empty and has been deleted.`);
      }
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

http.listen(process.env.PORT_NO, () => {
  console.log("Server started on port", process.env.PORT_NO);
  connectDB();
});
