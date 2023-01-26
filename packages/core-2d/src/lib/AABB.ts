import { Vector2 } from './Vector2';

/**
 * An axis-aligned bounding box.
 * @see https://en.wikipedia.org/wiki/Minimum_bounding_box#Axis-aligned_minimum_bounding_box
 * @see https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection#Axis-Aligned_Bounding_Box
 */
export interface AABB {
  min: Vector2;
  max: Vector2;
}
