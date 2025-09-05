import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

/* ===== Tipos ===== */
type Cell = "" | "X" | "O";
type Status = "waiting" | "active" | "x_won" | "o_won" | "draw";
type Turn = "X" | "O";

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

type RoomCreated = { roomId: string; assigned: Turn; state?: RoomState };
type RoomJoined = { roomId: string; assigned: Turn };
type GameOver = { status: Exclude<Status, "waiting" | "active"> };
type WsError = { code: string; message: string; detail?: string };

/* ===== Eventos do Socket ===== */
export interface ServerToClientEvents {
  pong: () => void;
  room_created: (m: RoomCreated) => void;
  room_joined: (m: RoomJoined) => void;
  room_state: (st: RoomState) => void;
  game_over: (m: GameOver) => void;
  ws_error: (e: WsError) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
  create_room: (p: { playerName?: string; roomId?: string }) => void;
  join_room: (p: { roomId: string; playerName?: string }) => void;
  make_move: (p: { roomId: string; index: number }) => void;
  restart: (p: { roomId: string }) => void;
}

/* ===== Componente ===== */
export default function Debug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [state, setState] = useState<RoomState | null>(null);
  const [name, setName] = useState("Fabiana");
  const [roomId, setRoomId] = useState("");
  const [index, setIndex] = useState(0);
  const [assigned, setAssigned] = useState<"" | "X" | "O">("");
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  const URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
  const log = (x: unknown) =>
    setLogs((p) => [
      `${new Date().toLocaleTimeString()}  ${
        typeof x === "string" ? x : JSON.stringify(x)
      }`,
      ...p,
    ]);

  useEffect(() => {
    const s: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      import.meta.env.VITE_BACKEND_URL as string,
      {
        // deixe o Socket.IO fazer o fallback e o upgrade
        transports: ["polling", "websocket"],
        upgrade: true,

        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      }
    );

    socketRef.current = s;

    s.on("connect", () => log("connected"));
    s.on("disconnect", (r) => log(`disconnected: ${r}`));
    s.on("pong", () => log("pong"));
    s.on("room_created", (m) => {
      log({ event: "room_created", m });
      setAssigned(m.assigned);
      setRoomId(m.roomId);
      if (m.state) setState(m.state);
    });
    s.on("room_joined", (m) => {
      log({ event: "room_joined", m });
      setAssigned(m.assigned);
    });
    s.on("room_state", (st) => {
      log({ event: "room_state", st });
      setState(st);
    });
    s.on("game_over", (m) => log({ event: "game_over", m }));
    s.on("ws_error", (e) => log({ event: "ws_error", e }));

    return () => s.disconnect();
  }, [URL]);

  const emit = <E extends keyof ClientToServerEvents>(
    ev: E,
    payload?: Parameters<ClientToServerEvents[E]>[0]
  ) => {
    if (!socketRef.current) return log("socket not connected");
    log({ emit: ev, payload });
    // @ts-expect-error overload-friendly
    socketRef.current.emit(ev, payload);
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 gap-6 p-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Debug Tic-Tac-Toe</h1>

        <div className="grid gap-2">
          <label className="text-sm">Seu nome</label>
          <input
            className="border p-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-2 rounded bg-black text-white"
            onClick={() => emit("ping")}
          >
            Ping
          </button>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white"
            onClick={() => emit("create_room", { playerName: name })}
          >
            Criar sala
          </button>
          <input
            className="border p-2 rounded"
            placeholder="roomId"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button
            className="px-3 py-2 rounded bg-emerald-600 text-white"
            onClick={() => emit("join_room", { roomId, playerName: name })}
          >
            Entrar
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={8}
            className="border p-2 rounded w-24"
            value={index}
            onChange={(e) => setIndex(parseInt(e.target.value || "0"))}
          />
          <button
            className="px-3 py-2 rounded bg-purple-600 text-white"
            onClick={() => emit("make_move", { roomId, index })}
          >
            Jogar (index)
          </button>
          <button
            className="px-3 py-2 rounded border"
            onClick={() => emit("restart", { roomId })}
          >
            Reiniciar
          </button>
        </div>

        <div className="text-sm opacity-70">
          <div>
            roomId: <b>{roomId || "-"}</b>
          </div>
          <div>
            você: <b>{assigned || "-"}</b>
          </div>
        </div>

        <div className="border rounded p-3">
          <h2 className="font-semibold mb-2">Estado</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Logs</h2>
        <div className="border rounded p-3 h-[70vh] overflow-auto bg-gray-50">
          <ul className="text-xs space-y-1">
            {logs.map((l, i) => (
              <li key={i} className="font-mono">
                {l}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
