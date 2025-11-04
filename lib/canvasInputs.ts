import { Stroke } from '@/types/strokeTypes';

// ----- Parameter type definitions ----- 

type handleMouseDownParameters = {
    e: React.MouseEvent;
    currentColour: string;
    setCurrentStroke: (object: Stroke) => void;
    setIsToolDown: (state: boolean) => void;
}

type handleMouseMoveParameters = {
    e: React.MouseEvent;
    setCurrentStroke: React.Dispatch<React.SetStateAction<Stroke | null>>;
    isToolDown: boolean;
}

type handleMouseUpParameters = {
    isToolDown: boolean;
    setIsToolDown: (state: boolean) => void;
    currentStroke: Stroke | null;
    setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
    setCurrentStroke: (object: Stroke | null) => void;
}

// ----- Function definitions ----- 

const handleMouseDown = ({ e, currentColour, setCurrentStroke, setIsToolDown }: handleMouseDownParameters) => {
    setIsToolDown(true);
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCurrentStroke({ points: [point], colour: currentColour });
}

const handleMouseMove = ({ e, setCurrentStroke, isToolDown }: handleMouseMoveParameters) => {
    if (!isToolDown) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCurrentStroke((prev) => {
        if (!prev) return null;
        return { ...prev, points: [...prev.points, point] };
    });
}

const handleMouseUp = ({ isToolDown, setIsToolDown, currentStroke, setStrokes, setCurrentStroke }: handleMouseUpParameters) => {
    if (!isToolDown) return;
    setIsToolDown(false);
    if (currentStroke) {
        setStrokes((prev) => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
}

// ----- function exports ----- 

export { handleMouseDown, handleMouseMove, handleMouseUp };