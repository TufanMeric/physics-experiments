import { Vector2 } from '../Vector2';

// Export a function that takes 2 circles and returns a boolean indicating if they intersect
export function circleToCircle(
  c1Rad: number,
  c1Pos: Vector2,
  c2Rad: number,
  c2Pos: Vector2
): boolean {
  // Calculate the distance between the 2 circles.
  const dist = Math.sqrt(
    Math.pow(c1Pos.x - c2Pos.x, 2) + Math.pow(c1Pos.y - c2Pos.y, 2)
  );

  // If the distance is less than the sum of the 2 radii, the circles intersect
  return dist < c1Rad + c2Rad;
}
