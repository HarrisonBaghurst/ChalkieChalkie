'use client'

import React, { useEffect, useRef, useState } from 'react'
import ToolBar from './ToolBar';
import { useParams, usePathname } from 'next/navigation';
import hypo from '@/lib/numUtils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

type Point = {
    x: number;
    y: number;
}

type Stroke = {
    points: Point[];
    colour: string;
}

type Tool = 'chalk' | 'eraser' | 'select';

const Board = () => {
    // persistant reference to canvas 
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [isToolDown, setIsToolDown] = useState(false);
    const [tool, setTool] = useState<Tool>('chalk');
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentColour, setCurrentColour] = useState('hsl(44,53%,74%)');
    const [id, setID] = useState<number | null>(null);
    const [recieveblocker, setRecieveBlocker] = useState(false)

    const [loadingAPI, setLoadingAPI] = useState(false);
    const [latexResult, setLatexResult] = useState('');
    const [openDialog, setOpenDialog] = useState(false);

    const [selectionStart, setSelectionStart] = useState<Point | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);

    const [removedStrokes, setRemovedStrokes] = useState<Stroke[]>([]);

    const [socket, setSocket] = useState<WebSocket | null>(null);

    const [fullUrl, setFullUrl] = useState<string>('');

    const params = useParams();

    const pathname = usePathname();

    const strokesRef = useRef<Stroke[]>([]);

    useEffect(() => {
        // set url
        if (window) {
            setFullUrl(`${window.location.origin}${pathname}`)
        }

        // socket setup
        setSocket(new WebSocket("ws://10.247.34.160:8080"));

        // dynamically set the size of the canvas to the container width
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // add ctrl+z event listener 
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
                event.preventDefault();
                handleUndo();
            }
            else if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
                event.preventDefault();
                handleRedo();
            }
        }
        window.addEventListener("keydown", handleKeyDown);

        // clean up on unmount 
        return () => window.removeEventListener("keydown", handleKeyDown);

    }, []);


    useEffect(() => {
        if (!socket) return;
        socket.onopen = () => {
            console.log("[client] SENT CONNECT REQ");
            const msg = JSON.stringify({ "type": "connect", "board": params["slug"] })
            socket.send(msg);
        };

        socket.onmessage = (event: MessageEvent) => {
            const received = JSON.parse(event.data)
            console.log("rec test", received)

            // handshake to let server know which board the client wants
            if (received['type'] == "handshake") {
                console.log("[client] RECEIVED HANDSHAKE; ID" + received['id'])
                setID(received['id'])

            // send the board to a new client
            } else if (received["type"] == "foreign-sync") {
                received['type'] = "foreign-sync-return"
                received['board'] = strokesRef.current
                socket.send(JSON.stringify(received))

            // receive the board from another client on load (if board isn't new)
            } else if (received["type"] == "foreign-sync-return") {
                console.log("RECEIVED: ", received['board'])
                setRecieveBlocker(true)
                setStrokes(received['board'])

            // recieve board updates
            } else if (received["type"] == "update") { 
                if (strokes == received["strokes"]) return;
                const updated_board = JSON.parse(received["strokes"])
                console.log("[client] RECIEVED PURGED BOARD: ", updated_board)
                setRecieveBlocker(true)
                setStrokes(updated_board)
                console.log("[client] UPDATED");
            }
        };
    }, [socket]);

    useEffect(() => {
        strokesRef.current = strokes;  // update strokes for sync requests

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // combine strokes and current stroke
        const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

        // draw all strokes
        for (const stroke of allStrokes) {
            if (stroke.points.length < 2) continue;
            ctx.beginPath();
            ctx.strokeStyle = stroke.colour;
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

            for (let i = 1; i < stroke.points.length - 2; i++) {
                const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
                const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
                ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
            }

            const last = stroke.points.length - 1;
            ctx.quadraticCurveTo(
                stroke.points[last - 1].x,
                stroke.points[last - 1].y,
                stroke.points[last].x,
                stroke.points[last].y
            );
            ctx.stroke();
        }

        // draw selection rectangle if active
        if (isSelecting && selectionStart && selectionEnd) {
            const x = Math.min(selectionStart.x, selectionEnd.x);
            const y = Math.min(selectionStart.y, selectionEnd.y);
            const w = Math.abs(selectionStart.x - selectionEnd.x);
            const h = Math.abs(selectionStart.y - selectionEnd.y);

            ctx.save();
            ctx.strokeStyle = 'rgba(0, 128, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6]);
            ctx.strokeRect(x, y, w, h);

            // optional semi-transparent fill for better UX
            ctx.fillStyle = 'rgba(0, 128, 255, 0.15)';
            ctx.fillRect(x, y, w, h);
            ctx.restore();
        }
    }, [strokes, currentStroke, isSelecting, selectionStart, selectionEnd]);


    useEffect(() => {
        if (recieveblocker) {
            setRecieveBlocker(false);
            return;
        }
        if (!socket) return;
        if (socket.readyState === WebSocket.OPEN) {
            console.log("SENDING", JSON.stringify(strokes))
            socket.send(JSON.stringify({"type": "update", "strokes": JSON.stringify(strokes)}));
        }
        else {
            console.warn("Socket not ready, state: ", socket.readyState);
        }
        setRecieveBlocker(false);

    }, [strokes]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (tool === 'select') {
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setSelectionStart(start);
            setSelectionEnd(start);
            setIsSelecting(true);
            return
        }

        setIsToolDown(true);
        if (tool === 'chalk') {
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setCurrentStroke({ points: [point], colour: currentColour });
        }
        else if (tool === 'eraser') {
            handleErase(e);
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (tool === 'select' && isSelecting) {
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const end = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setSelectionEnd(end);
            return;
        }

        if (!isToolDown) return;
        if (tool === 'chalk') {
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setCurrentStroke((prev) => {
                if (!prev) return null;
                return { ...prev, points: [...prev.points, point] };
            });
        }
        else if (tool === 'eraser') {
            handleErase(e);
        }
    }

    const handleMouseUp = () => {
        if (tool === 'select' && isSelecting) {
            setIsSelecting(false);
            handleSelectionComplete();
            setTool('chalk');
            return;
        }

        if (!isToolDown) return;
        setIsToolDown(false);
        if (tool === 'chalk') {
            if (currentStroke) {
                setStrokes((prev) => [...prev, currentStroke]);
            }
            setCurrentStroke(null);
            setRemovedStrokes([]);
        }
    }

    const handleUndo = () => {
        setStrokes((prev) => {
            if (prev.length === 0) return prev;
            const updatedStrokes = prev.slice(0, -1);
            const lastStroke = prev[prev.length - 1];
            setRemovedStrokes((rPrev) => [...rPrev, lastStroke]);
            return updatedStrokes;
        })
    }

    const handleRedo = () => {
        setRemovedStrokes((rPrev) => {
            if (rPrev.length === 0) return rPrev;
            const updatedRemoved = rPrev.slice(0, -1);
            const lastRemovedStroke = rPrev[rPrev.length - 1];
            setStrokes((prev) => [...prev, lastRemovedStroke]);
            return updatedRemoved;
        })
    }

    const handleChangeColour = (colour: string) => {
        setTool('chalk');
        setCurrentColour(colour);
    }

    const handleSetEraser = () => {
        setTool('eraser');
    }

    const handleErase = (e: React.MouseEvent) => {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        setStrokes((prevStrokes) => {
            const updated = prevStrokes.filter(stroke => {
                return !stroke.points.some(p => hypo(point.x, point.y, p.x, p.y) < 20);
            });
            return updated;
        });

        setRemovedStrokes([]);
    }

    const handleScreenshot = async () => {
        if (loadingAPI) return;
        setTool('select');
        setLoadingAPI(true);
        setSelectionStart(null);
        setSelectionEnd(null);
    };

    const handleSelectionComplete = async () => {
        if (!selectionStart || !selectionEnd || !canvasRef.current) return;
        const canvas = canvasRef.current;

        const x = Math.min(selectionStart.x, selectionEnd.x);
        const y = Math.min(selectionStart.y, selectionEnd.y);
        const width = Math.abs(selectionStart.x - selectionEnd.x);
        const height = Math.abs(selectionStart.y - selectionEnd.y);

        const cropped = document.createElement('canvas');
        cropped.width = width;
        cropped.height = height;
        const ctx = cropped.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) =>
            cropped.toBlob(resolve, 'image/png')
        );
        if (!blob) return;

        const formData = new FormData();
        formData.append('image', blob, 'selection.png');

        try {
            const res = await fetch('/api/latex', {
                method: 'POST',
                body: formData,
            });
            const text = await res.text();
            setLatexResult(text);
            setOpenDialog(true);
        } catch (err) {
            console.error('[Selection Upload Error]:', err);
        } finally {
            setLoadingAPI(false);
            setTool('chalk');
        }
    };

    return (
        <div className='graph-paper'>
            <ToolBar
                handleRedo={handleRedo}
                handleUndo={handleUndo}
                handleChangeColour={handleChangeColour}
                handleSetEraser={handleSetEraser}
                handleScreenshot={handleScreenshot}
                loadingAPI={loadingAPI}
            />
            <canvas
                ref={canvasRef}
                className='w-screen h-screen'
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
            <Dialog open={openDialog} onOpenChange={() => setOpenDialog(!openDialog)}>
                <DialogContent>
                    <DialogHeader className='p-4 flex flex-col gap-6'>
                        <DialogTitle className='text-2xl font-bold flex flex-col'>
                            LaTeX Translation Complete
                            <span className='text-sm text-foreground-second'>Your hand written equations - ready to copy.</span>
                        </DialogTitle>
                        <DialogDescription className='text-foreground text-lg bg-background p-4 rounded-(--rounding-small)'>
                            {latexResult}
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Board