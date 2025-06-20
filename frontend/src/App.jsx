// src/App.js
import { BrowserRouter as Router, Routes, Route, BrowserRouter } from "react-router-dom";
import GameRoom from "./pages/Gameroom";
import WaitingRoom from "./pages/Waiting";
import LandingPage from "./pages/Landing";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path='/waiting/:roomID' element={<WaitingRoom/>}/>
        <Route path="/game/:roomID" element={<GameRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
