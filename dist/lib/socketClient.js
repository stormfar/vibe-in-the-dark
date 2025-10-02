"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocket = getSocket;
exports.disconnectSocket = disconnectSocket;
const socket_io_client_1 = require("socket.io-client");
let socket = null;
function getSocket() {
    if (!socket) {
        const url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
        socket = (0, socket_io_client_1.io)(url, {
            autoConnect: true,
        });
    }
    return socket;
}
function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
