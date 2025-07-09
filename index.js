import express from 'express';
import dotenv from 'dotenv';
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

dotenv.config();
const app = express();
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true             
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get('/api/auth/me', async(req, res) => {
  
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
const io = new Server(http, { cors: { origin: "*", credentials:true } });

// In-memory room data
const rooms = {};

io.on('connection', (socket) => {
  console.log("New client connected");
  
  socket.on("joinRoom", async ({ userId, roomId, color }) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    
    let players = rooms[roomId].filter(p => p.userId !== userId);
    rooms[roomId] = players;

    if (players.length >= 2) {
      socket.emit("errorMessage", "Room is full.");
      return;
    }

    const takenColors = players.map(p => p.color);
    if (!color || color === "random") {
      color = players.length === 0
        ? (Math.random() < 0.5 ? "white" : "black")
        : (takenColors.includes("white") ? "black" : "white");
    }

    if (takenColors.includes(color)) {
      socket.emit("errorMessage", `Color ${color} already taken.`);
      return;
    }

    players.push({ socketId: socket.id, userId, color });
    socket.join(roomId);
    socket.data.roomId = roomId;
    
    socket.emit("assignedColor", color);
    socket.to(roomId).emit("playerJoined", { message: `${userId} joined as ${color}` });

    // Emit game data and peer IDs when both players have joined
    if (rooms[roomId].length === 2) {
      const whitePlayer = rooms[roomId].find(p => p.color === 'white');
      const blackPlayer = rooms[roomId].find(p => p.color === 'black');

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
        });
        console.log("🎯 New game created:", game._id);
      } else {
        console.log("📦 Resuming game:", game._id);
      }

      const chess = new Chess();
      for (const move of game.moves) chess.move(move);

      rooms[roomId].forEach(player => {
        const opponent = rooms[roomId].find(p => p.socketId !== player.socketId);
        console.log("Emitting bothe joined")
        io.to(player.socketId).emit("bothPlayersJoined", {
          gameId: game._id.toString(),
          moves: game.moves,
          fen: chess.fen(),
          opponentSocketId: opponent?.socketId || null,
        });
      });
    }
  });
   

  socket.on("Draw", ({ roomId}) => {
  socket.to(roomId).emit("Opponent Draw");
});

  socket.on("Resign", async ({ roomId, gameId, userId}) => {
  const oldGame = await Game.findById(gameId);
  if(!oldGame){
    throw new Error("Cannot find the game");
  }
  oldGame.status="finished"
  if(oldGame.playerWhite===userId){
    oldGame.winner = oldGame.playerBlack;
  }
  else{
    oldGame.winner = oldGame.playerWhite;
  }

  await oldGame.save();
  socket.to(roomId).emit("Opponent Resign");
});

socket.on("DrawAccepted", async ({ roomId, gameId }) => {
  const oldGame = await Game.findById(gameId);
  if(!oldGame){
    throw new Error("Vannot find the game");
  }
  oldGame.status = "draw";
  await oldGame.save();
  socket.to(roomId).emit("DrawAccepted");
});

socket.on("DrawDeclined", ({ roomId }) => {
  socket.to(roomId).emit("DrawDeclined");
});


  socket.on("SendMove", async ({ move, gameId, userId, roomId }) => {
    console.log("received move");
    try {
      const game = await Game.findById(gameId);
      if (!game) throw new Error("Game not found");
      
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
      console.log(updatedGame.moves.length);
      console.log("SEnding back the move!");
      socket.to(roomId).emit("receiveMove", {
        move: result,
        fen: chess.fen(),
        gameStatus: updatedGame.status,
        winner: updatedGame.winner || null,
        allMoves: updatedGame.moves
      });

    } catch (err) {
      console.error("❌ Move error:", err.message);
      socket.emit("moveRejected", { error: "Server error." });
    }
  });

  socket.on("SendMessage", ({ message, roomId }) => {
    if (!roomId) return;
    const serverMessage = { message, time: new Date().toISOString() };
    socket.to(roomId).emit("ReceiveMessage", serverMessage);
  });

  
  socket.on("call-user", ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit("incoming-call", { from: socket.id, offer });
  });

  socket.on("answer-call", ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit("call-answered", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("end-call", ({ targetSocketId }) => {
    io.to(targetSocketId).emit("call-ended", { from: socket.id });
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(player => player.socketId !== socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
    console.log("👋 Client disconnected");
  });
});

http.listen(process.env.PORT_NO, () => {
  console.log("🚀 Server started on port", process.env.PORT_NO);
  connectDB();
});
