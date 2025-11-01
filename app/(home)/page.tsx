import { redirect } from 'next/navigation';
import React from 'react'
import WebSocket, { WebSocketServer } from "ws";

const Page = () => {

    // this code is temporary - redirect user to random uuid
    const uuid = crypto.randomUUID();


        // socket stuff
        /*const wss = new WebSocketServer({ port: 8080 });
        wss.on("connection", (ws) => {
        console.log("Client connected");
        ws.on("message", (message) => {
            console.log("Received:", message);
            ws.send(`Echo: ${message}`);
        });
        });*/

        // uuid
    redirect(`/board/${uuid}`);

    return (
        <div className='w-screen h-screen'>
            This is the home page
        </div>
    )
}

export default Page