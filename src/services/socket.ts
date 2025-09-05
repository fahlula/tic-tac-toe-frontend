// src/services/socket.ts
import { io, Socket } from "socket.io-client";

/** Tipos base do jogo */
export type Cell = "" | "X" | "O";
export type Status = "waiting" | "active" | "x_won" | "o_won" | "draw";
export type Turn = "X" | "O";
export type RoomState = {
  room_id: string;
  player1_name: string | null;
  player2_name: string | null;
  board: Cell[];
  turn: Turn;
  status: Status;
  createdAt?: string;
  updatedAt?: string;
};

/** Eventos do servidor → cliente */
export interface ServerToClientEvents {
  pong: () => void;
  room_created: (m: { roomId: string; assigned: Turn; state?: RoomState }) => void;
  room_joined:  (m: { roomId: string; assigned: Turn }) => void;
  room_state:   (st: RoomState) => void;
  game_over:    (m: { status: Exclude<Status, "waiting" | "active"> }) => void;
  ws_error:     (e: { code: string; message: string; detail?: string }) => void;
}

/** Eventos do cliente → servidor */
export interface ClientToServerEvents {
  ping: () => void;
  create_room: (p: { playerName?: string; roomId?: string }) => void;
  join_room:   (p: { roomId: string; playerName?: string }) => void;
  make_move:   (p: { roomId: string; index: number }) => void;
  restart:     (p: { roomId: string }) => void;
}

/** Instância única do socket para o app inteiro */
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/** Pega (ou cria) a conexão */
export function getSocket() {
  if (socket) return socket;

  const URL = import.meta.env.VITE_BACKEND_URL as string;

  socket = io(URL, {
    // permite começar em polling e fazer upgrade p/ websocket (mais estável no Render)
    transports: ["polling", "websocket"],
    upgrade: true,

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  return socket;
}

/** Opcional: encerrar a conexão (ex.: ao sair do app) */
export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
