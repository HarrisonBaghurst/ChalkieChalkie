import { Stroke } from "@/types/strokeTypes";

type DrawToCanavsParameters = {
    strokes: Stroke[],
    currentStroke: Stroke | null,
    canvasRef: React.RefObject<HTMLCanvasElement | null>
}

const drawToCanvas = ({ strokes, currentStroke, canvasRef }: DrawToCanavsParameters) => {
    
    // get current canvas and context
    const canvas = canvasRef.current;
    if (!canvas) return;

    // set canvas size 
    const { clientWidth, clientHeight } = canvas;
    if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
        canvas.width = clientWidth;
        canvas.height = clientHeight;
    }

    // get canvas context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // canvas setup 
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

}

export default drawToCanvas;