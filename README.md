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

Create a `.env` file in the root directory based on `.env.example` (see that file for the full, current list of variables — `PORT_NO`, `CORS_ORIGIN`, `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `CLOUDINARY_*`, `TRUST_PROXY`, and optional `STOCKFISH_DEPTH`/`STOCKFISH_TIMEOUT_MS`). Only `MONGODB_URI` and `JWT_SECRET` are required — the server fails fast at startup if either is missing.

Set `TRUST_PROXY=true` only when the server runs behind a proxy or load balancer; the rate limiters need real client IPs, and trusting the header without a proxy in front lets clients forge them.

4. Start the development server:

```bash
npm run dev
```

The server will start on the port specified in your `.env` file (default: 3000).

## Project Structure

```
ChesswithBenefits-Server/
├── index.js                      # thin entry point, imports src/server.js
└── src/
    ├── app.js                    # Express app (middleware, routes, error handling)
    ├── server.js                 # bootstraps DB connection, HTTP server, Socket.IO, listen
    ├── config/
    │   └── env.js                # loads + validates env vars at startup
    ├── database/
    │   └── mongoose.js
    ├── sockets/                  # all real-time logic (moves, chat, WebRTC signaling)
    │   ├── index.js              # handshake auth + connection/disconnect wiring
    │   ├── rooms.store.js
    │   ├── game.lock.js          # per-game serialisation of state changes
    │   ├── game.socket.js
    │   ├── chat.socket.js
    │   └── webrtc.socket.js
    ├── features/
    │   ├── auth/                 # GET /api/auth/me
    │   ├── commentary/           # POST /api/commentary (Gemini)
    │   ├── games/                # game stats REST endpoints
    │   └── users/                # register/login/details/update
    ├── middleware/
    │   ├── jwt.auth.js
    │   ├── multer.middleware.js
    │   ├── validate.js
    │   ├── validateObjectId.js
    │   └── error.middleware.js
    ├── helper/
    │   └── analyse.js            # Stockfish-based move quality analysis
    └── utils/
        ├── logger.js
        ├── asyncHandler.js
        └── appError.js
```

## API Endpoints

### Health

```
GET  /health - Liveness/readiness check
```

### Authentication

```
GET  /api/auth/me - Get current authenticated user (requires Bearer token)
```

All protected routes take the JWT as `Authorization: Bearer <token>`. Missing
tokens get a 401, invalid ones a 403.

### Commentary

```
POST /api/commentary - Generate AI commentary (requires Bearer token)
  Body: { prompt: { mode, move, fen, lastMoves?, isUserMove? } }
```

Every call spends a Gemini request, so the route is authenticated and rate
limited per user (30/minute).

### User Routes

User management endpoints are defined in `src/features/users/user.routes.js`.

### Game Routes

Game management endpoints are defined in `src/features/games/game.routes.js`.
Statistics are personal — a token only grants access to its own user's stats,
and any other id returns 403.

## Socket.io Events

### Connection Events

```
connection - Client connects to server
disconnect - Client disconnects from server
```

Every socket must present a JWT during the handshake:

```js
io(SERVER_URL, { auth: (cb) => cb({ token: yourJwt }) });
```

The handshake is rejected outright without a valid token, and the identity it
carries is the only one the server trusts. Events never take a `userId` — one in
a payload would just be a claim, and would let any client move, resign, or accept
draws on another player's behalf.

### Game Room Events

```
joinRoom - Join a game room
  Payload: { roomId, color }        // color: 'white' | 'black' | 'random'

SendMove - Send a chess move
  Payload: { move, gameId, roomId }

receiveMove - Broadcast of an accepted move (server → all players in the room,
              the mover included, so it doubles as the authoritative state)
  Payload: { by, move, fen, gameStatus, winner, allMoves, whiteTimeLeft, blackTimeLeft }

moveRejected - The move was refused (server → mover only)
  Payload: { error }
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
  Payload: { roomId, gameId }

claimTimeout - Ask the server to end a game whose clock has run out
  Payload: { roomId, gameId }

gameOver - The game ended (server → each player, from their own point of view)
  Payload: { reason, status: 'win' | 'lose' | 'draw', winner }
```

Clocks are authoritative on the server: elapsed time is charged to whichever
side the move list says is on move, and `claimTimeout` is re-verified against
`lastMoveTimestamp` before it ends anything.

Everything that mutates a game (`SendMove`, `Resign`, `DrawAccepted`,
`claimTimeout`) is serialised per game id by `src/sockets/game.lock.js`. Each of
those handlers loads the document, replays the moves and saves; letting two run
at once means the second reads state the first has not written yet, which shows
up as a legal move being rejected as "Not your turn!". The queue is in-process,
like the room registry — running more than one server instance would need a
shared lock.

### Video Call Events (WebRTC signaling relay)

```
call-user - WebRTC offer signal
  Payload: { targetSocketId, offer }

answer-call - WebRTC answer signal
  Payload: { targetSocketId, answer }

ice-candidate - ICE candidate exchange
  Payload: { targetSocketId, candidate }
```

`targetSocketId` must be the opponent in the room this socket joined; signaling
aimed anywhere else is dropped.

### Chat Events

```
SendMessage - Send chat message
  Payload: { roomId, message }        // only relayed into the room you joined

ReceiveMessage - Receive chat message
  Payload: { message, time }          // time is an ISO-8601 string
```

## AI Commentary System

The server integrates Google Generative AI (Gemini) to provide dynamic chess commentary in three distinct modes:

1. **Roast Mode**: Humorous and playful commentary with witty observations
2. **Hype Mode**: Enthusiastic and encouraging commentary celebrating moves
3. **Beginner Mode**: Educational commentary explaining strategies and concepts

Commentary is generated based on move quality, game position, and context.

## Stockfish Integration

Move *legality* is chess.js's job. Stockfish is used only to grade moves, in
`src/helper/analyse.js`:

- The position before the move and the position after it are each evaluated.
- UCI reports `score cp` from the perspective of the side to move, and that side
  flips across the move — so the loss is `evalBefore + evalAfter`, not the
  difference between them.
- The centipawn loss maps to Best (<50), Good (<100), Inaccurate (<300),
  Mistake (<600), Blunder (≥600). A near-best move that also gives up material
  the opponent can immediately take is upgraded to Brilliant — a deliberately
  simple heuristic, not an engine verdict.

Grading runs *after* the move is broadcast, so a search never delays the
opponent seeing the move, and the result is written back with `$inc`. If the
engine is unavailable or times out, no quality is recorded at all — counting
unanalysed moves as "Good" would quietly inflate a player's statistics.

Depth and timeout are tunable via `STOCKFISH_DEPTH` / `STOCKFISH_TIMEOUT_MS`.

## Database Models

### User Schema
- Username, email, password (bcrypt-hashed, never serialised in responses)
- Profile image URL (Cloudinary)
- `createdAt` / `updatedAt` timestamps

### Game Schema
- Player references (white and black)
- Move history (SAN)
- Game status: `onGoing`, `finished`, `draw`, `noResult`
- Per-player move-quality counters (Brilliant, Best, Good, Inaccurate, Mistake, Blunder)
- Clocks (`whiteTimeLeft` / `blackTimeLeft`), `turn`, `lastMoveTimestamp`
- Winner reference, `createdAt` / `updatedAt` timestamps

## CORS Configuration

Allowed origins are read from the comma-separated `CORS_ORIGIN` environment variable (falls back to the Vercel deployment + local dev origins if unset). Update `.env` to add additional allowed origins — no code changes needed.

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
