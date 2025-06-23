import { io } from "socket.io-client";
export const socket = io("https://chess-backend-28s0.onrender.com",{
    transports: ['websocket'],
    withCredentials: true
});