import { PhysicsBody } from './PhysicsBody';
import { SpatialGrid } from './SpatialGrid';
import { Circle } from './Circle';
import { Pair } from './Pair';
import { Vector2 } from './Vector2';
import { Contact } from './Contact';

// Create a physics world
export class World {
  bodies: Set<PhysicsBody> = new Set();
  grid: SpatialGrid;
  private _collisionPairs: Pair[] = [];
  private _contacts: Contact[] = [];
  gravity: Vector2 = new Vector2(0, 0);

  constructor(grid: SpatialGrid) {
    this.grid = grid;
  }

  // Add a body to the world
  addBody(body: PhysicsBody): void {
    body.world = this;
    this.bodies.add(body);
  }

  // Remove a body from the world
  removeBody(body: PhysicsBody): void {
    body.world = this;
    this.bodies.delete(body);
  }

  step(dt: number): void {
    // Broad phase
    this.stepBroadPhase(dt);

    // Narrow phase
    this.stepNarrowPhase(dt);

    // Resolve STATIC collisions
    this.stepResolveStaticCollisions(dt);

    // Resolve collisions
    this.stepResolveCollisions(dt);

    // Integrate
    this.stepIntegrate(dt);

    // Post step
    this.postStep();
  }

  stepResolveStaticCollisions(dt: number) {}

  postStep() {
    this._collisionPairs = [];
    this._contacts = [];
  }

  stepResolveCollisions(dt: number) {
    for (const contact of this._contacts) {
      const bodyA = contact.bodyA;
      const bodyB = contact.bodyB;

      const invMassA = bodyA.isStatic ? 0 : bodyA.invMass;
      const invMassB = bodyB.isStatic ? 0 : bodyB.invMass;

      // If both bodies are static, skip resolving collision
      if (bodyA.isStatic && bodyB.isStatic) {
        continue;
      }
      // Calculate relative velocity
      const rv = new Vector2(
        bodyB.velocity.x - bodyA.velocity.x,
        bodyB.velocity.y - bodyA.velocity.y
      );

      // Calculate relative velocity in terms of the normal direction
      const velAlongNormal = rv.dot(contact.normal);

      // Only resolve if velocity along normal is positive
      // (objects moving apart)
      if (velAlongNormal < 0) {
        // Calculate restitution
        const e = Math.min(bodyA.restitution, bodyB.restitution);

        // Calculate impulse scalar
        let j = -(1 + e) * velAlongNormal;
        j /= invMassA + invMassB;

        // Calculate impulse vector
        const impulse = new Vector2(contact.normal.x * j, contact.normal.y * j);

        // Apply impulse to dynamic bodies
        if (!bodyA.isStatic) {
          bodyA.velocity.x -= impulse.x * bodyA.invMass;
          bodyA.velocity.y -= impulse.y * bodyA.invMass;
        }
        if (!bodyB.isStatic) {
          bodyB.velocity.x += impulse.x * bodyB.invMass;
          bodyB.velocity.y += impulse.y * bodyB.invMass;
        }

        // Friction
        const tangent = new Vector2(
          rv.x - contact.normal.x * velAlongNormal,
          rv.y - contact.normal.y * velAlongNormal
        );
        tangent.normalize();

        // j tangent magnitude
        let jt = -rv.dot(tangent);
        jt /= invMassA + invMassB;

        // Only apply friction impulses if they are not too small
        if (Math.abs(jt) > 0.01) {
          // Coulumb's law
          const tangentImpulse = new Vector2(0, 0);
          if (Math.abs(jt) < j * bodyA.friction) {
            tangentImpulse.x = tangent.x * jt;
            tangentImpulse.y = tangent.y * jt;
          } else {
            tangentImpulse.x = tangent.x * -j * bodyA.friction;
            tangentImpulse.y = tangent.y * -j * bodyA.friction;
          }

          // Apply friction impulse to dynamic bodies
          if (!bodyA.isStatic) {
            bodyA.velocity.x -= tangentImpulse.x * invMassA;
            bodyA.velocity.y -= tangentImpulse.y * invMassA;
          }
          if (!bodyB.isStatic) {
            bodyB.velocity.x += tangentImpulse.x * invMassB;
            bodyB.velocity.y += tangentImpulse.y * invMassB;
          }

          // Set velocity to 0 if it is too small
          if (Math.abs(bodyA.velocity.x) < 0.01) {
            bodyA.velocity.x = 0;
          }
          if (Math.abs(bodyA.velocity.y) < 0.01) {
            bodyA.velocity.y = 0;
          }
          if (Math.abs(bodyB.velocity.x) < 0.01) {
            bodyB.velocity.x = 0;
          }
          if (Math.abs(bodyB.velocity.y) < 0.01) {
            bodyB.velocity.y = 0;
          }
        }
      }

      // Fix penetration (or else velocities will become NaN)
      const percent = 0.2; // usually 20% to 80%
      const slop = 0.01; // usually 0.01 to 0.1
      // Calculate correction of dynamic bodies
      const correction =
        (Math.max(contact.penetration - slop, 0.0) / (invMassA + invMassB)) *
        percent;

      const correctionVector = new Vector2(
        contact.normal.x * correction,
        contact.normal.y * correction
      );

      // Apply the correction to dynamic bodies
      if (!bodyA.isStatic) {
        bodyA.position.x -= correctionVector.x * invMassA;
        bodyA.position.y -= correctionVector.y * invMassA;
      }
      if (!bodyB.isStatic) {
        bodyB.position.x += correctionVector.x * invMassB;
        bodyB.position.y += correctionVector.y * invMassB;
      }
    }
  }

  stepIntegrate(dt: number) {
    for (const body of this.bodies) {
      body.integrate(dt);
    }
  }

  stepNarrowPhase(dt: number) {
    for (const pair of this._collisionPairs) {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;
      const shapeA = bodyA.shape;
      const shapeB = bodyB.shape;

      if (shapeA instanceof Circle && shapeB instanceof Circle) {
        const circleA = shapeA as Circle;
        const circleB = shapeB as Circle;
        const distance = Math.sqrt(
          Math.pow(bodyA.position.x - bodyB.position.x, 2) +
            Math.pow(bodyA.position.y - bodyB.position.y, 2)
        );
        if (distance < circleA.radius + circleB.radius) {
          // Collision detected!
          const normal = new Vector2(
            bodyB.position.x - bodyA.position.x,
            bodyB.position.y - bodyA.position.y
          );
          normal.normalize();
          // Calculate penetration
          const penetration = circleA.radius + circleB.radius - distance;
          // Calculate point of contact
          const point = new Vector2(
            bodyA.position.x + normal.x * circleA.radius,
            bodyA.position.y + normal.y * circleA.radius
          );
          // Add contact to list of contacts
          this._contacts.push({
            bodyA,
            bodyB,
            normal,
            penetration,
            point,
          });

          // Collision should wake up bodies
          bodyA.wakeUp();
          bodyB.wakeUp();
        }
      }
    }
  }

  stepBroadPhase(dt: number) {
    // Update AABBs
    for (const body of this.bodies) {
      if (body.shape instanceof Circle) {
        const circle = body.shape as Circle;
        body.aabb.min.x = body.position.x - circle.radius;
        body.aabb.min.y = body.position.y - circle.radius;
        body.aabb.max.x = body.position.x + circle.radius;
        body.aabb.max.y = body.position.y + circle.radius;
      }
    }

    // Generate collision pairs
    this._collisionPairs = this.grid.generatePairs(this.bodies);

    //console.log(this._collisionPairs);
  }
}
