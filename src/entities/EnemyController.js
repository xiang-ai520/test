import * as THREE from "three";
import { tileToWorld } from "../world/LevelData.js";
import { makeToonMaterial } from "../visual/ToonMaterials.js";

export class EnemyController {
  constructor(scene, spawn, assets = null) {
    this.scene = scene;
    this.spawn = spawn;
    this.assets = assets;
    this.alive = true;
    this.squashTimer = 0;
    this.speed = spawn.speed ?? 2.8;
    this.direction = Math.random() > 0.5 ? 1 : -1;
    this.axis = spawn.axis ?? "x";
    this.type = spawn.type ?? "walker";
    this.range = spawn.range ?? 4.5;
    this.basePosition = tileToWorld(spawn.x, spawn.y, spawn.z ?? 0);
    this.position = new THREE.Vector3(this.basePosition.x, this.basePosition.y + 0.35, this.basePosition.z);
    this.minX = this.basePosition.x - this.range;
    this.maxX = this.basePosition.x + this.range;
    this.minZ = this.basePosition.z - this.range;
    this.maxZ = this.basePosition.z + this.range;
    this.mesh = this._buildMesh();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  _buildMesh() {
    const modelName = this.type === "beetle" ? "enemyBeetle" : "enemyWalker";
    const model = this.assets?.instantiateModel(modelName);
    if (model) {
      model.scale.setScalar(this.type === "beetle" ? 0.92 : 0.98);
      model.position.y = this.type === "beetle" ? -0.52 : -0.58;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          child.frustumCulled = false;
        }
      });
      return model;
    }

    const group = new THREE.Group();
    const bodyMaterial = makeToonMaterial({ color: this.type === "beetle" ? "#6b62d9" : "#98603d" });
    const faceMaterial = makeToonMaterial({ color: this.type === "beetle" ? "#eceaff" : "#f0d4b2" });
    const footMaterial = makeToonMaterial({ color: "#2e2234" });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, this.type === "beetle" ? 0.65 : 0.8, 1.1), bodyMaterial);
    const shell = this.type === "beetle"
      ? new THREE.Mesh(new THREE.BoxGeometry(1, 0.42, 0.9), makeToonMaterial({ color: "#9b90ff", emissive: "#26185e" }))
      : null;
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.1), faceMaterial);
    const footA = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.5), footMaterial);
    const footB = footA.clone();
    const eyeA = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), makeToonMaterial({ color: "#21192d" }));
    const eyeB = eyeA.clone();
    face.position.set(0, 0.02, 0.55);
    footA.position.set(-0.26, -0.42, 0.1);
    footB.position.set(0.26, -0.42, 0.1);
    eyeA.position.set(-0.15, 0.08, 0.62);
    eyeB.position.set(0.15, 0.08, 0.62);
    if (shell) {
      shell.position.y = 0.18;
      group.add(shell);
    }
    group.add(body, face, footA, footB, eyeA, eyeB);
    return group;
  }

  update(dt) {
    if (!this.alive) {
      this.squashTimer = Math.max(0, this.squashTimer - dt);
      this.mesh.scale.y = Math.max(0.2, this.squashTimer / 0.4);
      return;
    }

    if (this.axis === "x") {
      this.position.x += this.direction * this.speed * dt;
      if (this.position.x < this.minX || this.position.x > this.maxX) {
        this.direction *= -1;
        this.position.x = THREE.MathUtils.clamp(this.position.x, this.minX, this.maxX);
      }
    } else {
      this.position.z += this.direction * this.speed * dt;
      if (this.position.z < this.minZ || this.position.z > this.maxZ) {
        this.direction *= -1;
        this.position.z = THREE.MathUtils.clamp(this.position.z, this.minZ, this.maxZ);
      }
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.axis === "x"
      ? (this.direction > 0 ? Math.PI : 0)
      : (this.direction > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
    const wobble = Math.sin(performance.now() * 0.008 + this.basePosition.x);
    this.mesh.position.y = this.position.y + wobble * 0.05;
    this.mesh.rotation.z = wobble * 0.05;
  }

  checkPlayer(player) {
    if (!this.alive) return null;
    const p = player.getPosition();
    const v = player.getVelocity();
    const close = Math.abs(p.x - this.position.x) < 0.95 &&
      Math.abs(p.y - this.position.y) < 1.1 &&
      Math.abs(p.z - this.position.z) < 1.2;
    if (!close) return null;
    return v.y < -0.2 && p.y > this.position.y + 0.72 ? "stomp" : "hurt";
  }

  squash() {
    this.alive = false;
    this.squashTimer = 0.4;
    this.mesh.scale.y = 0.35;
  }
}
