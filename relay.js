const { WebSocketServer } = require("ws");

const wss = new WebSocketServer({ port: 8080 });

const cts = []
const bds = []
const board_inits = []
wss.on("connection", (ws) => {  // add the client to the list of clients and boards
  cts.push(ws);  // push client to list
  bds.push(null)  // push null, to be updated when client sends requested board
  console.log("[network] CLIENT CONNECTED, ID", cts.length - 1);

  ws.on("close", () => {
    const idx = cts.indexOf(ws);
    if (idx !== -1) {  // remove the client from the lists if it disconnects
      cts[idx] = null  // null
      bds[idx] = null
    }
    console.log("[network] DISCONNECTED, removed client at index", idx);
  });

  ws.on("message", (msg) => {
    const text = JSON.parse(msg.toString())  // convert message to json
    //console.log("[traffic] RECIEVED:", text);
    if (text["type"] == "connect") {  // use the connect message to assign the client to a board
      bds[bds.length-1] = text["board"].toString()
      console.log(`[boards] BOARD ${text["board"]} ADDED TO CLIENT ID ${cts.length-1}`)
      ws.send(JSON.stringify({"type": "handshake", "id": cts.length-1}))
      console.log(`[network] HANDSHAKE SENT TO CLIENT ${cts.length-1}`)

      // ADD NEW BOARD
      if (!board_inits.includes(text["board"])) {
        board_inits.push(text["board"])
        console.log("BOARD PUSHED")

      // SEND SYNC REQUEST WHEN LOADING OLD BOARD
      } else {  // request the board from a client that has it
//        try {  // only way to escape a forEach is to throw it
          for (let i=0; i<bds.length; i++) {
            if (bds[i] == text["board"]) {
              cts[i].send(JSON.stringify({"type": "foreign-sync", "id": cts.length-1}))
              console.log(`[sync] SYNC REQUESTED TO ${cts.indexOf(cts[i])}`)
              break
            }
          }
//        } catch {}
      }

      // FORWARD BOARD TO ANOTHER CLIENT
    } else if (text["type"] == "foreign-sync-return") {
      const updated_board = JSON.stringify(text)
      cts[text["id"]].send(updated_board)  // relay the new board from the updated client to the one needing sync
      console.log(`[sync] SYNC SENT TO ${text["id"]}`)
      
      // RELAY BOARDS TO OTHER CLIENTS
    } else if (text["type"] == "update") {
      console.log(`[boards] UPDATE FROM ${ws}: ${text}`)
      board_id = bds[cts.indexOf(ws)]
      //current_board = text["strokes"]
      console.log("BID", board_id, "UPDATETEXT", text)
      wss.clients.forEach(client => {
        if (bds[cts.indexOf(client)] == board_id) {  // if the client is ready and they have access to the board
          console.log(`[traffic] SENT TO ${cts.indexOf(client)}`)
          client.send(JSON.stringify(text));  // fwd the message
        } else if (client == ws) {
          console.log(`[boards] SUPPRESSED RETURN TO SENDER ${cts.indexOf(client)}`)
        };
      });
    }
  });
});

console.log("[network] LIVE ON ws://localhost:8080");
