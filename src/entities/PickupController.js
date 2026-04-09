import * as THREE from "three";
import { tileToWorld } from "../world/LevelData.js";
import { makeToonMaterial } from "../visual/ToonMaterials.js";

export class PickupController {
  constructor(scene, x, y, z = 0, assets = null, kind = "coin") {
    this.scene = scene;
    this.assets = assets;
    this.kind = kind;
    const world = tileToWorld(x, y, z);
    this.position = new THREE.Vector3(world.x, world.y, world.z);
    this.mesh = this._buildMesh(kind);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
    this.collected = false;
    this.phase = Math.random() * Math.PI * 2;
  }

  _buildMesh(kind) {
    const modelKey = kind === "coin" ? "coin" : null;
    if (modelKey) {
      const model = this.assets?.instantiateModel(modelKey);
      if (model) {
        model.scale.setScalar(kind === "coin" ? 1.1 : 1);
        return model;
      }
    }

    if (kind === "star") {
      const group = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.42, 0),
        makeToonMaterial({ color: "#ffe36a", emissive: "#7e5700" })
      );
      const glow = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.22, 0),
        makeToonMaterial({ color: "#fff5c4" })
      );
      group.add(core, glow);
      return group;
    }

    if (kind === "jewel") {
      const group = new THREE.Group();
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.4, 0),
        makeToonMaterial({ color: "#69d6ff", emissive: "#0b4e69" })
      );
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.16, 6),
        makeToonMaterial({ color: "#d8f7ff" })
      );
      cap.position.y = 0.28;
      group.add(gem, cap);
      return group;
    }

    const coinMaterial = makeToonMaterial({ color: "#ffe36a", emissive: "#7e5700" });
    const group = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 20), coinMaterial);
    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.2, 14),
      makeToonMaterial({ color: "#fff3ad" })
    );
    center.rotation.z = Math.PI / 2;
    disc.rotation.z = Math.PI / 2;
    group.add(disc, center);
    return group;
  }

  update(dt) {
    if (this.collected) return;
    this.phase += dt * 4;
    this.mesh.rotation.y += dt * (this.kind === "coin" ? 4 : 2.6);
    this.mesh.position.y = this.position.y + Math.sin(this.phase) * 0.22;
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    this.scene.remove(this.mesh);
  }
}
