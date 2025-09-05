import { useEffect } from "react";
import { getSocket } from "./services/socket";

export default function App() {
  useEffect(() => {
    const s = getSocket();

    const onConnect = () => console.log("WS conectado:", s.id);
    const onPong = () => console.log("pong ok");

    s.on("connect", onConnect);
    s.on("pong", onPong);

    // manda um ping só pra ver resposta
    s.emit("ping");

    return () => {
      s.off("connect", onConnect);
      s.off("pong", onPong);
    };
  }, []);

  return (
    <div className="h-screen grid place-items-center">
      <h1 className="text-2xl font-bold">WebSocket wrapper pronto ✅</h1>
    </div>
  );
}
