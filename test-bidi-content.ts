// 1. Import or copy/paste your MultimodalLiveClient class definition.
//    If you're using the code from your snippet, ensure it’s in scope here.
//    For brevity, we’ll assume you have it as a local import:

import { MultimodalLiveClient } from "./src/lib/multimodal-live-client";
// or the path to wherever that class is defined

// 2. Provide your API key below.
//    WARNING: Don’t commit real API keys to public repos or code.
const MY_API_KEY = "AIzaSyDqKEZAplofjA8tp5rhgPPqE9Hc91NccoY";

// 3. Instantiate the client with the ?key=<API_KEY> pattern (which will fail).
const client = new MultimodalLiveClient({
  apiKey: MY_API_KEY,
});

// 4. Define a minimal LiveConfig object
const config = {
  model: "models/chat-bison-001",  // or any model name you have access to
};

// 5. Try connecting
client
  .connect(config)
  .then(() => {
    console.log("Connected successfully (unlikely with API key only).");
  })
  .catch((err) => {
    console.error("Failed to connect:", err);
  });

// 6. Listen for events
client.on("open", () => {
  console.log("[EVENT] WebSocket open.");
});

client.on("close", (closeEvent) => {
  console.log("[EVENT] WebSocket closed:", closeEvent);
  console.log(
    `Reason: ${closeEvent.reason}, Code: ${closeEvent.code}, Clean: ${closeEvent.wasClean}`
  );
});

client.on("log", (logEvent) => {
  console.log("[LOG]", logEvent.type, logEvent.message);
});
