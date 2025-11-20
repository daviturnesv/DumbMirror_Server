import { startTracing, shutdownTracing } from "./tracing.js";
import { createRelayServer } from "./server.js";

let tracingEnabled;
let relay;

try {
  tracingEnabled = await startTracing();
  relay = createRelayServer();
  await relay.start();

  const gracefulShutdown = async (signal) => {
    console.log(`[server] Recebido ${signal}. Encerrando relay...`);
    try {
      await relay.stop();
    } finally {
      if (tracingEnabled) {
        await shutdownTracing();
      }
      process.exit(0);
    }
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
} catch (error) {
  console.error("[server] Falha ao iniciar relay", error);
  await shutdownTracing();
  process.exit(1);
}
