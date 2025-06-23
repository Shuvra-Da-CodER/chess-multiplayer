const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { randomUUID } = require("crypto");

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "https://chess-frontend-se5i.onrender.com", 
  methods: ["GET", "POST"],
}));
const io = new Server(server, {
  cors: {
    origin: "https://chess-frontend-se5i.onrender.com", // frontend origin
    methods: ["GET", "POST"],
  },
});
// In-memory game state store
const gameStates = {};
const rooms = new Map();
const playerSocketMap = new Map(); // Map to track which socket belongs to which player in which room

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("create-room", () => {
    const roomID = randomUUID().slice(0, 6);
    rooms.set(roomID, [socket.id]);
    playerSocketMap.set(socket.id, { roomID, player: "white" });
    socket.join(roomID);
    socket.emit("room-created", { roomID, player: "white" });
  });

  socket.on("join-room", (roomID) => {
    const room = rooms.get(roomID);

    if (!room) return socket.emit("error-message", "Room not found.");
    if (room.length >= 2) return socket.emit("error-message", "Room full.");

    room.push(socket.id);
    playerSocketMap.set(socket.id, { roomID, player: "black" });
    socket.join(roomID);
    socket.emit("room-joined", { roomID, player: "black" });

    if (room.length === 2) {
      console.log(`✅ Both players joined room ${roomID}`);
      io.to(roomID).emit("both-joined");
    }
  });

  socket.on("start-game", (roomID) => {
    io.to(roomID).emit("game-start");
  });

  socket.on("move", ({ roomID, move, fen }) => {
    socket.to(roomID).emit("move", move); // 👈 exclude sender
    gameStates[roomID] = fen;
    console.log("received at server ", move);
  });
  socket.on("requestGameState", (roomID) => {
    const fen = gameStates[roomID];
    socket.emit("gameState", fen);
  });

  socket.on("giveUp", ({ roomID, playerColor }) => {
    io.to(roomID).emit("opponentGaveUp", playerColor);
    delete gameStates[roomID];
  });

  socket.on("sendMessage", ({ roomID, sender, message }) => {
    io.to(roomID).emit("receiveMessage", {
      sender,
      message,
      timestamp: new Date().toISOString(),
    });
  });
  
  socket.on("rematch", (roomID) => {
    // Clear old game state
    delete gameStates[roomID];

    // Notify both players to reset their board
    io.to(roomID).emit("rematchStarted");
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    
    const playerInfo = playerSocketMap.get(socket.id);
    if (playerInfo) {
      const { roomID, player } = playerInfo;
      const room = rooms.get(roomID);
      
      if (room) {
        // Remove the disconnected socket from the room
        const updatedRoom = room.filter(id => id !== socket.id);
        rooms.set(roomID, updatedRoom);
        
        // Notify the remaining player about the disconnection
        socket.to(roomID).emit("opponentDisconnected", player);
        
        // If room is empty, clean it up
        if (updatedRoom.length === 0) {
          rooms.delete(roomID);
          delete gameStates[roomID];
        }
      }
      
      // Clean up player mapping
      playerSocketMap.delete(socket.id);
    }
  });
});

server.listen(3000, () => console.log("Server on http://localhost:3000"));
