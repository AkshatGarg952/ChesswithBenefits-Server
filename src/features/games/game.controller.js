import gameR from "./game.repository.js";
const gameRepository = new gameR();

export default class gameC{
    async create(req, res){
        const {wId, bId} = req.params;
        try{
        const game = await gameRepository.create(wId, bId);
        res.status(200).send(game);
        }
        catch(err){
            res.status(400).send(err.message)
        }
    }

    async getGameStatsByUserId(req, res){
        const {userId} = req.params;
        try{
            const response = await gameRepository.getGameStatsByUserId(userId);
            res.status(200).send(response);
        }

        catch(err){
            console.log(err.message);
            res.status(400).send(err.message);
        }
    }

        async getMoveStatsByUserId(req, res){
        const {userId} = req.params;
        try{
            const response = await gameRepository.getMoveStatsByUserId(userId);
            res.status(200).send(response);
        }

        catch(err){
            console.log(err.message);
            res.status(400).send(err.message);
        }
    }

    async move(req, res){
        const {gameId, userId} = req.params;
        const move = req.body;
        try{
            const game = await gameRepository.move(gameId, move, userId);
            res.status(200).send(game);
        }
        catch(err){
            res.status(400).send(err.message);
        }
    }
}