import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

let sdk;
let startPromise;

const DEFAULT_OTLP_ENDPOINT = "http://localhost:4318/v1/traces";

function parseHeaders(rawHeaders) {
  if (!rawHeaders) {
    return undefined;
  }
  return rawHeaders.split(",").reduce((acc, pair) => {
    const [key, value] = pair.split("=");
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});
}

export async function startTracing() {
  if (process.env.OTEL_TRACING_DISABLED === "1") {
    return null;
  }
  if (sdk) {
    return sdk;
  }
  if (startPromise) {
    return startPromise;
  }

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "dumbmirror-relay",
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development"
  });

  const exporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || DEFAULT_OTLP_ENDPOINT;

  const traceExporter = new OTLPTraceExporter({
    url: exporterEndpoint,
    headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
  });

  const instrumentations = getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-express": { enabled: true },
    "@opentelemetry/instrumentation-http": { enabled: true },
    "@opentelemetry/instrumentation-mongodb": { enabled: true },
    "@opentelemetry/instrumentation-socket.io": { enabled: true }
  });

  const nodeSdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations
  });

  startPromise = nodeSdk.start()
    .then(() => {
      sdk = nodeSdk;
      console.log(`[tracing] OpenTelemetry inicializado (exportando para ${exporterEndpoint}).`);
      return sdk;
    })
    .catch((error) => {
      console.error("[tracing] Falha ao iniciar OpenTelemetry", error);
      startPromise = undefined;
      return null;
    });

  return startPromise;
}

export async function shutdownTracing() {
  if (!sdk) {
    return;
  }
  try {
    await sdk.shutdown();
    console.log("[tracing] OpenTelemetry finalizado.");
  } catch (error) {
    console.error("[tracing] Erro ao finalizar OpenTelemetry", error);
  } finally {
    sdk = undefined;
    startPromise = undefined;
  }
}
