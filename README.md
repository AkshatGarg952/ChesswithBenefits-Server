# Chess with Benefits - Backend

The backend server for Chess with Benefits, providing real-time game state management, video call signaling, AI commentary generation, move analysis using Stockfish, and comprehensive game analytics.

## Features

* **Real-time Game Management**: WebSocket-based architecture using Socket.io for instant game state synchronization and multiplayer functionality.
* **Video Call Signaling**: WebRTC signaling server implementation for peer-to-peer video connections between players.
* **Stockfish Integration**: Professional chess engine integration for move analysis, categorization, and skill assessment.
* **AI Commentary Generation**: Dynamic commentary system supporting three modes (Roast, Hype, Beginner) with context-aware responses.
* **Voice Command Processing**: Backend processing and validation of voice-based chess moves.
* **Match Analytics**: Comprehensive statistics tracking including move accuracy, game outcomes, and player performance metrics.
* **Real-time Chat**: Instant messaging infrastructure with message persistence and history.
* **User Authentication**: Secure JWT-based authentication and session management.

## Demo

* Backend API: [API Endpoint](https://your-backend-url.com)
* API Documentation: [Swagger/Postman Docs](link-to-docs)

## Installation

To run Chess with Benefits backend locally, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/AkshatGarg952/ChesswithBenefits-Server
cd ChesswithBenefits-Server
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Install Stockfish:

```bash
# For Linux/Mac
brew install stockfish
# or download from https://stockfishchess.org/download/

# For Windows
# Download and add to PATH
```

4. Set Up Environment Variables

Create a `.env` file in the root directory using the provided `.env.example`:

```env
PORT=8000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chess_with_benefits

# JWT Secrets
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Stockfish
STOCKFISH_PATH=/usr/local/bin/stockfish

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# AI Commentary API (if using external AI)
AI_API_KEY=your_ai_api_key
AI_API_URL=https://api.openai.com/v1
```

5. Run Database Migrations:

```bash
npx prisma migrate dev
# or
npm run migrate
```

6. Seed the database (optional):

```bash
npm run seed
```

7. Start the development server:

```bash
npm run dev
# or
yarn dev
```

The server will start on `http://localhost:8000`

## Tech Stack

| Component | Tools & Technologies |
|-----------|---------------------|
| **Server Framework** | Node.js, Express |
| **Real-time Communication** | Socket.io, WebRTC |
| **Database** | PostgreSQL, Prisma ORM |
| **Chess Engine** | Stockfish |
| **Authentication** | JWT, bcrypt |
| **AI Integration** | OpenAI API / Custom NLP |
| **Validation** | Zod / Joi |
| **Deployment** | Render / AWS / Railway |

## Project Structure

```
ChesswithBenefits-Server/
├── src/
│   ├── controllers/
│   │   ├── gameController.js
│   │   ├── userController.js
│   │   └── analyticsController.js
│   ├── services/
│   │   ├── stockfishService.js
│   │   ├── commentaryService.js
│   │   └── videoCallService.js
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── socket/
│   │   ├── gameSocket.js
│   │   ├── chatSocket.js
│   │   └── videoSocket.js
│   └── utils/
├── prisma/
│   └── schema.prisma
└── package.json
```

## API Endpoints

### Authentication
```
POST   /api/auth/register       - Register new user
POST   /api/auth/login          - User login
POST   /api/auth/refresh        - Refresh JWT token
```

### Game Management
```
POST   /api/games/create        - Create new game room
GET    /api/games/:id           - Get game details
POST   /api/games/:id/move      - Submit a move
GET    /api/games/:id/analysis  - Get Stockfish analysis
```

### Analytics
```
GET    /api/analytics/user/:id  - Get user statistics
GET    /api/analytics/matches   - Get match history
GET    /api/analytics/moves     - Get aggregated move data
```

### Commentary
```
POST   /api/commentary/generate - Generate commentary for a move
PUT    /api/commentary/mode     - Update commentary mode
```

## WebSocket Events

### Game Events
```
game:join          - Join a game room
game:move          - Send a chess move
game:update        - Receive game state updates
game:end           - Game ended
```

### Video Call Events
```
video:offer        - WebRTC offer
video:answer       - WebRTC answer
video:ice-candidate - ICE candidate exchange
```

### Chat Events
```
chat:message       - Send/receive messages
chat:typing        - Typing indicator
```

## Stockfish Integration

The backend integrates Stockfish for:
- Move validation and legality checking
- Position evaluation and best move suggestions
- Move categorization (Brilliant, Great, Good, Inaccuracy, Mistake, Blunder)
- Opening book identification
- Endgame tablebase queries

## Commentary System

Three distinct commentary modes powered by AI:

1. **Roast Mode**: Witty, sarcastic commentary with chess humor
2. **Hype Mode**: Enthusiastic, motivational commentary
3. **Beginner Mode**: Educational explanations and strategic insights

## Database Schema

Key models include:
- **User**: Player profiles and authentication
- **Game**: Match records and game state
- **Move**: Individual move history with analysis
- **Statistics**: Aggregated player performance data
- **Chat**: Message history and chat logs

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- --grep "Stockfish"
```

## Related Repositories

* Frontend Client: [ChesswithBenefits-Client](https://github.com/AkshatGarg952/ChesswithBenefits-Client)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any questions or suggestions, feel free to reach out:

* GitHub: [@AkshatGarg952](https://github.com/AkshatGarg952)
* Email: your-email@example.com

---

Built with ♟️ and WebSockets
