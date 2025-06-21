import React, { useState, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { socket } from "../util/socket";
import "./Gameroom.css";
import kingIcon from "../assets/king.svg";
import queenIcon from "../assets/queen.svg";

//useRef is a React Hook that lets you:  Persist a value between renders without causing re-renders

export default function GameRoom() {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [gameComment, setGameComment] = useState("");
  const [winnerMessage, setWinnerMessage] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const { roomID } = useParams();
  const [params] = useSearchParams();
  const playerColor = params.get("color");
  const gameRef = useRef(new Chess());
  const chatMessagesRef = useRef(null);
  const [fen, setFen] = useState(gameRef.current.fen()); // board position

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  //for our turn
  function makeMove({ from, to }) {
    const game = gameRef.current;
    const move = { from, to };
    const piece = game.get(from);
    const playerColorChar = playerColor === "white" ? "w" : "b";
    if (!piece || piece.color !== playerColorChar || game.turn() !== playerColorChar) {
      return false;
    }
    const result = game.move(move);
    if (result) {
      setFen(game.fen());
      socket.emit("move", { roomID, move, fen: game.fen() });
      updateGameStatus();
      return true;
    }
    return false;
  }
  function sendChatMessage() {
    const trimmedInput = chatInput.trim();
    if (trimmedInput === "") return;

    const messagePayload = {
      roomID,
      sender: playerColor || "Spectator",
      message: trimmedInput,
    };

    // Emit the message to the server
    socket.emit("sendMessage", messagePayload);

    // Optimistically update the UI for the sender
    setChatMessages((prev) => [
      ...prev,
      {
        sender: messagePayload.sender,
        message: messagePayload.message,
        timestamp: new Date().toISOString(),
      },
    ]);

    setChatInput(""); // Clear input
  }
  

  function updateGameStatus() {
    const game = gameRef.current;
    if (game.isCheckmate()) {
      setGameComment("Checkmate! Game over.");
      setIsGameOver(true);
      setWinnerMessage(`${game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`);
    } else if (game.isDraw()) {
      setGameComment("Draw! Game over.");
      setIsGameOver(true);
      setWinnerMessage("Draw.");
    } else if (game.inCheck()) {
      setGameComment("Check!");
    } else {
      setGameComment("");
    }
  }

  //for listening to opponents turn and updating the board
  useEffect(() => {
    const handleMove = (move) => {
      const game = gameRef.current;
      game.move(move);
      setFen(game.fen());
      updateGameStatus();
    };

    const handleRematch = () => {
      gameRef.current.reset();
      setFen(gameRef.current.fen());
      setWinnerMessage("");
      setGameComment("");
      setIsGameOver(false);
    };

    const handleGameState = (fen) => {
      if (fen) {
        gameRef.current.load(fen);
        setFen(fen);
        updateGameStatus();
      }
    };

    const handleGiveUp = (color) => {
      const winner = color === "white" ? "Black" : "White";
      setWinnerMessage(`${color} gave up. ${winner} wins!`);
      setIsGameOver(true);
    };
    
  socket.on("receiveMessage", ({ sender, message, timestamp }) => {
    // Make sure not to add the sender's own message again
    if (sender !== (playerColor || "Spectator")) {
      setChatMessages((prev) => [...prev, { sender, message, timestamp }]);
    }
  });
    socket.emit("requestGameState", roomID);
    socket.on("gameState", handleGameState);
    socket.on("move", handleMove);
    socket.on("opponentGaveUp", handleGiveUp);
    socket.on("rematchStarted", handleRematch);

    return () => {
      socket.off("gameState", handleGameState);
      socket.off("move", handleMove);
      socket.off("opponentGaveUp", handleGiveUp);
      socket.off("rematchStarted", handleRematch);
      socket.off("receiveMessage");
    };
  }, [roomID, playerColor]); // ✅ Add playerColor as dependency

  const handleGiveUp = () => {
    const winner = playerColor === "white" ? "Black" : "White";
    setWinnerMessage(`You gave up. ${winner} wins!`);
    setIsGameOver(true);
    socket.emit("giveUp", { roomID, playerColor });
  };

  const handleRematch = () => {
    socket.emit("rematch", roomID);
  };

  return (
    <div className="gameroom-container">
      <h1 className="title">Shatranj ♟️</h1>
      <div className="chessboard-container">
        <Chessboard
          position={fen}
          onPieceDrop={(from, to) => {
            if (isGameOver) return false;
            return makeMove({ from, to });
          }}
          boardWidth={Math.min(window.innerWidth * 0.8, 400)}
          boardOrientation={playerColor}
        />
      </div>
      <div className="game-info">
        {winnerMessage && <div className="winner-message">{winnerMessage}</div>}
        {gameComment && <div className="game-comment">{gameComment}</div>}
        <div className="action-buttons">
          <button className="btn" disabled={isGameOver} onClick={handleGiveUp}>
            Give Up
          </button>
          {isGameOver && (
            <button className="btn rematch-btn" onClick={handleRematch}>
              Rematch
            </button>
          )}
        </div>
      </div>
      <div className="chat-container">
        <div className="chat-header">Chat</div>
        <div className="chat-messages" ref={chatMessagesRef}>
          {chatMessages.map((msg, i) => (
            <div key={i} className="chat-message">
              <div className="chat-sender">{msg.sender}</div>
              <div className="chat-text">{msg.message}</div>
            </div>
          ))}
        </div>
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
            placeholder="Type a message..."
          />
          <button className="chat-send-btn" onClick={sendChatMessage}>
            Send
          </button>
        </div>
      </div>
      {/* <div className="turn-indicator">
        <img
          src={queenIcon}
          alt="Black's Turn"
          className={`turn-icon ${gameRef.current.turn() === 'b' ? 'active' : 'inactive'}`}
        />
        <img
          src={kingIcon}
          alt="White's Turn"
          className={`turn-icon ${gameRef.current.turn() === 'w' ? 'active' : 'inactive'}`}
        />
      </div> */}
      
    </div>
  );
}
