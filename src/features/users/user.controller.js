import userR from "./user.repository.js";
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
const userRepository = new userR();
dotenv.config();
export default class userC{

  async register(req, res) {
    let {
       email, password, username} = req.body;

  
    const User = {
      username,
      email,
      password,
    };
  
    if (req.file) {
      const imageUrl = req.file.path;;
      User.profileImage = imageUrl;
    }
  
    try {
      console.log(User);
      const user = await userRepository.register(User);
      console.log(user);
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  
    
      res.status(200).json({user, token});
    } catch (err) {
      res.status(400).send(err);
    }
  }
  

    async login(req, res){
      console.log(req);
        const {email, password} = req.body;
       
        try{
          const user = await userRepository.login(email,password);
          const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

           res.status(200).json({user, token});
        }
        catch(err){
            res.status(400).send(err);
        }
    }

    
    async getDetails(req, res){
        const id = req.params.id;
        try{
            const user = await userRepository.details(id);
            console.log(user);
            res.status(201).send(user);
        }
        catch(err){
            res.status(400).send(err.message);
        }
    }


    async update(req, res){
        const id = req.params.id;
        console.log(req.body);
        
        try{
            const User = {};
    if (req.body.name) User.name = req.body.name;
    if (req.body.username) User.username = req.body.username;
    if (req.body.email) User.email = req.body.email;

    if (req.body.password) {
    User.password = req.body.password; 
    }
    if (req.file && req.file.path) {
      User.profileImage = req.file.path;
    }

    console.log(User);
    const newUser = await userRepository.update(id,User);
    res.status(200).send(newUser);
        }

        catch(err){
            console.log(err.message);
            res.status(400).send(err.message);
        }

    }

    
}