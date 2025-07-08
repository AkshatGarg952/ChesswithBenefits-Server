import express from "express";
import userC from "./user.controller.js";
import {upload} from "../../middleware/multer.middleware.js";
import jwtAuth from "../../middleware/jwt.auth.js";
const userRouter = express.Router();
const userController = new userC();

userRouter.post("/register",upload.single('profileImage'), async (req, res) => {
      userController.register(req, res);
});

userRouter.post("/login", (req,res)=>{
    console.log(req.body);
    userController.login(req,res);
});

userRouter.get("/details/:id",jwtAuth, (req,res)=>{
    userController.getDetails(req,res);
});

userRouter.post("/update/:id",jwtAuth, upload.single('profileImage'), (req,res)=>{
    userController.update(req,res);
});

export default userRouter;