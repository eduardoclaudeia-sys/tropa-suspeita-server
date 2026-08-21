const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 10000;
const NETLIFY_ORIGIN = 'https://meinhastreetamong.netlify.app';

const io = new Server(server, {
  cors: {
    origin: [NETLIFY_ORIGIN],
    methods: ['GET', 'POST']
  },
  pingInterval: 25000,
  pingTimeout: 20000
});

const rooms = new Map();
const MAX_PLAYERS = 8;

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function sanitizeName(value) {
  return String(value || 'Jogador').trim().slice(0, 18) || 'Jogador';
}

function getPublicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    started: room.started,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      character: p.character,
      ready: p.ready,
      alive: p.alive,
      host: p.id === room.hostId
    }))
  };
}

function emitRoom(room) {
  io.to(room.code).emit('room_state', getPublicRoom(room));
}

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    game: 'Tropa Suspeita',
    service: 'multiplayer-server',
    status: 'online'
  });
});

app.get('/health', (_req, res) => res.status(200).send('OK'));

io.on('connection', (socket) => {
  console.log('conectado', socket.id);

  socket.on('create_room', ({ name, character } = {}, reply = () => {}) => {
    const code = makeRoomCode();
    const room = {
      code,
      hostId: socket.id,
      started: false,
      players: new Map()
    };

    room.players.set(socket.id, {
      id: socket.id,
      name: sanitizeName(name),
      character: String(character || 'bob'),
      ready: true,
      alive: true,
      role: null
    });

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    reply({ ok: true, code });
    emitRoom(room);
  });

  socket.on('join_room', ({ code, name, character } = {}, reply = () => {}) => {
    const normalizedCode = String(code || '').trim().toUpperCase();
    const room = rooms.get(normalizedCode);

    if (!room) return reply({ ok: false, error: 'Sala não encontrada.' });
    if (room.started) return reply({ ok: false, error: 'A partida já começou.' });
    if (room.players.size >= MAX_PLAYERS) return reply({ ok: false, error: 'Sala cheia.' });

    room.players.set(socket.id, {
      id: socket.id,
      name: sanitizeName(name),
      character: String(character || 'bob'),
      ready: true,
      alive: true,
      role: null
    });

    socket.join(room.code);
    socket.data.roomCode = room.code;
    reply({ ok: true, code: room.code });
    emitRoom(room);
  });

  socket.on('chat_message', ({ text } = {}) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    const player = room?.players.get(socket.id);
    if (!room || !player) return;

    const safeText = String(text || '').trim().slice(0, 140);
    if (!safeText) return;

    io.to(code).emit('chat_message', {
      playerId: player.id,
      name: player.name,
      text: safeText,
      at: Date.now()
    });
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    room.players.delete(socket.id);

    if (room.players.size === 0) {
      rooms.delete(code);
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = room.players.keys().next().value;
    }

    emitRoom(room);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tropa Suspeita server online na porta ${PORT}`);
});
