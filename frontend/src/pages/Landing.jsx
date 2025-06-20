import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../util/socket";

export default function Landing() {
  const [inputRoom, setInputRoom] = useState("");
  const navigate = useNavigate();

  const handleCreate = () => {
    socket.emit("create-room");
    socket.on("room-created", ({ roomID, player }) => {
      navigate(`/waiting/${roomID}?color=${player}`);
    });
  };

  const handleJoin = () => {
    
    socket.emit("join-room", inputRoom);
    socket.on("room-joined", ({ roomID, player }) => {
      navigate(`/waiting/${roomID}?color=${player}`);
    });
    socket.on("error-message", (msg) => alert(msg));
  };

  return (
    <div>
      <h2>Landing Page</h2>
      <button onClick={handleCreate}>Create Room</button>
      <br /><br />
      <input
        value={inputRoom}
        onChange={(e) => setInputRoom(e.target.value.trim())}
        placeholder="Room ID"
      />
      <button onClick={handleJoin}>Join Room</button>
    </div>
  );
}
