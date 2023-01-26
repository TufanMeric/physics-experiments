/**
 * Represents a 2D vector.
 */

export class Vector2 {
  dot(normal: Vector2) {
    return this.x * normal.x + this.y * normal.y;
  }
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  normalize() {
    const length = this.length();
    this.x /= length;
    this.y /= length;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
}
