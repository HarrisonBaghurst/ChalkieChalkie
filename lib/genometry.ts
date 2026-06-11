import { Point, Stroke } from "@/types/strokeTypes";

// TODO: hit-testing here is point-based, but strokes are RDP-simplified on
// commit (a straight line stores only its 2 endpoints), so the eraser
// (StrokeIntersectPoints) and selector (strokeIntersectsRect) miss the middle
// of long straight segments. Use point-to-segment distance and segment-rect
// intersection over consecutive point pairs instead.
export function StrokeIntersectPoints(
    stroke: Stroke,
    point: Point,
    radius: number,
) {
    return stroke.points.some(p => {
        const dx = p.x - point.x;
        const dy = p.y - point.y;
        return dx * dx + dy * dy <= radius * radius;
    })
}

export type Rect = { x: number; y: number; width: number; height: number };

export function normaliseRect(r: Rect): Rect {
    return {
        x: r.width >= 0 ? r.x : r.x + r.width,
        y: r.height >= 0 ? r.y : r.y + r.height,
        width: Math.abs(r.width),
        height: Math.abs(r.height),
    };
}

export function pointInRect(point: Point, rect: Rect): boolean {
    const r = normaliseRect(rect);
    return (
        point.x >= r.x &&
        point.x <= r.x + r.width &&
        point.y >= r.y &&
        point.y <= r.y + r.height
    );
}

export function strokeIntersectsRect(stroke: Stroke, rect: Rect): boolean {
    const r = normaliseRect(rect);
    return stroke.points.some(
        (p) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height,
    );
}

export function imageIntersectsRect(
    img: { x: number; y: number; width: number; height: number },
    rect: Rect,
): boolean {
    const r = normaliseRect(rect);
    return (
        img.x < r.x + r.width &&
        img.x + img.width > r.x &&
        img.y < r.y + r.height &&
        img.y + img.height > r.y
    );
}