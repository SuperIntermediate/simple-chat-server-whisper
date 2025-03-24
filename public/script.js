const socket = io();
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("message");
const allMessages = document.getElementById("messages");

let currentRoom = null;
let username = "";
let isInActiveRoom = true;

// Handle creating a new room
document.getElementById("createRoomBtn").addEventListener("click", () => {
  const newRoomName = document.getElementById("newRoomInput").value.trim();
  if (newRoomName) {
    socket.emit("createRoom", newRoomName, (success) => {
      if (success) {
        alert("New room created successfully!");
        document.getElementById("newRoomInput").value = "";
        updateRoomList();
      } else {
        alert("Room name already exists.");
      }
    });
  }
});

socket.on("availableRooms", (rooms) => {
  const roomList = document.getElementById("chatList");
  roomList.innerHTML = "";

  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.classList.add("room");
    li.textContent = room;
    li.onclick = () => joinRoom(room);
    roomList.appendChild(li);
  });
});

socket.emit("getAvailableRooms");

function confirmLeaveRoom() {
  if (!currentRoom || !username) {
    alert("You are not in any room!");
    return;
  }
  const confirmLeave = confirm("Do you really want to leave this room?");
  if (confirmLeave) {
    leaveRoom();
  }
}

sendBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (message) {
    socket.emit("userMessage", {
      room: currentRoom,
      message: message,
      username: username,
      timeStamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    messageInput.value = "";
  }
});

// parse message for basic text formatting
function parseMessage(message) {
  // Replace bold formatting (**bold** to <strong>bold</strong>)
  message = message.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Replace italics formatting (*italic* to <em>italic</em>)
  message = message.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // URLs into clickable links
  message = message.replace(/https?:\/\/[^\s]+/g, function (url) {
    return `<a href="${url}" target="_blank">${url}</a>`;
  });

  return message;
}

function getUsernameColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;
  return `rgb(${r % 256}, ${g % 256}, ${b % 256})`;
}

function joinRoom(roomName) {
  currentRoom = roomName;
  const roomTitle = document.getElementById("roomTitle");
  const chatSection = document.getElementById("chatSection");
  const leaveRoomBtn = document.getElementById("leaveRoomBtn");

  if (currentRoom && currentRoom !== roomName) {
    const confirmLeave = confirm(
      "You are already in the room. Do you want to leave current room and join the new one?"
    );
    if (confirmLeave) {
      leaveRoom();
    } else {
      return;
    }
  }
  if (!roomName) {
    alert("Please select a valid room to join!");
    return;
  }

  if (!username) {
    let usernameInput = prompt("Choose your name: ");
    if (!usernameInput.trim()) {
      alert("Username cannot be empty!");
      return;
    }

    socket.emit("checkUsername", roomName, usernameInput, (isTaken) => {
      if (isTaken) {
        alert("Username is already taken, please choose a different one!");
        joinRoom(roomName); 
      } else {
        username = usernameInput.trim();
        roomTitle.textContent = `Welcome to the ${roomName} room, ${username}!`;
        socket.emit("joinRoom", roomName, username);
        updateRoomList();
        chatSection.style.display = "block";
        leaveRoomBtn.style.display = "inline-block";
      }
    });
  } else {
    roomTitle.textContent = `Welcome to the ${roomName} room, ${username}!`;
    socket.emit("joinRoom", roomName, username);
    updateRoomList();
    chatSection.style.display = "block";
    leaveRoomBtn.style.display = "inline-block";
  }
}
function sendMessage() {
  const message = messageInput.value.trim();
  if (message) {
    displayMessage(
      username,
      message,
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
    messageInput.value = "";
    socket.emit("userMessage", {
      room: currentRoom,
      message: message,
      username: username,
      timeStamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }
}

function displayMessage(username, message, timeStamp) {
  const messagesContainer = document.getElementById("messageArea");
  const newMessage = document.createElement("div");
  newMessage.classList.add("message");
  newMessage.classList.add("user-message");

  const formattedMessage = parseMessage(message);

  // Get the color for the username
  const usernameColor = getUsernameColor(username);

  newMessage.innerHTML = `
          <strong style="color:${usernameColor};">${username}:</strong> ${formattedMessage}
          <div class="timestamp">${timeStamp}</div>`;
  messagesContainer.appendChild(newMessage);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateRoomList() {
  const roomListItems = document.querySelectorAll(".room");
  roomListItems.forEach((room) => {
    if (room.textContent === currentRoom) {
      room.style.backgroundColor = "#1abc9c";
    } else {
      room.style.backgroundColor = "#34495e";
    }
  });
}

function leaveRoom() {
  socket.emit("leaveRoom", currentRoom, username);
  const messagesContainer = document.getElementById("messageArea");
  const leaveMessage = document.createElement("div");
  leaveMessage.classList.add("message");
  leaveMessage.innerHTML = `<strong>System: </strong>${username} has left the room. <div class="timestamp">${new Date().toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" }
  )}</div>`;
  messagesContainer.appendChild(leaveMessage);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  currentRoom = null;
  username = "";

  document.getElementById("chatSection").style.display = "none";
  document.getElementById("leaveRoomBtn").style.display = "none";
  updateRoomList();
  alert("You have successfully left the room.");
}

socket.on("message", (data) => {
  const { room, message, username, timeStamp } = data;
  if (room === currentRoom) {
    displayMessage(username, message, timeStamp);
  } else if (!isInActiveRoom) {
    alert(`New message in ${room}: ${message}`);
  }
});

document.getElementById("message").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});
