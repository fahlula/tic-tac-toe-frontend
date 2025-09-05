import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Lobby from "./pages/Lobby";
import Join from "./pages/Join";
import Game from "./pages/Game";

const router = createBrowserRouter([
  { path: "/", element: <Lobby /> },
  { path: "/join", element: <Join /> },
  { path: "/game/:roomId", element: <Game /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
