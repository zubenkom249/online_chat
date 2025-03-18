const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Зберігання підключених користувачів
const users = {};

// Обробка підключення клієнтів
io.on('connection', (socket) => {
    console.log('Користувач підключився:', socket.id);

    // Реєстрація користувача
    socket.on('register', (username) => {
        users[socket.id] = username;
        socket.broadcast.emit('user-connected', username);
        io.emit('update-users', Object.values(users));
    });

    // Обробка повідомлень
    socket.on('chat-message', (msg) => {
        io.emit('chat-message', {
            username: users[socket.id],
            message: msg,
            time: new Date().toLocaleTimeString()
        });
    });

    // Приватні повідомлення
    socket.on('private-message', ({ to, message }) => {
        const recipientId = Object.keys(users).find(id => users[id] === to);
        if (recipientId) {
            io.to(recipientId).emit('private-message', {
                from: users[socket.id],
                message: message,
                time: new Date().toLocaleTimeString()
            });
        }
    });

    // Підключення до кімнати
    socket.on('join-room', (room) => {
        socket.join(room);
        socket.emit('room-joined', room);
    });

    // Повідомлення в кімнату
    socket.on('room-message', ({ room, message }) => {
        io.to(room).emit('chat-message', {
            username: users[socket.id],
            message: message,
            time: new Date().toLocaleTimeString()
        });
    });

    // Обробка відключення
    socket.on('disconnect', () => {
        const username = users[socket.id];
        delete users[socket.id];
        socket.broadcast.emit('user-disconnected', username);
        io.emit('update-users', Object.values(users));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущено на порту ${PORT}`);
});