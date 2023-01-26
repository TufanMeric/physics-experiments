import { AABB } from './AABB';
import { PhysicsBody } from './PhysicsBody';
import { Pair } from './Pair';
import { Vector2 } from './Vector2';

export class SpatialGrid {
  width: number;
  height: number;
  readonly cellSize: number;
  readonly partitions: Array<Set<PhysicsBody>>;

  pairsResult: Pair[] = new Array(65536);
  readonly aabbQueryResult: PhysicsBody[] = new Array(128);
  readonly aabbToCellsResult: number[] = new Array(128);

  /**
   * Creates a new spatial grid.
   * @param cellSize The size of each cell in the grid.
   * @param width The width of the grid.
   * @param height The height of the grid.
   */
  constructor(cellSize: number, width: number, height: number) {
    this.cellSize = cellSize;
    this.width = width;
    this.height = height;

    this.partitions = new Array(this.width * this.height);
    for (let i = 0; i < this.partitions.length; i++) {
      this.partitions[i] = new Set();
    }
  }

  /**
   * Converts a world position to cell coordinates.
   * @param vec The world position.
   * @returns The cell coordinates.
   */
  worldToCell(vec: Vector2): Vector2 {
    // Check if the vector is outside the grid.
    if (
      vec.x < 0 ||
      vec.x >= this.width * this.cellSize ||
      vec.y < 0 ||
      vec.y >= this.height * this.cellSize
    ) {
      console.log(
        'Vector is outside the grid.',
        vec,
        this.width * this.cellSize,
        this.height * this.cellSize
      );
    }

    return new Vector2(
      Math.floor(vec.x / this.cellSize),
      Math.floor(vec.y / this.cellSize)
    );
  }

  /**
   * Returns all cells that intersect with the given AABB.
   * @param aabb The AABB to query.
   * @returns An array of cell indices.
   */
  getCellsInAABB(aabb: AABB): number[] {
    const min = this.worldToCell(aabb.min);
    const max = this.worldToCell(aabb.max);

    let count = 0;
    for (let y = min.y; y <= max.y; y++) {
      for (let x = min.x; x <= max.x; x++) {
        // clamp to grid
        const cellX = Math.max(0, Math.min(this.width - 1, x));
        const cellY = Math.max(0, Math.min(this.height - 1, y));

        // add to result
        this.aabbToCellsResult[count++] = cellX + cellY * this.width;
      }
    }

    return this.aabbToCellsResult.slice(0, count);
  }

  /**
   * Adds a body to the grid.
   * @param body The body to add.
   */
  addBody(body: PhysicsBody): void {
    const cells = this.getCellsInAABB(body.aabb);
    for (let i = 0; i < cells.length; i++) {
      this.partitions[cells[i]].add(body);
    }
    body.isInGrid = true;
  }

  /**
   * Removes a body from the grid.
   * @param body The body to remove.
   */
  removeBody(body: PhysicsBody): void {
    const cells = this.getCellsInAABB(body.aabb);
    for (let i = 0; i < cells.length; i++) {
      this.partitions[cells[i]].delete(body);
    }
    body.isInGrid = false;
  }

  /**
   * Returns all bodies in the grid that intersect the given AABB.
   * @param aabb The AABB to query.
   * @returns {PhysicsBody[]} An array of bodies.
   */
  queryAABB(aabb: AABB): PhysicsBody[] {
    const cells = this.getCellsInAABB(aabb);

    let count = 0;
    for (let i = 0; i < cells.length; i++) {
      const partition = this.partitions[cells[i]];
      for (const body of partition) {
        this.aabbQueryResult[count++] = body;
      }
    }

    return this.aabbQueryResult.slice(0, count);
  }

  /**
   * Generates collision pairs for all bodies in the grid.
   * @returns An array of collision pairs.
   */
  generatePairs(bodies: Set<PhysicsBody>): Pair[] {
    // Add bodies to grid if they are not already in it.
    for (const body of bodies) {
      body._internalLastPairId = -1;
      if (!body.isInGrid) {
        this.addBody(body);
      }
    }

    // Loop through all bodies in the grid and generate pairs if their AABBs intersect.
    let count = 0;
    for (let i = 0; i < this.partitions.length; i++) {
      const partition = this.partitions[i];
      for (const bodyA of partition) {
        // Skip if body is sleeping.
        if (bodyA.isSleeping) continue;
        // Remove body from grid to avoid generating duplicate pairs.
        this.removeBody(bodyA);
        // Query for bodies that intersect with bodyA's AABB.
        const intersectingBodies = this.queryAABB(bodyA.aabb);
        for (const bodyB of intersectingBodies) {
          // Skip if duplicate pair.
          if (bodyA.id === bodyB._internalLastPairId) {
            //console.log('duplicate pair', bodyA.id, bodyB.id);
            continue;
          }
          //console.log('new pair', bodyA.id, bodyB.id);
          // Update last pair id to avoid duplicate pairs.
          bodyB._internalLastPairId = bodyA.id;
          // Add pair to result.
          this.pairsResult[count++] = { bodyA, bodyB };
        }
      }
    }

    return this.pairsResult.slice(0, count);
  }
}
