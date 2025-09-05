import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getSocket } from "../services/socket";
import type { RoomState, Turn, Cell } from "../services/socket";

export default function Game() {
  const { roomId = "" } = useParams();
  const { state } = useLocation() as { state?: { me?: Turn; snapshot?: RoomState } };

  const [me, setMe] = useState<Turn | "">((state?.me as Turn) || "");
  const [s, setS] = useState<RoomState | null>(state?.snapshot ?? null);
  const [ended, setEnded] = useState<"" | "x_won" | "o_won" | "draw">("");
  const [error, setError] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    const sock = getSocket();

    const onState = (st: RoomState) => setS(st);
    const onJoined = (m: { assigned: Turn }) => setMe(m.assigned);
    const onCreated = (m: { assigned: Turn }) => setMe(m.assigned);
    const onOver = (m: { status: "x_won" | "o_won" | "draw" }) => setEnded(m.status);
    const onErr = (e: { code: string; message: string }) => setError(e.message || e.code);

    const onIllegal = (e: { code: string; [k: string]: any }) => {
      const msg =
        e?.code === "NOT_YOUR_TURN" ? "Não é a sua vez" :
        e?.code === "CELL_OCCUPIED" ? "Célula já ocupada" :
        e?.code === "INDEX_INVALID" ? "Posição inválida" :
        e?.code === "GAME_NOT_ACTIVE" ? "Partida não está ativa" :
        e?.code === "ROOM_NOT_FOUND" ? "Sala não encontrada" :
        "Jogada inválida";
      setToast(msg);
    };

    sock.on("room_state", onState);
    sock.on("room_joined", onJoined);
    sock.on("room_created", onCreated);
    sock.on("game_over", onOver);
    sock.on("ws_error", onErr);
    sock.on("illegal_move", onIllegal);

    sock.emit("ping");

    return () => {
      sock.off("room_state", onState);
      sock.off("room_joined", onJoined);
      sock.off("room_created", onCreated);
      sock.off("game_over", onOver);
      sock.off("ws_error", onErr);
      sock.off("illegal_move", onIllegal);
    };
  }, []);

  useEffect(() => {
    if (!s && roomId) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/rooms/${roomId}`)
        .then(async (r) => {
          if (!r.ok) return;
          const data: RoomState = await r.json();
          setS(data);
        })
        .catch(() => {});
    }
  }, [roomId, s]);

  const label = useMemo(() => {
    if (!s) return "Conectando…";
    if (ended) return ended === "draw" ? "Empate!" : ended === "x_won" ? "X venceu!" : "O venceu!";
    if (s.status === "waiting") return "Aguardando jogador…";
    if (s.status === "active") return `Vez de ${s.turn}`;
    return s.status;
  }, [s, ended]);

  const play = (i: number) => {
    if (!s) return;

    if (s.status !== "active") {
      setToast("Partida não está ativa");
      return;
    }
    if (me === "") {
      setToast("Jogador não identificado");
      return;
    }
    if (s.turn !== me) {
      setToast("Não é a sua vez");
      return;
    }
    if (s.board[i] !== "") {
      setToast("Célula já ocupada");
      return;
    }

    getSocket().emit("make_move", { roomId, index: i });
  };

  const restart = () => {
    if (!roomId) return;
    setEnded("");
    getSocket().emit("restart", { roomId });
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(s?.room_id || roomId);
      setToast("Código copiado!");
    } catch {
      setToast("Não foi possível copiar");
    }
  };

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 2500);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!s) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-lg">Conectando…</div>
      </div>
    );
  }

  const myTurn = s.status === "active" && s.turn === me;

  return (
    <div className="min-h-screen flex flex-col items-center gap-4 p-6">
      <h2 className="text-2xl font-bold">Sala {s.room_id}</h2>

      <div className="flex items-center gap-2">
        <div className="text-sm opacity-70">
          Sala: <b>{s.room_id}</b>
        </div>
        <button
          className="px-2 py-1 text-sm border rounded"
          onClick={copyRoomId}
          title="Copiar código da sala"
        >
          Copiar
        </button>
      </div>

      <div className="text-sm opacity-70">
        X: {s.player1_name ?? "?"} • O: {s.player2_name ?? "?"} • Você: {me || "?"}
      </div>

      {/* Board — sem disabled, apenas visual/aria-disabled para exibir toasts */}
      <div className={`grid grid-cols-3 gap-2 ${myTurn ? "" : "opacity-90"}`}>
        {s.board.map((c: Cell, i: number) => {
          const blocked = c !== "" || s.status !== "active" || s.turn !== me;
          return (
            <button
              key={i}
              onClick={() => play(i)}
              aria-disabled={blocked}
              className={`w-24 h-24 text-4xl font-bold border rounded flex items-center justify-center
                ${blocked ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}`}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div className="text-lg">{label}</div>

      <div className="flex gap-2">
        <button className="px-3 py-2 border rounded" onClick={restart}>
          Reiniciar
        </button>
      </div>

      {/* Toasts */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded shadow">
          {error}
        </div>
      )}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-2 rounded shadow">
          {toast}
        </div>
      )}
    </div>
  );
}
