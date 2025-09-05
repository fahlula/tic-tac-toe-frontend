import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../services/socket";

export default function Lobby() {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const nav = useNavigate();

  useEffect(() => {
    const s = getSocket();

    const onWsError = (e: { code: string; message: string }) => {
      setCreating(false);
      setError(e.message || e.code);
    };

    s.on("ws_error", onWsError);
    return () => {
      s.off("ws_error", onWsError);
    };
  }, []);

  const createRoom = () => {
    setError("");
    setCreating(true);

    const s = getSocket();

    s.once("room_created", (m) => {
      setCreating(false);
      // ✅ envia também o snapshot inicial da sala (m.state)
      nav(`/game/${m.roomId}`, {
        replace: true,
        state: { me: m.assigned, snapshot: m.state },
      });
    });

    // opcional: em caso de resposta muito rápida, garantir que não fique preso
    s.once("room_state", () => setCreating(false));

    s.emit("create_room", { playerName: name || "Player 1" });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-6">
      <h1 className="text-3xl font-bold">Tic-Tac-Toe</h1>

      <input
        className="border rounded px-4 py-2 w-80"
        placeholder="Seu nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button
        className="bg-black text-white px-5 py-2 rounded disabled:opacity-60"
        onClick={createRoom}
        disabled={creating}
      >
        {creating ? "Criando..." : "Criar sala"}
      </button>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button className="px-5 py-2 rounded border" onClick={() => nav("/join")}>
        Entrar em sala existente
      </button>
    </div>
  );
}
