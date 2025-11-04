export type Point = { x: number; y: number };

/**
 * Simplify a polyline using the Ramer–Douglas–Peucker algorithm.
 * @param points Input list of points
 * @param epsilon Maximum allowed deviation (pixels)
 * @returns Simplified list of points
 */
export function simplifyRDP(points: Point[], epsilon = 2): Point[] {
  if (points.length < 3) return points;

  // Find point farthest from line between endpoints
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

  // If the max distance exceeds tolerance, recursively simplify
  if (maxDist > epsilon) {
    const left = simplifyRDP(points.slice(0, index + 1), epsilon);
    const right = simplifyRDP(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    // Otherwise, return endpoints
    return [start, end];
  }
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) /
         Math.hypot(dx, dy);
}
