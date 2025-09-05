import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSocket } from "../services/socket";

export default function Join() {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string>("");
  const nav = useNavigate();
  const loc = useLocation();

  // Puxa roomId da URL se vier ?roomId=xxxx
  useEffect(() => {
    const s = getSocket();
    const qp = new URLSearchParams(loc.search);
    const rid = qp.get("roomId");
    if (rid) setRoomId(rid);

    const onWsError = (e: { code: string; message: string }) => {
      setJoining(false);
      setError(e.message || e.code);
    };
    s.on("ws_error", onWsError);

    return () => {
      s.off("ws_error", onWsError);
    };
  }, [loc.search]);

  const join = () => {
    setError("");
    const rid = roomId.trim();
    const player = name.trim() || "Player 2";
    if (!rid) {
      setError("Informe um Room ID válido.");
      return;
    }
    setJoining(true);
    const s = getSocket();
    s.once("room_joined", (m) => {
      setJoining(false);
      // navega para o jogo com o roomId retornado e marca o jogador (O)
      nav(`/game/${m.roomId}`, { replace: true, state: { me: m.assigned } });
    });
    s.once("room_state", () => {
      // fallback visual: se o estado chegar rápido, já some erro/spinner
      setJoining(false);
    });
    s.emit("join_room", { roomId: rid, playerName: player });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-2xl font-semibold">Entrar em sala</h2>

      <input
        className="border p-2 rounded w-80"
        placeholder="Room ID (ex.: abcd12)"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />

      <input
        className="border p-2 rounded w-80"
        placeholder="Seu nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button
        className="bg-emerald-600 text-white px-5 py-2 rounded disabled:opacity-60"
        onClick={join}
        disabled={joining}
      >
        {joining ? "Entrando..." : "Entrar"}
      </button>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="text-xs opacity-70">
        Dica: você também pode acessar <code>/join?roomId=SEU_ID</code> para preencher o campo automaticamente.
      </div>
    </div>
  );
}
