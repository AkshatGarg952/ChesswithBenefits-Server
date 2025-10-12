# ♟️ Chess with Benefits - Backend

> Powerful backend server for real-time chess with Stockfish analysis and AI commentary

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4+-blue)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4+-black)](https://socket.io/)

## 🎯 Overview

This is the backend server for Chess with Benefits, a real-time multiplayer chess platform. The server handles game logic, real-time communication, move analysis via Stockfish, AI-powered commentary using OpenAI, user authentication, and statistics tracking.

**Frontend Repository:** [ChesswithBenefits-Client](https://github.com/AkshatGarg952/ChesswithBenefits-Client)

## ✨ Features

### 🎮 Game Management
- **Real-time Multiplayer** - WebSocket-based real-time game state synchronization
- **Private Room System** - Create and manage private game rooms
- **Game State Management** - Complete game state tracking and validation
- **Chess Rules Validation** - Server-side move validation and rule enforcement

### 🔍 Move Analysis
- **Stockfish Integration** - Professional-grade chess engine for move analysis
- **Move Classification** - Categorizes moves as brilliant, best, good, inaccuracy, mistake, or blunder
- **Position Evaluation** - Real-time position evaluation and scoring
- **Best Move Suggestions** - Provides optimal move recommendations

### 🤖 AI Commentary System
Three distinct commentary modes powered by OpenAI:
- **Hype Mode** - Energetic, exciting commentary that amplifies the drama
- **Roast Mode** - Witty, humorous commentary that playfully criticizes moves
- **Beginner Mode** - Educational, instructive commentary for learning players

### 💬 Real-time Communication
- **Socket.io Integration** - Bi-directional real-time event-based communication
- **Chat System** - Real-time messaging between players
- **WebRTC Signaling** - Handles peer-to-peer connection establishment for video calls
- **Room Broadcasting** - Efficient room-based message broadcasting

### 📊 Statistics & Analytics
- **Game History** - Complete game records with move history
- **User Statistics** - Track wins, losses, draws, and total games
- **Move Statistics** - Detailed breakdown of move quality
- **Performance Metrics** - Player rating and performance tracking
- **Dashboard API** - RESTful endpoints for retrieving user statistics

### 🔐 Authentication & Security
- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt password encryption
- **Protected Routes** - Middleware-based route protection
- **Session Management** - Secure session handling
- **CORS Configuration** - Proper cross-origin resource sharing setup

## 🛠️ Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Real-time:** Socket.io
- **Chess Engine:** Stockfish
- **AI:** OpenAI GPT API
- **Authentication:** JWT, Bcrypt
- **WebRTC:** Simple-peer (signaling)

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js >= 18.x
- MongoDB (local or Atlas)
- Stockfish chess engine installed
- OpenAI API key
- npm or yarn

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/AkshatGarg952/ChesswithBenefits-Server.git
cd ChesswithBenefits-Server
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Install Stockfish

**macOS:**
```bash
brew install stockfish
```

**Ubuntu/Debian:**
```bash
sudo apt-get install stockfish
```

**Windows:**
Download from [Stockfish website](https://stockfishchess.org/download/)

### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/chess-with-benefits
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chess-with-benefits

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# Stockfish Configuration
STOCKFISH_PATH=/usr/local/bin/stockfish
# Windows: C:\\path\\to\\stockfish.exe

# CORS Configuration
FRONTEND_URL=http://localhost:5173
# Production: https://chesswith-benefits-client.vercel.app

# WebRTC Configuration (Optional)
TURN_SERVER_URL=
TURN_USERNAME=
TURN_CREDENTIAL=
```

### 5. Run Development Server

```bash
npm run dev
# or
yarn dev
```

The server will start on `http://localhost:5000`

### 6. Run Production Server

```bash
npm start
# or
yarn start
```

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register        # Register new user
POST   /api/auth/login           # Login user
GET    /api/auth/me              # Get current user
PUT    /api/auth/update          # Update user profile
```

### Game Management
```
POST   /api/games/create         # Create new game room
GET    /api/games/:roomId        # Get game details
POST   /api/games/:roomId/join   # Join game room
POST   /api/games/:roomId/move   # Make a move
GET    /api/games/:roomId/moves  # Get move history
DELETE /api/games/:roomId        # Delete game
```

### Statistics
```
GET    /api/stats/user/:userId   # Get user statistics
GET    /api/stats/games          # Get user's game history
GET    /api/stats/dashboard      # Get dashboard data
```

### Analysis
```
POST   /api/analysis/position    # Analyze chess position
POST   /api/analysis/move        # Analyze specific move
GET    /api/analysis/best-move   # Get best move suggestion
```

## 🔌 Socket.io Events

### Client → Server
```javascript
'join-room'              // Join a game room
'leave-room'             // Leave a game room
'make-move'              // Make a chess move
'send-message'           // Send chat message
'request-commentary'     // Request AI commentary
'offer'                  // WebRTC offer signal
'answer'                 // WebRTC answer signal
'ice-candidate'          // WebRTC ICE candidate
```

### Server → Client
```javascript
'room-joined'            // Confirmation of room join
'player-joined'          // Another player joined
'player-left'            // Player left the room
'move-made'              // Move was made
'game-over'              // Game ended
'message-received'       // New chat message
'commentary'             // AI commentary response
'move-analysis'          // Stockfish analysis result
'offer'                  // WebRTC offer from peer
'answer'                 // WebRTC answer from peer
'ice-candidate'          // ICE candidate from peer
'error'                  // Error occurred
```

## 📁 Project Structure

```
ChesswithBenefits-Server/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # MongoDB connection
│   │   ├── stockfish.js     # Stockfish setup
│   │   └── openai.js        # OpenAI configuration
│   ├── controllers/         # Route controllers
│   │   ├── authController.js
│   │   ├── gameController.js
│   │   ├── statsController.js
│   │   └── analysisController.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # JWT authentication
│   │   ├── validation.js    # Request validation
│   │   └── errorHandler.js  # Error handling
│   ├── models/              # MongoDB models
│   │   ├── User.js
│   │   ├── Game.js
│   │   └── Move.js
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   ├── games.js
│   │   ├── stats.js
│   │   └── analysis.js
│   ├── services/            # Business logic
│   │   ├── stockfishService.js
│   │   ├── commentaryService.js
│   │   ├── gameService.js
│   │   └── statsService.js
│   ├── socket/              # Socket.io handlers
│   │   ├── gameHandlers.js
│   │   ├── chatHandlers.js
│   │   └── webrtcHandlers.js
│   ├── utils/               # Utility functions
│   │   ├── moveClassifier.js
│   │   ├── validator.js
│   │   └── logger.js
│   └── app.js               # Express app setup
├── tests/                   # Test files
├── .env                     # Environment variables
├── .gitignore
├── package.json
└── server.js                # Entry point
```

## 🎲 Stockfish Integration

The server uses Stockfish for move analysis. Key features:

- **Position Evaluation:** Evaluates any chess position
- **Move Classification:** Categorizes moves based on evaluation difference
- **Best Move Calculation:** Provides optimal moves for any position
- **Depth Configuration:** Configurable analysis depth for performance tuning

### Move Classification Logic
```javascript
Brilliant:    Evaluation improves by > 3.0
Best:         Evaluation improves by > 1.0
Good:         Evaluation changes by ±0.5
Inaccuracy:   Evaluation worsens by 0.5-1.5
Mistake:      Evaluation worsens by 1.5-3.0
Blunder:      Evaluation worsens by > 3.0
```

## 🤖 AI Commentary System

The commentary system uses OpenAI's GPT models with custom prompts for each mode:

### Implementation
```javascript
// Example commentary request
const commentary = await generateCommentary({
  mode: 'hype',           // 'hype', 'roast', or 'beginner'
  move: 'Nf3',
  evaluation: 0.5,
  classification: 'good',
  position: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R'
});
```

Each mode uses specially crafted system prompts to maintain consistent personality and style.

## 🔒 Security Best Practices

- All passwords are hashed using bcrypt
- JWT tokens expire after configured duration
- Input validation on all endpoints
- Rate limiting on authentication endpoints
- CORS properly configured for frontend origin
- MongoDB injection protection via Mongoose
- Environment variables for sensitive data

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📈 Performance Optimization

- Connection pooling for MongoDB
- Stockfish process management
- Socket.io room-based broadcasting
- Efficient game state caching
- Indexed database queries
- Compressed WebSocket messages

## 🐛 Debugging

Enable debug mode in `.env`:
```env
DEBUG=socket.io*,stockfish,game
NODE_ENV=development
```

View logs:
```bash
npm run dev
```

## 🚀 Deployment

### Using Heroku
```bash
heroku create chess-with-benefits-server
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set OPENAI_API_KEY=your_openai_key
git push heroku main
```

### Using Railway/Render
1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy automatically on push

### Using Docker
```dockerfile
# Dockerfile included in repository
docker build -t chess-backend .
docker run -p 5000:5000 chess-backend
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Akshat Garg**
- GitHub: [@AkshatGarg952](https://github.com/AkshatGarg952)

## 🔗 Related Links

- [Frontend Repository](https://github.com/AkshatGarg952/ChesswithBenefits-Client)
- [Live Demo](https://chesswith-benefits-client.vercel.app/)

## 🙏 Acknowledgments

- Stockfish team for the powerful chess engine
- OpenAI for GPT API
- Socket.io for real-time communication
- MongoDB team for the excellent database

## 📞 Support

For support, email your-email@example.com or open an issue in the GitHub repository.

## 🗺️ Roadmap

- [ ] Tournament system
- [ ] ELO rating system
- [ ] Puzzle mode
- [ ] Game replay with commentary
- [ ] Mobile app support
- [ ] Multiple language support

---

Made with ♟️ and ❤️ by Akshat Garg
