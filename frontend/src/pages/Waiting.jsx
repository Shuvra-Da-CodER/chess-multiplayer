import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { socket } from "../util/socket";
import "./Waiting.css";
import kingIcon from "../assets/king.svg";
import queenIcon from "../assets/queen.svg";

export default function WaitingRoom() {
  const { roomID } = useParams();
  const [params] = useSearchParams();
  const playerColor = params.get("color");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Announce that this player has joined the waiting room
    socket.emit("player-joined-waiting", roomID);

    socket.on("both-joined", () => {
      setReady(true);
    });

    socket.on("game-start", () => {
      navigate(`/game/${roomID}?color=${playerColor}`);
    });
  },[]);
  //   // Clean up the listener when the component unmounts
  //   return () => {
  //     socket.off("both-joined");
  //     socket.off("game-start");
  //   };
  // }, [navigate, roomID, playerColor]);

  const startGame = () => {
    socket.emit("start-game", roomID);
  };

  return (
    <div className="waiting-container">
      <h2 className="waiting-title">Waiting Room</h2>
      <div className="chess-pieces">
        <img src={kingIcon} alt="King" className="piece-icon" />
        <img src={queenIcon} alt="Queen" className="piece-icon" />
      </div>
      <div className="room-info">
        <p>Room ID: <span className="room-id">{roomID}</span></p>
        <p>Your Color: <span className="player-color">{playerColor}</span></p>
      </div>
      {!ready && <p className="waiting-message">Waiting for your opponent to join...</p>}
      {ready && (
        <button className="start-button" onClick={startGame}>
          Start Game
        </button>
      )}
    </div>
  );
}
