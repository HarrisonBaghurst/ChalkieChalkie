const { WebSocketServer } = require("ws");

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("[server] CLIENT CONNECTED");
  ws.on("message", (msg) => {
    console.log("[server] Received:", msg.toString());
    ws.send(`Echo: ${msg}`);
  });
});

console.log("[server] LIVE ON ws://localhost:8080");
