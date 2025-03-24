const http = require("http");
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const cors = require("cors");


let roomUsers = {};
let availableRooms = ["General", "Gaming", "Technical"];

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A new user has connected", socket.id);

  let currentRoom = "";
  let currentUsername = "";
  
  socket.emit("abailableRooms", availableRooms);

  socket.on("getAvailableRooms", () => {
    socket.emit("availableRooms", availableRooms);
  });
  
  // Check if username is taken
  socket.on("checkUsername", (room, username, callback) => {
    if (roomUsers[room] && roomUsers[room].includes(username)) {
      callback(true);
    } else {
      callback(false);
    }
  });
  
  // Handle joining a room
  socket.on("joinRoom", (room, username) => {
    if (currentRoom && currentRoom !== room) {
      socket.emit("message", {
        room: currentRoom,
        message: `${username} tried to join ${room}, but must leave their current room first.`,
        username: "System",
        timeStamp: new Date().toLocaleString(),
      });
      return;
    }
    
    currentRoom = room;
    currentUsername = username;
    if (!roomUsers[room]) roomUsers[room] = [];

    roomUsers[room].push(username);
    socket.join(room);
    
    socket.to(room).emit("message", {
      room,
      message: `${username} has joined the room.`,
      username: "System",
      timeStamp: new Date().toLocaleString(),
    });
  });
  
  // Handle creating a new room
  socket.on("createRoom", (newRoomName, callback) => {
    if (!availableRooms.includes(newRoomName)) {
      availableRooms.push(newRoomName);
      roomUsers[newRoomName] = [];
      io.emit("availableRooms", availableRooms);
      callback(true);
    } else {
      callback(false);
    }
  });
  
  // Handle message sending
  socket.on("userMessage", (data) => {
    const { room, message, username, timeStamp } = data;
    socket.to(room).emit("message", { room, message, username, timeStamp });
  });
  
  // Handle user disconnect
  socket.on("disconnect", () => {
    if (currentRoom) {
      roomUsers[currentRoom] = roomUsers[currentRoom].filter(
        (user) => user !== currentUsername
      );
      
      io.to(currentRoom).emit("message", {
        room: currentRoom,
        message: `${currentUsername} has left the room.`,
        username: "System",
        timeStamp: new Date().toLocaleString(),
      });
    }
  });
  
  // Handle leaving a room
  socket.on("leaveRoom", (room, username) => {
    if (roomUsers[room]) {
      roomUsers[room] = roomUsers[room].filter((user) => user !== username);
    }
    
    socket.leave(room);
    const timeStamp = new Date().toLocaleString();
    socket.to(room).emit("message", {
      room: room,
      message: `${username} has left the room.`,
      username: "System",
      timeStamp,
    });
  });
});

app.use(cors());

app.use(express.static(path.resolve(__dirname, "public")));

app.use("/socket.io", express.static(path.join(__dirname, "node_modules", "socket.io-client", "dist")));

app.get("/", (req, res) => {
  return res.sendFile(path.resolve(__dirname, "public", "index.html"));
});

server.listen(8080, '0.0.0.0', () => console.log("Server started at http://0.0.0.0:8080"));
