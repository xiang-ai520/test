import * as THREE from "three";
import { tileToWorld } from "../world/LevelData.js";
import { PlayerAnimator } from "./PlayerAnimator.js";

const MOVE_FORCE = 10.5;
const JUMP_SPEED = 12.5;
const SPRING_SPEED = 18;
const Z_LIMIT = 110;

/* ─── Production VFX helpers ─────────────────────────────────────── */

/** Shared geometries (created once, shared across all particles) */
const GEO_CACHE = {};
function cachedGeo(key, factory) {
  if (!GEO_CACHE[key]) GEO_CACHE[key] = factory();
  return GEO_CACHE[key];
}

/** Create a glowing energy orb material */
function energyMat(color, opacity = 0.85) {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
}

/** Create a soft ring for ground indicators */
function ringGeo(inner, outer, segs = 48) {
  return new THREE.RingGeometry(inner, outer, segs);
}

export class PlayerController {
  constructor(scene, physicsWorld, spawn, assets, selectedCharacter = "tartaglia") {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.assets = assets;
    this.selectedCharacter = selectedCharacter;
    this.animator = null;
    this._setAnimator(new PlayerAnimator(this.assets, this.selectedCharacter));

    const world = tileToWorld(spawn.x, spawn.y, spawn.z ?? 0);
    const body = physicsWorld.createDynamicPlayerCapsule({
      x: world.x, y: world.y + 2, z: world.z,
      radius: 0.45, halfHeight: 0.7
    });

    this.rigidBody = body.rigidBody;
    this.collider = body.collider;
    this.facing = new THREE.Vector3(0, 0, 1);
    const translation = this.rigidBody.translation();
    this.visualPosition = new THREE.Vector3(translation.x, translation.y + this.animator.visualOffsetY, translation.z);
    this.targetYaw = 0;
    this.visualYaw = 0;
    this.lastGroundDistance = Infinity;
    this.powered = false;
    this.grounded = false;
    this.wasGrounded = false;
    this.groundGraceTimer = 0;
    this.hurtTimer = 0;
    this.jumpCooldown = 0;

    this.dashTimer = 0;
    this.dashActive = 0;
    this.spinTimer = 0;
    this.shieldTimer = 0;
    this.slamTimer = 0;
    this.slamming = false;
    this.slamRecoverTimer = 0;
    this.spinActive = 0;
    this.emitShockwave = false;

    // ARPG state
    this.navTarget = null;
    this.basicAttackTimer = 0;

    this.particles = new THREE.Group();
    this.scene.add(this.particles);
    this.activeParticles = [];

    // VFX containers
    this._trailPoints = [];
    this._dashTrailMeshes = [];
  }

  _setAnimator(animator) {
    if (this.animator?.root) this.scene.remove(this.animator.root);
    this.animator = animator;
    this.scene.add(this.animator.root);
  }

  changeCharacter(nextCharacter) {
    if (!nextCharacter || this.selectedCharacter === nextCharacter) return;
    this.selectedCharacter = nextCharacter;
    this._setAnimator(new PlayerAnimator(this.assets, nextCharacter));
    const t = this.rigidBody.translation();
    this.visualPosition.set(t.x, t.y + this.animator.visualOffsetY, t.z);
  }

  setNavTarget(dest) { this.navTarget = dest; }

  /* ═══════════════════════════════════════════════════════════════
   *  PRODUCTION VFX SYSTEM
   * ═══════════════════════════════════════════════════════════════ */

