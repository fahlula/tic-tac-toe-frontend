import { useLocation, useParams } from "react-router-dom";

export default function Game() {
  const { roomId } = useParams();
  const { state } = useLocation() as { state?: { me?: "X" | "O" } };
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Sala {roomId}</h2>
        <p>Você é: <b>{state?.me ?? "?"}</b></p>
        <p>(Tabuleiro)</p>
      </div>
    </div>
  );
}
