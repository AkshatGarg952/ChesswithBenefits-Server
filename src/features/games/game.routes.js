import express from "express";
import gameC from "./game.controller.js";
import jwtAuth from "../../middleware/jwt.auth.js";
const gameRouter = express.Router();
const gameController = new gameC();

gameRouter.get("/create/:wId/:bId",jwtAuth, async (req, res) => {
      gameController.create(req, res);
});

gameRouter.get("/history/:userId",jwtAuth, async (req, res) => {
      gameController.getGameStatsByUserId(req, res);
});

gameRouter.get("/moveshistory/:userId",jwtAuth, async (req, res) => {
      gameController.getMoveStatsByUserId(req, res);
});

gameRouter.post("/move/:gameId/:userId",jwtAuth, async (req, res) => {
      gameController.move(req, res);
});

export default gameRouter


