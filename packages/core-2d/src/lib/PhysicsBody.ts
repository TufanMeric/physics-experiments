import { AABB } from './AABB';
import { Shape } from './Shape';
import { Vector2 } from './Vector2';
import { World } from './World';

const SLEEP_TIME_THRESHOLD = 1;
const SLEEP_VELOCITY_THRESHOLD = 0.01;
/**
 * A body is a physical object in the game world.
 */
export class PhysicsBody {
  readonly id: number;
  position: Vector2 = new Vector2(0, 0);
  velocity: Vector2 = new Vector2(0, 0);

  world!: World;

  private _isSleeping: boolean = false;
  private _idleTime: number = 0;
  /**
   * Indicates whether the body is sleeping.
   * @remarks
   * A sleeping body will not be updated until it is woken up.
   * @see {@link https://en.wikipedia.org/wiki/Sleep_(computer_science)}
   */
  public get isSleeping(): boolean {
    return this._isSleeping;
  }
  public set isSleeping(value: boolean) {
    this._isSleeping = value;
  }

  private _mass!: number;
  /**
   * The mass of the body.
   * @remarks
   * The mass of a body is used to calculate the force of gravity and the
   * impulse of collisions.
   */
  public get mass(): number {
    return this._mass;
  }
  public set mass(value: number) {
    this._mass = value;
    this._invMass = 1 / this.mass;
  }

  private _invMass!: number;
  /**
   * The inverse mass of the body.
   * @remarks
   * The inverse mass is used to calculate the impulse of collisions.
   */
  public get invMass(): number {
    return this._invMass;
  }

  /**
   * The shape of the body.
   * @remarks
   * The shape of a body is used to calculate collisions.
   */
  shape: Shape;

  /**
   * The friction of the body.
   * @remarks
   * The friction of a body is used to calculate the friction impulse of
   * collisions.
   * @see {@link https://en.wikipedia.org/wiki/Friction}
   * @see {@link https://en.wikipedia.org/wiki/Coulomb%27s_law}
   */
  friction: number = 0.1;

  /**
   * The restitution of the body.
   * @remarks
   * The restitution of a body is used to calculate the restitution impulse of
   * collisions.
   * @see {@link https://en.wikipedia.org/wiki/Coefficient_of_restitution}
   */
  restitution: number = 0.5;

  /**
   * The linear drag of the body.
   * @remarks
   * The linear drag of a body is used to calculate the drag force.
   * @see {@link https://en.wikipedia.org/wiki/Drag_(physics)}
   * @see {@link https://en.wikipedia.org/wiki/Drag_coefficient}
   */
  linearDrag: number = 0.1;

  /**
   * Indicates whether the body is static.
   * @remarks
   * A static body is not affected by gravity or collisions.
   */
  isStatic: boolean = false;

  /**
   * Indicates whether the body is a sensor.
   * @remarks
   * A sensor body is not affected by collisions, but it can trigger collision
   * events.
   */
  isSensor: boolean = false;

  /**
   * The axis-aligned bounding box of the body.
   * @remarks
   * The AABB is used to calculate collisions.
   */
  aabb: AABB = { min: new Vector2(0, 0), max: new Vector2(0, 0) };

  isInGrid: boolean = false;

  /** @internal */
  _internalLastPairId: number = -1;

  constructor(id: number, mass: number, shape: Shape) {
    this.id = id;
    this.mass = mass;
    this.shape = shape;
  }

  /**
   * Apply a force to the body.
   * @param force The force to apply.
   * @remarks
   * The force is applied to the center of mass.
   * @see {@link https://en.wikipedia.org/wiki/Force}
   * @see {@link https://en.wikipedia.org/wiki/Center_of_mass}
   */
  applyForce(force: Vector2) {
    if (this.isStatic) {
      return;
    }

    this.velocity.x += force.x * this.invMass;
    this.velocity.y += force.y * this.invMass;
  }

  /**
   * Integrate the body.
   * @param dt The time delta.
   */
  integrate(dt: number) {
    // Do not integrate static bodies.
    if (this.isStatic) {
      return;
    }

    // Sleep or wake up the body based on its velocity.
    this.sleepTick(dt);

    // Do not integrate sleeping bodies.
    if (this.isSleeping) {
      return;
    }

    // Apply linear drag.
    this.velocity.x *= 1 - this.linearDrag * dt;
    this.velocity.y *= 1 - this.linearDrag * dt;

    // Apply gravity.
    this.velocity.x += this.world.gravity.x * dt;
    this.velocity.y += this.world.gravity.y * dt;

    // Integrate velocity.
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }

  /**
   * Sleep the body if it is almost still for a while.
   */
  sleepTick(dt: number) {
    if (
      this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y <
      SLEEP_VELOCITY_THRESHOLD
    ) {
      this._idleTime += dt;
    } else {
      this._idleTime = 0;
    }

    if (this._idleTime > SLEEP_TIME_THRESHOLD) {
      this.isSleeping = true;
    }
  }

  wakeUp() {
    this.isSleeping = false;
  }
}
