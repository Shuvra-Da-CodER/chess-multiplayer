import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../util/socket";
import "./Landing.css";

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
    if (!inputRoom.trim()) {
      alert("Please enter a room ID");
      return;
    }
    
    socket.emit("join-room", inputRoom);
    socket.on("room-joined", ({ roomID, player }) => {
      navigate(`/waiting/${roomID}?color=${player}`);
    });
    socket.on("error-message", (msg) => alert(msg));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  return (
    <div className="landing-container">
      <h1 className="landing-title">Shatranj</h1>
      <div className="landing-controls">
        <button className="landing-btn create-btn" onClick={handleCreate}>
          CREATE
        </button>
        <input
          className="room-input"
          value={inputRoom}
          onChange={(e) => setInputRoom(e.target.value.trim())}
          onKeyPress={handleKeyPress}
          placeholder="ENTER ROOM ID"
        />
        <button className="landing-btn join-btn" onClick={handleJoin}>
          JOIN NOW
        </button>
      </div>
    </div>
  );
}
