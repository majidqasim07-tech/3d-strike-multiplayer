const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const players = new Map();
const ARENA = 28;
const MAX_HP = 100;

function roomFor(code) {
  if (!rooms.has(code)) rooms.set(code, new Set());
  return rooms.get(code);
}
function publicRoom() { return "PUBLIC"; }
function cleanName(name) {
  return String(name || "Player").replace(/[^\w -]/g, "").trim().slice(0, 16) || "Player";
}
function snapshot(code) {
  const ids = rooms.get(code) || new Set();
  return [...ids].map(id => {
    const p = players.get(id);
    if (!p) return null;
    return { id, name: p.name, x: p.x, y: p.y, z: p.z, yaw: p.yaw, hp: p.hp, score: p.score, alive: p.alive };
  }).filter(Boolean);
}
function broadcastRoom(code) {
  io.to(code).emit("state", snapshot(code));
}

io.on("connection", socket => {
  socket.on("join", ({ name, mode, roomCode } = {}) => {
    if (players.has(socket.id)) return;
    let code = mode === "private"
      ? String(roomCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
      : publicRoom();
    if (mode === "private" && code.length < 4) {
      socket.emit("join-error", "Enter a private room code with at least 4 characters.");
      return;
    }
    const ids = roomFor(code);
    if (ids.size >= 10) {
      socket.emit("join-error", "This room is full (10 players maximum).");
      return;
    }
    const p = {
      name: cleanName(name), room: code,
      x: (Math.random() - .5) * 12, y: 1.7, z: (Math.random() - .5) * 12,
      yaw: 0, hp: MAX_HP, score: 0, alive: true, lastShot: 0
    };
    players.set(socket.id, p);
    ids.add(socket.id);
    socket.join(code);
    socket.emit("joined", { id: socket.id, room: code, private: code !== "PUBLIC" });
    broadcastRoom(code);
    socket.to(code).emit("notice", `${p.name} joined the match.`);
  });

  socket.on("move", data => {
    const p = players.get(socket.id);
    if (!p || !p.alive || !data) return;
    const x = Number(data.x), z = Number(data.z), yaw = Number(data.yaw);
    if (![x,z,yaw].every(Number.isFinite)) return;
    p.x = Math.max(-ARENA, Math.min(ARENA, x));
    p.z = Math.max(-ARENA, Math.min(ARENA, z));
    p.yaw = yaw;
    broadcastRoom(p.room);
  });

  socket.on("shoot", data => {
    const p = players.get(socket.id);
    if (!p || !p.alive) return;
    const now = Date.now();
    if (now - p.lastShot < 180) return;
    p.lastShot = now;
    const dx = Number(data?.dx), dz = Number(data?.dz);
    if (![dx,dz].every(Number.isFinite)) return;
    const len = Math.hypot(dx,dz) || 1;
    const vx = dx/len, vz = dz/len;
    const ids = rooms.get(p.room) || new Set();
    let hit = null, best = 34;
    for (const id of ids) {
      if (id === socket.id) continue;
      const target = players.get(id);
      if (!target || !target.alive) continue;
      const rx = target.x - p.x, rz = target.z - p.z;
      const along = rx*vx + rz*vz;
      if (along < 0 || along > 34) continue;
      const perpendicular = Math.abs(rx*vz - rz*vx);
      if (perpendicular < 1.05 && along < best) { best = along; hit = target; }
    }
    if (hit) {
      hit.hp = Math.max(0, hit.hp - 34);
      io.to(p.room).emit("hit", { shooter: p.name, target: hit.name, hp: hit.hp });
      if (hit.hp === 0) {
        p.score += 1;
        hit.alive = false;
        io.to(p.room).emit("kill", { killer: p.name, victim: hit.name });
        setTimeout(() => {
          const current = players.get([...ids].find(id => players.get(id) === hit));
          if (current) { current.hp = MAX_HP; current.alive = true; current.x = (Math.random()-.5)*12; current.z = (Math.random()-.5)*12; broadcastRoom(p.room); }
        }, 2500);
      }
      broadcastRoom(p.room);
    }
    io.to(p.room).emit("shot", { id: socket.id, x: p.x, z: p.z, dx: vx, dz: vz });
  });

  socket.on("disconnect", () => {
    const p = players.get(socket.id);
    if (!p) return;
    const code = p.room;
    players.delete(socket.id);
    const ids = rooms.get(code);
    if (ids) {
      ids.delete(socket.id);
      if (!ids.size) rooms.delete(code);
      else { socket.to(code).emit("notice", `${p.name} left the match.`); broadcastRoom(code); }
    }
  });
});

server.listen(PORT, () => console.log(`3D Strike running on port ${PORT}`));