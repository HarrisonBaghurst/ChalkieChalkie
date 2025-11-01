import Board from '@/components/Board'
import React from 'react'
import WebSocket from 'ws';

const page = () => {
    const socket = new WebSocket("ws://localhost:8080");
    socket.onopen = () => {
        console.log("[client] SEND: Connected! eeee");
        socket.send("Hello, server!");
    };

    socket.onmessage = (event) => {
        console.log("[client] RECIEVED:", event.data);
    };

    socket.onclose = () => {
        console.log("[client] DISCONNECTED");
    };

    return (
        <div className='w-screen h-screen'>
            <Board />
        </div>
    )
}

export default page