// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const messages = [];
const users = new Map();   

app.get("/api/messages", (req, res) => {
  const room = (req.query.room || "global").trim();
  const recent = messages.filter(m => m.room === room).slice(-50);
  res.json(recent);
});

app.get("/health", (_req, res) => res.json({ ok: true }));

io.on("connection", socket => {
  let current = { name: "Anonymous", room: "global" };

  socket.on("join", ({ name, room } = {}) => {
    current.name = (name || "Anonymous").trim().slice(0, 24);
    current.room = (room || "global").trim().slice(0, 24);
    users.set(socket.id, current);
    socket.join(current.room);

    socket.emit("init", {
      recent: messages.filter(m => m.room === current.room).slice(-50),
      room: current.room
    });

    io.to(current.room).emit("user:joined", {
      name: current.name,
      id: socket.id,
      users: getUsersInRoom(current.room)
    });
  });

  socket.on("chat:message", text => {
    if (typeof text !== "string" || !text.trim()) return;
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user: current.name,
      text: text.slice(0, 1000),
      room: current.room,
      ts: new Date().toISOString()
    };
    messages.push(msg);
    if (messages.length > 500) messages.shift();
    io.to(current.room).emit("chat:message", msg);
  });

  socket.on("typing", isTyping => {
    socket.to(current.room).emit("user:typing", {
      id: socket.id,
      name: current.name,
      typing: !!isTyping
    });
  });

  socket.on("disconnect", () => {
    const info = users.get(socket.id);
    if (info) {
      users.delete(socket.id);
      io.to(info.room).emit("user:left", {
        id: socket.id,
        name: info.name,
        users: getUsersInRoom(info.room)
      });
    }
  });
});

function getUsersInRoom(room) {
  return Array.from(users.values())
    .filter(u => u.room === room)
    .map(u => u.name);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
