# Chess with Benefits - Server

Backend server for Chess with Benefits, providing real-time multiplayer chess gameplay with WebSocket communication, AI-powered commentary, move analysis, and comprehensive game management.

## Features

- Real-time multiplayer chess gameplay using Socket.io
- WebRTC signaling for peer-to-peer video calls between players
- AI-powered commentary generation with multiple modes (Roast, Hype, Beginner)
- Chess move analysis and evaluation using Stockfish engine
- User authentication and session management with JWT
- Game state persistence with MongoDB
- Real-time chat messaging between players
- Match history and player statistics tracking
- Image upload support via Cloudinary integration

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Real-time Communication | Socket.io |
| Database | MongoDB with Mongoose ODM |
| Chess Logic | Chess.js |
| Chess Engine | Stockfish |
| Authentication | JWT, bcrypt |
| AI Commentary | Google Generative AI (Gemini) |
| File Storage | Cloudinary |
| Environment Config | dotenv |

## Installation

1. Clone the repository:

```bash
git clone https://github.com/AkshatGarg952/ChesswithBenefits-Server
cd ChesswithBenefits-Server
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory based on `.env.example`:

```env
# Server Configuration
PORT_NO=3000

# Database
MONGODB_URI=mongodb://localhost:27017/chess

# Authentication
JWT_SECRET=your_jwt_secret_key_here

# AI Commentary
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. Start the development server:

```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 3000).

## Project Structure

```
ChesswithBenefits-Server/
├── src/
│   ├── database/
│   │   └── mongoose.js
│   ├── features/
│   │   ├── commentary.js
│   │   ├── games/
│   │   │   ├── game.schema.js
│   │   │   ├── game.controller.js
│   │   │   ├── game.repository.js
│   │   │   └── game.routes.js
│   │   ├── results/
│   │   │   └── result.schema.js
│   │   └── users/
│   │       ├── user.schema.js
│   │       ├── user.controller.js
│   │       ├── user.repository.js
│   │       └── user.routes.js
│   ├── helper/
│   │   ├── stockfish
│   │   └── stockfishAnalysis.js
│   └── middleware/
│       ├── auth.middleware.js
│       └── fileUpload.middleware.js
├── index.js
└── package.json
```

## API Endpoints

### Authentication

```
GET  /api/auth/me - Get current authenticated user
```

### User Routes

User management endpoints are defined in `src/features/users/user.routes.js`.

### Game Routes

Game management endpoints are defined in `src/features/games/game.routes.js`.

## Socket.io Events

### Connection Events

```
connection - Client connects to server
disconnect - Client disconnects from server
```

### Game Room Events

```
joinRoom - Join a game room
  Payload: { userId, roomId, color }
  
SendMove - Send a chess move
  Payload: { move, gameId, userId, roomId, timeLeft }
```

### Game Control Events

```
Draw - Offer a draw to opponent
  Payload: { roomId }
  
DrawAccepted - Accept draw offer
  Payload: { roomId, gameId }
  
DrawDeclined - Decline draw offer
  Payload: { roomId }
  
Resign - Resign from the game
  Payload: { roomId }
```

### Video Call Events

```
offer - WebRTC offer signal
answer - WebRTC answer signal
ice-candidate - ICE candidate exchange
```

### Chat Events

```
sendMessage - Send chat message
  Payload: { roomId, message, userId }
  
receiveMessage - Receive chat message
```

## AI Commentary System

The server integrates Google Generative AI (Gemini) to provide dynamic chess commentary in three distinct modes:

1. **Roast Mode**: Humorous and playful commentary with witty observations
2. **Hype Mode**: Enthusiastic and encouraging commentary celebrating moves
3. **Beginner Mode**: Educational commentary explaining strategies and concepts

Commentary is generated based on move quality, game position, and context.

## Stockfish Integration

The server uses Stockfish chess engine for:

- Move validation and legality checking
- Position evaluation and analysis
- Move quality assessment (Brilliant, Great, Good, Inaccuracy, Mistake, Blunder)
- Best move suggestions
- Game state evaluation

## Database Models

### User Schema
- Username, email, password (hashed)
- Profile picture
- Authentication tokens
- Player statistics

### Game Schema
- Player references (white and black)
- Move history
- Game status (ongoing, finished)
- Time controls
- Winner information
- Timestamps

### Result Schema
- Game outcome tracking
- Player performance metrics

## CORS Configuration

The server is configured to accept requests from:
- https://chesswith-benefits-client.vercel.app
- http://localhost:5173
- http://127.0.0.1:5173

Update CORS settings in `index.js` to add additional allowed origins.

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Related Repositories

- Frontend Client: [ChesswithBenefits-Client](https://github.com/AkshatGarg952/ChesswithBenefits-Client)

## License

This project is licensed under the MIT License.

## Contact

- GitHub: [@AkshatGarg952](https://github.com/AkshatGarg952)
- Email: gargakshat952@gmail.com
