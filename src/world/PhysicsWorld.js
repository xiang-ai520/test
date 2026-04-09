import RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsWorld {
  constructor() {
    this.RAPIER = RAPIER;
    this.world = null;
  }

  async init() {
    await this.RAPIER.init();
    this.world = new this.RAPIER.World({ x: 0, y: -28, z: 0 });
    this.world.timestep = 1 / 60;
    return this;
  }

  createStaticBox({ x, y, z, hx, hy, hz, userData }) {
    const rigidBody = this.world.createRigidBody(this.RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    const collider = this.world.createCollider(this.RAPIER.ColliderDesc.cuboid(hx, hy, hz), rigidBody);
    collider.userData = userData;
    return { rigidBody, collider };
  }

  createSensor({ x, y, z, hx, hy, hz, userData }) {
    const rigidBody = this.world.createRigidBody(this.RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    const collider = this.world.createCollider(this.RAPIER.ColliderDesc.cuboid(hx, hy, hz).setSensor(true), rigidBody);
    collider.userData = userData;
    return { rigidBody, collider };
  }

  createStaticTrimesh({ vertices, indices, x=0, y=0, z=0 }) {
    const rigidBody = this.world.createRigidBody(this.RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    const collider = this.world.createCollider(this.RAPIER.ColliderDesc.trimesh(vertices, indices), rigidBody);
    return { rigidBody, collider };
  }

  createDynamicPlayerCapsule({ x, y, z, radius, halfHeight }) {
    const rigidBody = this.world.createRigidBody(
      this.RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setCanSleep(false)
        .lockRotations()
    );
    const collider = this.world.createCollider(
      this.RAPIER.ColliderDesc.capsule(halfHeight, radius).setFriction(0.2),
      rigidBody
    );
    return { rigidBody, collider };
  }

  castRay(origin, direction, maxToi, options = {}) {
    const ray = new this.RAPIER.Ray(origin, direction);
    const predicate = options.excludeCollider || options.excludeRigidBody
      ? (collider) => {
        if (options.excludeCollider && collider.handle === options.excludeCollider.handle) return false;
        if (options.excludeRigidBody && collider.parent()?.handle === options.excludeRigidBody.handle) return false;
        return true;
      }
      : undefined;
    return this.world.castRay(
      ray,
      maxToi,
      options.solid ?? false,
      undefined,
      undefined,
      predicate
    );
  }

  step() {
    this.world.step();
  }

  removeRigidBody(rigidBody) {
    this.world.removeRigidBody(rigidBody);
  }
}