  /** Hydro energy burst — layered orbs + streaks + glow ring */
  createHydroSplash(pos, scale = 1, isUltimate = false) {
    const count = isUltimate ? 55 : 16;
    const coreColor = isUltimate ? 0x3ee8ff : 0x55c8e8;
    const accentColor = isUltimate ? 0x80f0ff : 0x88d4f0;
    const trailColor = isUltimate ? 0x20d0ff : 0x66bbdd;

    // Core energy orbs
    const orbGeo = cachedGeo("hydro_orb", () => new THREE.IcosahedronGeometry(0.12, 1));
    for (let i = 0; i < count; i++) {
      const mat = energyMat(i % 3 === 0 ? accentColor : coreColor, 0.7 + Math.random() * 0.3);
      const mesh = new THREE.Mesh(orbGeo, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.5 + Math.random() * 1.5;

      const angle = Math.random() * Math.PI * 2;
      const upForce = 4 + Math.random() * (isUltimate ? 18 : 10);
      const outForce = 2 + Math.random() * (isUltimate ? 12 : 6);
      const vel = new THREE.Vector3(
        Math.cos(angle) * outForce,
        upForce,
        Math.sin(angle) * outForce
      );

      const s = (0.6 + Math.random() * 0.8) * scale;
      mesh.scale.setScalar(s);
      this.scene.add(mesh);
      this.activeParticles.push({
        mesh, vel, life: 0.6 + Math.random() * 0.5,
        maxLife: 1.1, scale: s, type: "hydro"
      });
    }

    // Glow ring on ground
    if (isUltimate) {
      const ringMat = energyMat(0x40e8ff, 0.6);
      const ring = new THREE.Mesh(ringGeo(0.3, 2.5 * scale, 64), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(pos);
      ring.position.y += 0.15;
      this.scene.add(ring);
      this.activeParticles.push({
        mesh: ring, vel: new THREE.Vector3(), life: 0.8,
        maxLife: 0.8, scale: 1, type: "ring"
      });
    }

    // Energy streaks
    const streakCount = isUltimate ? 8 : 3;
    const streakGeo = cachedGeo("streak", () => new THREE.CylinderGeometry(0.015, 0.06, 1.2, 4));
    for (let i = 0; i < streakCount; i++) {
      const mat = energyMat(trailColor, 0.65);
      const streak = new THREE.Mesh(streakGeo, mat);
      streak.position.copy(pos);
      streak.position.y += 1 + Math.random() * 2;
      const angle = Math.random() * Math.PI * 2;
      streak.rotation.z = (Math.random() - 0.5) * 1.2;
      streak.rotation.y = angle;
      const s = (0.8 + Math.random()) * scale;
      streak.scale.set(s, s * 2, s);
      this.scene.add(streak);
      const vel = new THREE.Vector3(
        Math.cos(angle) * 6 * scale,
        8 + Math.random() * 8,
        Math.sin(angle) * 6 * scale
      );
      this.activeParticles.push({
        mesh: streak, vel, life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8, scale: s, type: "streak"
      });
    }
  }

  /** Earth slam — rock shards + dust cloud + shockwave ring */
  createEarthExplosion(pos) {
    // Rock shards
    const rockGeo = cachedGeo("rock", () => new THREE.DodecahedronGeometry(0.4, 0));
    const colors = [0x54463d, 0x7a6352, 0x8b7355, 0x6b5a4d];
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length], roughness: 0.9, metalness: 0.05
      });
      const mesh = new THREE.Mesh(rockGeo, mat);
      mesh.position.copy(pos);
      mesh.position.y -= 0.3;

      const s = 0.4 + Math.random() * 1.8;
      mesh.scale.setScalar(s);

