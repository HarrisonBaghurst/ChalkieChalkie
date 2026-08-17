import { Point, Stroke } from "@/types/strokeTypes";

// Segment-based, not point-based: RDP simplification on commit discards the
// intermediate points a stroke was drawn with.
function pointToSegmentDistanceSq(p: Point, a: Point, b: Point): number {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    let t = lenSq === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const dx = p.x - (a.x + t * abx);
    const dy = p.y - (a.y + t * aby);
    return dx * dx + dy * dy;
}

export function StrokeIntersectPoints(
    stroke: Stroke,
    point: Point,
    radius: number,
) {
    const pts = stroke.points;
    if (pts.length === 0) return false;

    const radiusSq = radius * radius;
    if (pts.length === 1) {
        const dx = pts[0].x - point.x;
        const dy = pts[0].y - point.y;
        return dx * dx + dy * dy <= radiusSq;
    }

    for (let i = 0; i < pts.length - 1; i++) {
        if (pointToSegmentDistanceSq(point, pts[i], pts[i + 1]) <= radiusSq) {
            return true;
        }
    }
    return false;
}

export type Rect = { x: number; y: number; width: number; height: number };

export const PEN_LINE_WIDTH = 3;
export const HIGHLIGHT_LINE_WIDTH = 48;

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

function segmentsIntersect(
    p1: Point,
    p2: Point,
    p3: Point,
    p4: Point,
): boolean {
    const cross = (a: Point, b: Point, c: Point) =>
        (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const d1 = cross(p3, p4, p1);
    const d2 = cross(p3, p4, p2);
    const d3 = cross(p1, p2, p3);
    const d4 = cross(p1, p2, p4);
    return (
        ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
    );
}

export function strokeIntersectsRect(stroke: Stroke, rect: Rect): boolean {
    const r = normaliseRect(rect);
    const pts = stroke.points;
    if (pts.length === 0) return false;

    // Covers dots and endpoints.
    if (pts.some((p) => pointInRect(p, r))) return true;
    if (pts.length === 1) return false;

    const corners = [
        { x: r.x, y: r.y },
        { x: r.x + r.width, y: r.y },
        { x: r.x + r.width, y: r.y + r.height },
        { x: r.x, y: r.y + r.height },
    ];
    for (let i = 0; i < pts.length - 1; i++) {
        for (let e = 0; e < 4; e++) {
            if (
                segmentsIntersect(
                    pts[i],
                    pts[i + 1],
                    corners[e],
                    corners[(e + 1) % 4],
                )
            ) {
                return true;
            }
        }
    }
    return false;
}
export function strokeBounds(stroke: Stroke, offset?: Point): Rect | null {
    const pts = stroke.points;
    if (pts.length === 0) return null;

    let minX = pts[0].x;
    let maxX = pts[0].x;
    let minY = pts[0].y;
    let maxY = pts[0].y;

    for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    const pad = (stroke.highlight ? HIGHLIGHT_LINE_WIDTH : PEN_LINE_WIDTH) / 2;
    const dx = offset?.x ?? 0;
    const dy = offset?.y ?? 0;

    return {
        x: minX - pad + dx,
        y: minY - pad + dy,
        width: maxX - minX + pad * 2,
        height: maxY - minY + pad * 2,
    };
}

export function unionRects(rects: Rect[]): Rect | null {
    if (rects.length === 0) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const r of rects) {
        minX = Math.min(minX, r.x);
        maxX = Math.max(maxX, r.x + r.width);
        minY = Math.min(minY, r.y);
        maxY = Math.max(maxY, r.y + r.height);
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function selectedItemBounds(
    strokes: readonly Stroke[],
    images: readonly {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }[],
    selectedStrokeIds: string[],
    selectedImageIds: string[],
    strokeOffset?: Point,
): Rect[] {
    const bounds: Rect[] = [];
    const strokeIds = new Set(selectedStrokeIds);
    const imageIds = new Set(selectedImageIds);

    for (const stroke of strokes) {
        if (!strokeIds.has(stroke.id)) continue;
        const box = strokeBounds(stroke, strokeOffset);
        if (box) bounds.push(box);
    }

    for (const img of images) {
        if (!imageIds.has(img.id)) continue;
        bounds.push({
            x: img.x,
            y: img.y,
            width: img.width,
            height: img.height,
        });
    }

    return bounds;
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
