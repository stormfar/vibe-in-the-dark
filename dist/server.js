"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const socket_io_1 = require("socket.io");
const gameState_1 = require("./lib/gameState");
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = (0, next_1.default)({ dev, hostname, port });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    const httpServer = (0, http_1.createServer)(async (req, res) => {
        try {
            const parsedUrl = (0, url_1.parse)(req.url, true);
            await handle(req, res, parsedUrl);
        }
        catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_WS_URL,
            methods: ['GET', 'POST'],
        },
    });
    // Make io globally available
    global.io = io;
    // Socket.io connection handling
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        // Handle game join
        socket.on('game:join', ({ gameCode, participantId }) => {
            console.log(`Participant ${participantId} joining game code ${gameCode}`);
            // Join the game room
            socket.join(gameCode);
            // Update participant socket ID
            (0, gameState_1.updateParticipantSocket)(gameCode, participantId, socket.id);
            // Send current game state
            const game = (0, gameState_1.getGame)(gameCode);
            if (game) {
                socket.emit('game:state', game);
            }
        });
        // Handle admin join
        socket.on('admin:join', (gameCode) => {
            console.log(`Admin joining game code ${gameCode}`);
            socket.join(gameCode);
            const game = (0, gameState_1.getGame)(gameCode);
            if (game) {
                console.log(`Game found, sending state to admin`);
                socket.emit('game:state', game);
            }
            else {
                console.log(`Game code ${gameCode} not found!`);
                socket.emit('game:error', { message: 'Game not found. It may have been deleted or the server was restarted.' });
            }
        });
        // Handle voter join
        socket.on('voter:join', (gameCode) => {
            console.log(`Voter joining game code ${gameCode}`);
            socket.join(gameCode);
            const game = (0, gameState_1.getGame)(gameCode);
            if (game) {
                socket.emit('game:state', game);
            }
        });
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
    httpServer
        .once('error', (err) => {
        console.error(err);
        process.exit(1);
    })
        .listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