      const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.4;
      const power = 8 + Math.random() * 16;
      const vel = new THREE.Vector3(
        Math.cos(angle) * power,
        12 + Math.random() * 22,
        Math.sin(angle) * power
      );

      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.activeParticles.push({
        mesh, vel, life: 1.8, maxLife: 1.8, scale: s, type: "rock"
      });
    }

    // Dust cloud
    const dustGeo = cachedGeo("dust", () => new THREE.SphereGeometry(0.3, 6, 6));
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xc4a882, transparent: true, opacity: 0.4,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(dustGeo, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.2;
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        1 + Math.random() * 4,
        Math.sin(angle) * speed
      );
      const s = 1 + Math.random() * 2;
      mesh.scale.setScalar(s);
      this.scene.add(mesh);
      this.activeParticles.push({
        mesh, vel, life: 1.2, maxLife: 1.2, scale: s, type: "dust"
      });
    }

    // Shockwave ring
    const swGeo = cachedGeo("sw_ring", () => new THREE.RingGeometry(0.5, 1.2, 64));
    const swMat = energyMat(0xffe8a0, 0.7);
    const sw = new THREE.Mesh(swGeo, swMat);
    sw.rotation.x = -Math.PI / 2;
    sw.position.copy(pos);
    sw.position.y += 0.12;
    this.scene.add(sw);
    this.activeParticles.push({
      mesh: sw, vel: new THREE.Vector3(), life: 0.6,
      maxLife: 0.6, scale: 1, type: "shockwave"
    });
  }

  /** Dash trail — afterimage energy streak */
  _emitDashTrail() {
    const pos = this.getPosition();
    const trailGeo = cachedGeo("dash_trail", () => new THREE.PlaneGeometry(0.6, 2.0));
    const mat = energyMat(0x55d8ff, 0.5);
    const mesh = new THREE.Mesh(trailGeo, mat);
    mesh.position.copy(pos);
    mesh.position.y += 0.8;
    mesh.rotation.y = this.visualYaw;
    mesh.scale.set(1, 1, 1);
    this.scene.add(mesh);
    this.activeParticles.push({
      mesh, vel: new THREE.Vector3(), life: 0.3,
      maxLife: 0.3, scale: 1, type: "dashtrail"
    });
  }

  /** Energy burst — radial energy orbs emanating from a point */
  _createEnergyBurst(pos, color = 0x3ee8ff, count = 16) {
    const geo = cachedGeo("energy_burst", () => new THREE.SphereGeometry(0.08, 6, 6));
    for (let i = 0; i < count; i++) {
      const mat = energyMat(color, 0.8);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const angle = (i / count) * Math.PI * 2;
      const pitch = (Math.random() - 0.3) * Math.PI;
      const speed = 6 + Math.random() * 12;
      const vel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(pitch) * speed,
        Math.sin(pitch) * speed * 0.6 + 3,
        Math.sin(angle) * Math.cos(pitch) * speed
      );
      const s = 0.5 + Math.random() * 1.5;
      mesh.scale.setScalar(s);
      this.scene.add(mesh);
      this.activeParticles.push({
        mesh, vel, life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7, scale: s, type: "hydro"
      });
    }
    // Central flash
    const flashMat = energyMat(0xffffff, 0.9);
    const flash = new THREE.Mesh(
      cachedGeo("flash_sphere", () => new THREE.SphereGeometry(0.5, 12, 12)), flashMat
    );
    flash.position.copy(pos);
    flash.scale.setScalar(2);
    this.scene.add(flash);
    this.activeParticles.push({
      mesh: flash, vel: new THREE.Vector3(), life: 0.2,
      maxLife: 0.2, scale: 2, type: "ring"
    });
  }

  /** Screen shake effect via camera offset */
  _createScreenShake(duration = 0.4, intensity = 8) {
    if (this._shakeTimer) return;
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeTimer = duration;
  }

  /** Call from syncVisual to apply shake */
  getScreenShake() {
    if (!this._shakeTimer || this._shakeTimer <= 0) return null;
    const t = this._shakeTimer / this._shakeDuration;
    const amp = this._shakeIntensity * t * t;
    return new THREE.Vector3(
      (Math.random() - 0.5) * amp * 0.06,
      (Math.random() - 0.5) * amp * 0.04,
      (Math.random() - 0.5) * amp * 0.06
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */

  updateControls(dt, input) {
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.jumpCooldown = 0;
    this.basicAttackTimer = Math.max(0, this.basicAttackTimer - dt);
    this.slamRecoverTimer = Math.max(0, this.slamRecoverTimer - dt);
    this._updateGrounded();
    this.groundGraceTimer = this.grounded ? 0.12 : Math.max(0, this.groundGraceTimer - dt);
    this.wasGrounded = this.grounded;

    let moveInput = input.getMoveVector();
    if (moveInput.lengthSq() > 0.01) this.navTarget = null;

    const cameraForward = new THREE.Vector3(Math.sin(input.lookYaw), 0, Math.cos(input.lookYaw)).normalize();
    const cameraRight = new THREE.Vector3(cameraForward.z, 0, -cameraForward.x).normalize();

    let move = new THREE.Vector3();
    const pos = this.getPosition();

    if (this.navTarget) {
      const delta = new THREE.Vector3().subVectors(this.navTarget, pos);
      delta.y = 0;
      if (delta.lengthSq() < 0.25) this.navTarget = null;
      else move.copy(delta).normalize();
    } else {
      move.addScaledVector(cameraRight, -moveInput.x)
          .addScaledVector(cameraForward, -moveInput.z);
      if (move.lengthSq() > 1) move.normalize();
    }

    if (this.basicAttackTimer > 0 || this.slamRecoverTimer > 0) move.set(0, 0, 0);

    const current = this.rigidBody.linvel();
    const traction = this.grounded ? 0.22 : 0.1;
    const nextX = THREE.MathUtils.lerp(current.x, move.x * MOVE_FORCE, traction);
    const nextZ = THREE.MathUtils.lerp(current.z, move.z * MOVE_FORCE, traction);

    if (this.dashActive > 0) {
      this.dashActive -= dt;
    } else if (!this.slamming) {
      this.rigidBody.setLinvel({ x: nextX, y: current.y, z: nextZ }, true);
    }

    const nearGround = this.lastGroundDistance < 1.25;
    const lowVerticalSpeed = Math.abs(current.y) < 0.55;
    const canJump = this.grounded || this.groundGraceTimer > 0 || nearGround || lowVerticalSpeed;
    if (input.consumeJump() && canJump) {
      this.rigidBody.setLinvel({ x: nextX, y: JUMP_SPEED, z: nextZ }, true);
      this.grounded = false;
      this.groundGraceTimer = 0;
      this.jumpCooldown = 0;
    }

    if (move.lengthSq() > 0.01) {
      this.facing.copy(move).normalize();
      this.targetYaw = Math.atan2(this.facing.x, this.facing.z);
    }

    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.spinTimer = Math.max(0, this.spinTimer - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.slamTimer = Math.max(0, this.slamTimer - dt);

    /* Basic attack — enhanced with energy slash */
    if (input.consumeBasicAttack() && this.basicAttackTimer <= 0) {
      this.basicAttackTimer = 0.5;
      this.navTarget = null;
      this.createHydroSplash(this.getHeadPosition(), 0.5);
      this._createEnergyBurst(this.getHeadPosition(), 0x55c8e8, 8);
    }

    /* Shield */
    if (this.shieldTimer > 0) {
      if (!this.shieldMesh) {
        const shieldMat = new THREE.MeshBasicMaterial({
          color: 0x7af0ff, transparent: true, opacity: 0.25,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this.shieldMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.6, 32, 32), shieldMat
        );
        // Inner glow layer
        const innerMat = new THREE.MeshBasicMaterial({
          color: 0xaaf8ff, transparent: true, opacity: 0.12,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
        });
        this.shieldInner = new THREE.Mesh(
          new THREE.SphereGeometry(1.5, 32, 32), innerMat
        );
        this.shieldMesh.add(this.shieldInner);
        this.scene.add(this.shieldMesh);
      }
      this.shieldMesh.position.copy(this.getPosition());
      this.shieldMesh.position.y += 0.8;
      // Pulsing effect
      const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.05;
      this.shieldMesh.scale.setScalar(pulse);
      this.shieldMesh.material.opacity = 0.2 + Math.sin(performance.now() * 0.006) * 0.08;
    } else if (this.shieldMesh) {
      this.scene.remove(this.shieldMesh);
      this.shieldMesh.geometry.dispose();
      this.shieldMesh.material.dispose();
      if (this.shieldInner) {
        this.shieldInner.geometry.dispose();
        this.shieldInner.material.dispose();
      }
      this.shieldMesh = null;
      this.shieldInner = null;
    }

    /* Dash (Q) — water surge forward */
    if (input.consumeSkill1() && this.dashTimer <= 0) {
      this.dashTimer = 2.0;
      this.dashActive = 0.25;
      this.navTarget = null;
      const speed = 42;
      this.rigidBody.setLinvel({ x: this.facing.x * speed, y: 2.0, z: this.facing.z * speed }, true);
      this.createHydroSplash(this.getPosition(), 1.0);
      this._createEnergyBurst(this.getPosition(), 0x55d8ff, 14);
      this._createScreenShake(0.15, 4);
    }

    /* Spin (W) — whirlpool blade dance */
    if (input.consumeSkill2() && this.spinTimer <= 0) {
      this.spinTimer = 1.5;
      this.spinActive = 0.6;
      this.navTarget = null;
      this._createEnergyBurst(this.getPosition(), 0x3ee8ff, 20);
      this._createScreenShake(0.2, 5);
      if (!this.blade1) {
        const bladeMat = new THREE.MeshBasicMaterial({
          color: 0x3ee8ff, transparent: true, opacity: 0.7,
          blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.blade1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 4), bladeMat
        );
        this.blade2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 4), bladeMat.clone()
        );
        // Add energy glow planes along blades
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0x80f0ff, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), glowMat);
        const glowPlane2 = glowPlane.clone();
        glowPlane2.material = glowMat.clone();
        this.blade1.add(glowPlane);
        this.blade2.add(glowPlane2);
        this.scene.add(this.blade1, this.blade2);
      }
    }

    // Blade VFX update
    if (this.blade1 && this.blade2) {
      if (this.spinActive > 0) {
        this.blade1.visible = true;
        this.blade2.visible = true;
        this.blade1.position.copy(this.getPosition()).add(new THREE.Vector3(0, 1, 0));
        this.blade2.position.copy(this.getPosition()).add(new THREE.Vector3(0, 1, 0));
        this.blade1.rotation.y = this.visualYaw;
        this.blade2.rotation.y = this.visualYaw + Math.PI;
        this.blade1.translateZ(-2);
        this.blade2.translateZ(-2);
        // Blade glow pulse
        const bp = 0.5 + Math.sin(performance.now() * 0.02) * 0.3;
        this.blade1.material.opacity = bp;
        this.blade2.material.opacity = bp;
      } else {
        this.blade1.visible = false;
        this.blade2.visible = false;
      }
    }

    /* Dash trail VFX */
    if (this.dashActive > 0) {
      if (Math.random() > 0.2) this._emitDashTrail();
      if (Math.random() > 0.5) this.createHydroSplash(this.getPosition(), 0.4);
    }

    /* Spin VFX */
    if (this.spinActive > 0) {
      this.spinActive -= dt;
      this.visualYaw += dt * 35;
      this.animator.root.rotation.y = this.visualYaw;
      if (Math.random() > 0.4) this.createHydroSplash(this.getPosition(), 0.5);
    }

    /* Shield (E) */
    if (input.consumeSkill3() && this.shieldTimer <= 0) {
      this.shieldTimer = 8.0;
      this.hurtTimer = 4.0;
      this.navTarget = null;
    }

    /* Slam (R) — fast and dramatic */
    if (input.consumeSkill4() && this.slamTimer <= 0) {
      this.slamTimer = 2.5;
      this.rigidBody.setLinvel({ x: current.x * 0.2, y: 13, z: current.z * 0.2 }, true);
      this.slamming = true;
      this.grounded = false;
      this.navTarget = null;
      this.slamRecoverTimer = 0;
      this.createHydroSplash(this.getPosition(), 1.5);
      // Dramatic energy burst at launch
      this._createEnergyBurst(this.getPosition(), 0x3ee8ff, 18);
    }

    if (this.slamming) {
      const currentV = this.rigidBody.linvel();
      if (currentV.y < 0) {
        this.rigidBody.setLinvel({
          x: currentV.x * 0.88,
          y: Math.max(currentV.y - 7, -36),
          z: currentV.z * 0.88
        }, true);
        // Emit trailing particles during dive
        if (Math.random() > 0.3) this.createHydroSplash(this.getPosition(), 0.3);
      }

      if (this.grounded || this.lastGroundDistance < 0.8 || this.slamTimer <= 0) {
        this.slamming = false;
        this.emitShockwave = true;
        this.slamRecoverTimer = 0.28;
        this.rigidBody.setLinvel({ x: 0, y: Math.max(0, currentV.y), z: 0 }, true);
        this.createHydroSplash(this.getPosition(), 3.5, true);
        this.createEarthExplosion(this.getPosition());
        this._createScreenShake(0.6, 12);
        this._createEnergyBurst(this.getPosition(), 0x40e8ff, 30);
      }
    }

    /* ── Particle update loop ── */
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (!GEO_CACHE[p.mesh?.geometry?.uuid]) p.mesh.geometry?.dispose?.();
        p.mesh.material?.dispose?.();
        this.activeParticles.splice(i, 1);
        continue;
      }

      const t = p.life / p.maxLife; // 1 → 0

      switch (p.type) {
        case "rock":
          p.mesh.position.addScaledVector(p.vel, dt);
          p.vel.y -= 45 * dt;
          p.mesh.rotation.x += dt * 5;
          p.mesh.rotation.y += dt * 4;
          if (p.mesh.position.y < -2) { p.vel.y = 0; p.vel.x *= 0.9; p.vel.z *= 0.9; }
          p.mesh.material.opacity = t;
          break;

        case "dust":
          p.mesh.position.addScaledVector(p.vel, dt);
          p.vel.y -= 2 * dt;
          p.vel.x *= (1 - dt * 2);
          p.vel.z *= (1 - dt * 2);
          p.mesh.scale.setScalar(p.scale * (1 + (1 - t) * 3));
          p.mesh.material.opacity = t * 0.4;
          break;

        case "hydro":
          p.mesh.position.addScaledVector(p.vel, dt);
          p.vel.y -= 20 * dt;
          p.mesh.scale.setScalar(p.scale * t);
          p.mesh.material.opacity = t * 0.8;
          break;

        case "streak":
          p.mesh.position.addScaledVector(p.vel, dt);
          p.vel.y -= 15 * dt;
          p.mesh.scale.y = p.scale * 2 * t;
          p.mesh.material.opacity = t * 0.65;
          break;

        case "ring":
          p.mesh.scale.setScalar(1 + (1 - t) * 8);
          p.mesh.material.opacity = t * 0.6;
          break;

        case "shockwave":
          p.mesh.scale.setScalar(1 + (1 - t) * 16);
          p.mesh.material.opacity = t * 0.7;
          break;

        case "dashtrail":
          p.mesh.material.opacity = t * 0.4;
          p.mesh.scale.y = t;
          break;

        default:
          p.mesh.position.addScaledVector(p.vel, dt);
          p.vel.y -= 25 * dt;
          p.mesh.scale.setScalar(t * p.scale);
          break;
      }
    }
  }

  syncVisual(dt) {
    this._updateGrounded();
    if (this._shakeTimer > 0) this._shakeTimer = Math.max(0, this._shakeTimer - dt);
    const translation = this.rigidBody.translation();
    if (!Number.isFinite(translation.x) || !Number.isFinite(translation.y) || !Number.isFinite(translation.z)) {
      this.rigidBody.setTranslation({ x: 0, y: 6, z: 0 }, true);
      this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      this.navTarget = null;
      this.slamming = false;
      this.slamRecoverTimer = 0;
      return;
    }
    if (Math.abs(translation.z) > Z_LIMIT) {
      this.rigidBody.setTranslation({
        x: translation.x, y: translation.y,
        z: THREE.MathUtils.clamp(translation.z, -Z_LIMIT, Z_LIMIT)
      }, true);
      this.rigidBody.setLinvel({ x: this.rigidBody.linvel().x, y: this.rigidBody.linvel().y, z: 0 }, true);
    }
    const synced = this.rigidBody.translation();
    const posAlpha = 1 - Math.exp(-dt * 28);
    const targetPos = new THREE.Vector3(synced.x, synced.y + this.animator.visualOffsetY, synced.z);
    this.visualPosition.lerp(targetPos, posAlpha);
    this.visualYaw = THREE.MathUtils.lerp(this.visualYaw, this.targetYaw, 1 - Math.exp(-dt * 14));
    this.animator.root.position.copy(this.visualPosition);
    this.animator.root.rotation.y = this.visualYaw;
    this.animator.update(dt, {
      velocity: this.rigidBody.linvel(),
      grounded: this.grounded || this.groundGraceTimer > 0.02,
      powered: this.powered,
      hurtTimer: this.hurtTimer,
      dashActive: this.dashActive,
      spinActive: this.spinActive,
      shieldActive: this.shieldTimer > 0,
      slamming: this.slamming,
      slamRecovering: this.slamRecoverTimer > 0,
      basicAttackTime: this.basicAttackTimer
    });
  }

  _updateGrounded() {
    const position = this.rigidBody.translation();
    const verticalVelocity = this.rigidBody.linvel().y;
    const probes = [
      { x: 0, z: 0 }, { x: 0.28, z: 0 }, { x: -0.28, z: 0 },
      { x: 0, z: 0.28 }, { x: 0, z: -0.28 }
    ];
    const hit = probes
      .map(offset => this.physicsWorld.castRay(
        { x: position.x + offset.x, y: position.y - 1.02, z: position.z + offset.z },
        { x: 0, y: -1, z: 0 }, 3.0,
        { solid: false, excludeCollider: this.collider, excludeRigidBody: this.rigidBody }
      ))
      .filter(Boolean)
      .sort((a, b) => a.toi - b.toi)[0];
    this.lastGroundDistance = hit?.toi ?? Infinity;
    this.grounded = Boolean(hit) && hit.toi <= 0.55 && verticalVelocity <= 4;
  }

  getPosition() {
    const p = this.rigidBody.translation();
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  getVelocity() {
    const v = this.rigidBody.linvel();
    return new THREE.Vector3(v.x, v.y, v.z);
  }

  getHeadPosition() {
    const p = this.getPosition();
    return new THREE.Vector3(p.x, p.y + 1.25, p.z);
  }

  applyPowerup() {
    this.powered = true;
    this.animator.setPowered(true);
  }

  takeHit() {
    if (this.hurtTimer > 0) return "ignore";
    if (this.powered) {
      this.powered = false;
      this.animator.setPowered(false);
      this.hurtTimer = 1.5;
      return "downgrade";
    }
    this.hurtTimer = 1.2;
    return "dead";
  }

  bounceEnemy() {
    const v = this.rigidBody.linvel();
    this.rigidBody.setLinvel({ x: v.x, y: 10.5, z: v.z }, true);
  }

  springJump() {
    const v = this.rigidBody.linvel();
    this.rigidBody.setLinvel({ x: v.x, y: SPRING_SPEED, z: v.z }, true);
    this.grounded = false;
    this.wasGrounded = false;
    this.groundGraceTimer = 0;
  }
}
