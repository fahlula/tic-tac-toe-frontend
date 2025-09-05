import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getSocket } from "../services/socket";
import type { RoomState, Turn, Cell } from "../services/socket";

export default function Game() {
  const { roomId = "" } = useParams();
  const { state } = useLocation() as { state?: { me?: Turn; snapshot?: RoomState } };

  // quem eu sou (X/O). Pode vir da navegação ou ser definido por eventos após entrar.
  const [me, setMe] = useState<Turn | "">((state?.me as Turn) || "");
  // estado da sala. Tenta iniciar com snapshot; se não vier, buscamos por HTTP.
  const [s, setS] = useState<RoomState | null>(state?.snapshot ?? null);
  const [ended, setEnded] = useState<"" | "x_won" | "o_won" | "draw">("");
  const [error, setError] = useState<string>("");

  // Conecta eventos do socket
  useEffect(() => {
    const sock = getSocket();

    const onState = (st: RoomState) => setS(st);
    const onJoined = (m: { assigned: Turn }) => setMe(m.assigned);
    const onCreated = (m: { assigned: Turn }) => setMe(m.assigned);
    const onOver = (m: { status: "x_won" | "o_won" | "draw" }) => setEnded(m.status);
    const onErr = (e: { code: string; message: string }) => setError(e.message || e.code);

    sock.on("room_state", onState);
    sock.on("room_joined", onJoined);
    sock.on("room_created", onCreated);
    sock.on("game_over", onOver);
    sock.on("ws_error", onErr);

    // opcional: acorda a conexão
    sock.emit("ping");

    return () => {
      sock.off("room_state", onState);
      sock.off("room_joined", onJoined);
      sock.off("room_created", onCreated);
      sock.off("game_over", onOver);
      sock.off("ws_error", onErr);
    };
  }, []);

  // Fallback por HTTP caso entre direto no /game/:roomId (sem snapshot)
  useEffect(() => {
    if (!s && roomId) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/rooms/${roomId}`)
        .then(async (r) => {
          if (!r.ok) return;
          const data: RoomState = await r.json();
          setS(data);
        })
        .catch(() => {
          /* silencioso */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Label de status
  const label = useMemo(() => {
    if (!s) return "Conectando…";
    if (ended) return ended === "draw" ? "Empate!" : ended === "x_won" ? "X venceu!" : "O venceu!";
    if (s.status === "waiting") return "Aguardando jogador…";
    if (s.status === "active") return `Vez de ${s.turn}`;
    return s.status;
  }, [s, ended]);

  // Jogar
  const play = (i: number) => {
    if (!s || s.status !== "active") return;
    if (me === "" || s.turn !== me) return; // não é minha vez
    if (s.board[i] !== "") return; // célula ocupada
    getSocket().emit("make_move", { roomId, index: i });
  };

  // Reiniciar
  const restart = () => {
    if (!roomId) return;
    setEnded("");
    getSocket().emit("restart", { roomId });
  };

  // Mini “toast” simples para erros
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 2500);
    return () => clearTimeout(t);
  }, [error]);

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

      <div className="text-sm opacity-70">
        X: {s.player1_name ?? "?"} • O: {s.player2_name ?? "?"} • Você: {me || "?"}
      </div>

      {/* Board */}
      <div className={`grid grid-cols-3 gap-2 ${myTurn ? "" : "opacity-90"}`}>
        {s.board.map((c: Cell, i: number) => {
          const disabled = c !== "" || s.status !== "active" || s.turn !== me;
          return (
            <button
              key={i}
              onClick={() => play(i)}
              disabled={disabled}
              className="w-24 h-24 text-4xl font-bold border rounded flex items-center justify-center disabled:opacity-60"
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

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow">
          {error}
        </div>
      )}
    </div>
  );
}
