/**
 * A pair of bodies that are in contact.
 */

import { PhysicsBody } from './PhysicsBody';

export type Pair = {
  bodyA: PhysicsBody;
  bodyB: PhysicsBody;
};
