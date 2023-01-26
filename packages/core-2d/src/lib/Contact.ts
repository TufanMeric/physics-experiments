import { PhysicsBody } from './PhysicsBody';
import { Vector2 } from './Vector2';

export interface Contact {
  bodyA: PhysicsBody;
  bodyB: PhysicsBody;

  // Normal vector from bodyA to bodyB
  normal: Vector2;

  // Depth of penetration
  penetration: number;

  // Point of contact
  point: Vector2;
}
