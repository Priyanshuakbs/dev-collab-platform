// frontend/src/socket/socket.js

import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const connectSocket = () => {
  if (!socket.connected) socket.connect();
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export const joinWorkspace = (workspaceId, userId, name) => {
  socket.emit("joinWorkspace", { workspaceId, userId, name });
};

export const sendMessage = (workspace, userId, name, text) => {
  socket.emit("sendMessage", {
    workspace, userId, name, text,
    timestamp: new Date().toISOString(),
  });
};

export const emitCursorMove = (workspaceId, userId, name, line, column) => {
  socket.emit("cursorMove", { workspaceId, userId, name, line, column });
};

export const emitCodeChange = (workspaceId, userId, code, fileName) => {
  socket.emit("codeChange", { workspaceId, userId, code, fileName });
};

export const emitTyping = (workspaceId, userId, name, isTyping) => {
  socket.emit("typing", { workspaceId, userId, name, isTyping });
};

export const emitStatus = (workspaceId, userId, status) => {
  socket.emit("statusChange", { workspaceId, userId, status });
};

export default socket;
