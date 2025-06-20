import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { socket } from "../util/socket";
export default function WaitingRoom() {
  const { roomID } = useParams();
  const [params] = useSearchParams();
  const playerColor = params.get("color");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on("both-joined", () => {
      setReady(true);
    });

    socket.on("game-start", () => {
      navigate(`/game/${roomID}?color=${playerColor}`);
    });
  }, []);

  const startGame = () => {
    socket.emit("start-game", roomID);
  };

  return (
    <div>
      <h2>Waiting Room: {roomID}</h2>
      <p>You are: {playerColor}</p>
      {!ready && <p>Waiting for Player 2...</p>}
      {ready && <button onClick={startGame}>Start</button>}
    </div>
  );
}
