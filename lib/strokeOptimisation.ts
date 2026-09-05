import { Point } from "@/types/strokeTypes";

export const SIMPLIFY_EPSILON = 0.5;

const COORD_DECIMALS = 2;
const COORD_FACTOR = 10 ** COORD_DECIMALS;

export const roundCoord = (value: number): number =>
    Math.round(value * COORD_FACTOR) / COORD_FACTOR;

export function roundPoints(points: Point[]): Point[] {
    return points.map((p) => ({ x: roundCoord(p.x), y: roundCoord(p.y) }));
}

// Ramer–Douglas–Peucker; epsilon is the maximum deviation in world units.
export function simplifyRDP(
    points: Point[],
    epsilon = SIMPLIFY_EPSILON,
): Point[] {
    if (points.length < 3) return points;

    const [start, end] = [points[0], points[points.length - 1]];
    let maxDist = 0;
    let index = 0;

    for (let i = 1; i < points.length - 1; i++) {
        const d = perpendicularDistance(points[i], start, end);
        if (d > maxDist) {
            maxDist = d;
            index = i;
        }
    }

    if (maxDist > epsilon) {
        const left = simplifyRDP(points.slice(0, index + 1), epsilon);
        const right = simplifyRDP(points.slice(index), epsilon);
        return left.slice(0, -1).concat(right);
    } else {
        return [start, end];
    }
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    return (
        Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) /
        Math.hypot(dx, dy)
    );
}
