import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { getGame, updateParticipantSocket } from './lib/gameState';
import type { GameJoinPayload } from './lib/types';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_WS_URL,
      methods: ['GET', 'POST'],
    },
  });

  // Make io globally available
  (global as any).io = io;

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle game join
    socket.on('game:join', ({ gameCode, participantId }: GameJoinPayload) => {

      // Join the game room
      socket.join(gameCode);

      // Update participant socket ID
      updateParticipantSocket(gameCode, participantId, socket.id);

      // Send current game state
      const game = getGame(gameCode);
      if (game) {
        socket.emit('game:state', game);
      }
    });

    // Handle admin join
    socket.on('admin:join', (gameCode: string) => {
      socket.join(gameCode);

      const game = getGame(gameCode);
      if (game) {
        console.log(`Game found, sending state to admin`);
        socket.emit('game:state', game);
      } else {
        console.log(`Game code ${gameCode} not found!`);
        socket.emit('game:error', { message: 'Game not found. It may have been deleted or the server was restarted.' });
      }
    });

    // Handle voter join
    socket.on('voter:join', (gameCode: string) => {
      socket.join(gameCode);

      const game = getGame(gameCode);
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
