import React, { useState, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { socket } from "../util/socket";

//useRef is a React Hook that lets you:  Persist a value between renders without causing re-renders

export default function GameRoom() {
  const [gameComment, setGameComment] = useState("");
  const [winnerMessage, setWinnerMessage] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const gameStates = {};
  const { roomID } = useParams();
  const [move, setMove] = useState({});
  const [params] = useSearchParams();
  const playerColor = params.get("color");
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen()); // board position
  //for our turn
  function makeMove({ from, to }) {
    const game = gameRef.current;
    const move = { from, to };
    const piece = game.get(from);
    console.log(piece);
    const playerColorChar = playerColor === "white" ? "w" : "b";
    if (!piece || piece.color !== playerColorChar) {
      return false; // Not your piece
    }
    const result = game.move(move);
    if (result) {
      setFen(game.fen()); // triggers UI update
      socket.emit("move", { roomID, move, fen: game.fen() });

      // ✅ COMMENT LOGIC
    if (game.in_checkmate()) {
      setGameComment("Checkmate! Game over.");
      setIsGameOver(true);
      setWinnerMessage(`${playerColor} wins by checkmate!`);
    } else if (game.in_draw()) {
      setGameComment("Draw! Game over.");
      setIsGameOver(true);
      setWinnerMessage("Draw.");
    } else if (game.in_check()) {
      setGameComment("Check!");
    } else {
      setGameComment(""); // Clear comment
    }
      return true;
    }
    return false;
  }

  //for listening to opponents turn and updating the board
  useEffect(() => {
    const handleMove = (move) => {
      console.log("✅ Opponent move received:", move);
      const game = gameRef.current;
      game.move(move);
      setFen(game.fen());
      // ✅ COMMENT LOGIC
    if (game.in_checkmate()) {
      setGameComment("Checkmate! Game over.");
      setIsGameOver(true);
      setWinnerMessage(`You lost by checkmate!`);
    } else if (game.in_draw()) {
      setGameComment("Draw! Game over.");
      setIsGameOver(true);
      setWinnerMessage("Draw.");
    } else if (game.in_check()) {
      setGameComment("Check!");
    } else {
      setGameComment(""); // Clear comment
    }
    };
    const handleRematch = () => {
      gameRef.current.reset();
      setFen(gameRef.current.fen());
      setWinnerMessage("");
      setIsGameOver(false);
      setSelectedSquare(null); // ✅ reset selected square
  setHighlightedSquares({}); // ✅ reset highlights
    };

    const handleGameState = (fen) => {
      if (fen) {
        gameRef.current.load(fen);
        setFen(fen);
      }
    };

    const handleGiveUp = (color) => {
      const winner = color === "white" ? "Black" : "White";
      setWinnerMessage(`${color} gave up. ${winner} wins!`);
      setIsGameOver(true);
      gameRef.current.reset();
      setFen(gameRef.current.fen());
    };

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
    };
  }, [roomID]); // ✅ Add roomID as dependency

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Shatranj♟️</h1>
      <Chessboard
        position={fen}
        onPieceDrop={(from, to) => {
          if (isGameOver) return false;
          const result = makeMove({ from, to });
          return result !== false;
        }}
        boardWidth={300} // ✅ Increase board size here (in pixels)
        // ↑ You can change 600 to 700, 800, etc. as needed
        // onSquareClick={(square) => {
        //   if (isGameOver) return;
        //   const game = gameRef.current;
        //   const playerColorChar = playerColor === "white" ? "w" : "b";

        //   // Step 1: Select a piece
        //   if (!selectedSquare) {
        //     const piece = game.get(square);
        //     if (piece && piece.color === playerColorChar) {
        //       setSelectedSquare(square);

        //       const moves = game.moves({ square, verbose: true });
        //       const highlights = {};
        //       moves.forEach((m) => {
        //         highlights[m.to] = {
        //           background:
        //             "radial-gradient(circle, #fffc00 25%, transparent 25%)",
        //           borderRadius: "50%",
        //         };
        //       });
        //       setHighlightedSquares(highlights);
        //     }
        //   }
        //   // Step 2: Click on a highlighted move
        //   else {
        //     const move = { from: selectedSquare, to: square };
        //     const result = makeMove(move); // your existing makeMove
        //     if (result !== false) {
        //       setSelectedSquare(null);
        //       setHighlightedSquares({});
        //     } else {
        //       // invalid move or canceled
        //       setSelectedSquare(null);
        //       setHighlightedSquares({});
        //     }
        //   }
        // }}
        boardOrientation={playerColor}
      />
      {winnerMessage && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: "#e0ffe0",
            color: "#006400",
            borderRadius: "5px",
            fontWeight: "bold",
            fontSize: "1.2rem",
          }}
        >
          {winnerMessage}
        </div>
      )}
      <button
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "green",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
        disabled={isGameOver}
        onClick={() => {
          const winner = playerColor === "white" ? "Black" : "White";
          setWinnerMessage(`You gave up. ${winner} wins!`);
          setIsGameOver(true);
          socket.emit("giveUp", { roomID, playerColor });
        }}
      >
        Give Up
      </button>
      {isGameOver && (
  <button
    style={{
      marginTop: "1rem",
      marginLeft: "1rem",
      padding: "0.5rem 1rem",
      color: "green",
      backgroundColor: "white",
      border: "none",
      borderRadius: "5px",
    }}
    onClick={() => {
      socket.emit("rematch", roomID);
    }}
  >
    Rematch
  </button>
)}
    {gameComment && (
  <div style={{ marginTop: "0.5rem", fontWeight: "bold", color: "#333" }}>
    {gameComment}
  </div>
)}
    </div>
  );
}
