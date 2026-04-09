import * as THREE from "three";
import { GameState, PLAYER_STATES, SCREEN_STATES } from "./GameState.js";
import { InputController } from "./InputController.js";
import { HudOverlay } from "../ui/HudOverlay.js";
import { SceneManager } from "../scene/SceneManager.js";
import { PhysicsWorld } from "../world/PhysicsWorld.js";
import { createLevel01, tileToWorld } from "../world/LevelData.js";
import { LevelBuilder } from "../world/LevelBuilder.js";
import { PlayerController } from "../entities/PlayerController.js";
import { EnemyController } from "../entities/EnemyController.js";
import { PickupController } from "../entities/PickupController.js";
import { makeToonMaterial } from "../visual/ToonMaterials.js";
import { AssetLibrary } from "../assets/AssetLibrary.js";

export class GameApp {
  constructor(elements) {
    this.elements = elements;
    this.state = new GameState();
    this.ui = new HudOverlay(elements);
    this.ui.setHandlers(() => this.handlePrimary(), () => this.handleSecondary());
    this.clock = new THREE.Clock();
    this.running = false;
    this.hasStartedOnce = false;
    this.messageTimer = 0;
    this.ready = false;
    this.initError = null;
    this.selectedCharacter = "girl";
    this.raycaster = new THREE.Raycaster();
    this.cursorRayHit = null;
    this.navPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  async init() {
    try {
      this.input = new InputController(this.elements.mount);
      this.sceneManager = new SceneManager(this.elements.mount);
      this.assets = await new AssetLibrary(this.sceneManager.renderer).load();
      this.physics = await new PhysicsWorld().init();
      
      const terrainGeo = this.sceneManager.setupTerrain(this.assets);
      if (terrainGeo) {
         this.physics.createStaticTrimesh({
             vertices: new Float32Array(terrainGeo.vertices),
             indices: new Uint32Array(terrainGeo.indices)
         });
      }
      
      this.setupWorld();
      this.ready = Boolean(this.player && this.world);
      this.ui.updateHud(this.state);
      this.ui.showScreen(SCREEN_STATES.menu, this.state);
      this.sceneManager.render();

      document.addEventListener("keydown", (event) => {
        if (event.code === "Enter" && this.state.screen !== SCREEN_STATES.playing) this.handlePrimary();
      });
    } catch (error) {
      this.initError = error;
      console.error("Game init failed:", error);
      this.elements.overlay?.classList.remove("hidden");
      if (this.elements.overlayKicker) this.elements.overlayKicker.textContent = "LOAD ERROR";
      if (this.elements.overlayTitle) this.elements.overlayTitle.textContent = "初始化失败";
      if (this.elements.overlayText) {
        this.elements.overlayText.textContent = error?.message || "场景初始化时发生错误，请刷新页面后重试。";
      }
      if (this.elements.primaryButton) this.elements.primaryButton.textContent = "刷新重试";
      if (this.elements.secondaryButton) this.elements.secondaryButton.textContent = "刷新页面";
    }
  }

  setupWorld() {
    this.worldGroup = new THREE.Group();
    this.sceneManager.scene.add(this.worldGroup);
    this.levelData = createLevel01();
    this.levelBuilder = new LevelBuilder(this.worldGroup, this.physics, this.assets);
    this.world = this.levelBuilder.build(this.levelData);
    this.player = new PlayerController(this.worldGroup, this.physics, this.levelData.spawn, this.assets, this.selectedCharacter);
    this.coins = this.world.coins.map(
      (coin) => new PickupController(
        this.worldGroup,
        coin.tileX ?? coin.x,
        coin.tileY ?? coin.y,
        coin.z ?? 0,
        this.assets,
        coin.type ?? "coin"
      )
    );
    this.enemies = this.world.enemySpawns.map((spawn) => new EnemyController(this.worldGroup, spawn, this.assets));
    this.mushrooms = [];
    this.bonusPickups = this.levelData.bonusSpawns.map(
      (pickup) => new PickupController(this.worldGroup, pickup.x, pickup.y, pickup.z ?? 0, this.assets, pickup.type)
    );
    this.portals = this.levelData.portals.map((portal) => {
      const sourceObj = tileToWorld(portal.from.x, portal.from.y, portal.from.z ?? 0);
      const targetObj = tileToWorld(portal.to.x, portal.to.y, portal.to.z ?? 0);
      return {
        source: new THREE.Vector3(sourceObj.x, sourceObj.y, sourceObj.z),
        target: new THREE.Vector3(targetObj.x, targetObj.y, targetObj.z),
        cooldown: 0
      };
    });
    this.interactiveProps = this.world.props.filter((prop) => Boolean(prop.spawn.interaction));
    this._createGoalAura();
    this._createCursorIndicator();
  }

  _createGoalAura() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.08, 12, 32),
      makeToonMaterial({ color: "#ffe27a", emissive: "#634900" })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(this.world.goal.position);
    ring.position.y -= 2.5;
    this.goalRing = ring;
    this.worldGroup.add(ring);
  }

  handlePrimary() {
    if (this.initError) {
      location.reload();
      return;
    }
    if (!this.ready || !this.player) {
      this.showMessage("资源仍在初始化，请稍等一秒后再开始。");
      return;
    }
    if (this.state.screen === SCREEN_STATES.playing) return;
    if (this.hasStartedOnce) {
      location.reload();
      return;
    }
    this.startGame();
  }

  handleSecondary() {
    location.reload();
  }

  startGame() {
    this.player?.changeCharacter?.(this.selectedCharacter);
    this.state.resetAll();
    this.state.screen = SCREEN_STATES.playing;
    this.hasStartedOnce = true;
    this.ui.updateHud(this.state);
    this.ui.hideOverlay();
    this.clock.start();
    this.running = true;
    requestAnimationFrame(() => this.loop());
  }

  loop() {
    if (!this.running || this.state.screen !== SCREEN_STATES.playing) {
      this.running = false;
      return;
    }

    const dt = Math.min(0.033, this.clock.getDelta());
    this.update(dt);
    this.render(dt);
    requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    if (!this.player || !this.world) {
      this.running = false;
      return;
    }
    this.input.update(dt);
    this.state.tick(dt);
    if (this.state.timeLeft <= 0) {
      this.failRun("计时结束，没能赶到终点旗塔。");
      return;
    }

    // ARPG Click-To-Move Raycast – uses actual mouse cursor position
    this._updateCursorIndicator(dt);
    if (this.input.consumeRightClick()) {
      const dest = this.cursorRayHit?.clone() ?? this._raycastCursorWorld();
      if (dest) {
        this.player.setNavTarget(dest);
        this.createClickVFX(dest);
      }
    }

    this.player.updateControls(dt, this.input);
    this.physics.step();
    this.player.syncVisual(dt);

    this.updateQuestionBlocks(dt);
    this.updateCoins(dt);
    this.updateBonusPickups(dt);
    this.updateMushrooms(dt);
    this.updateSprings();
    this.updateInteractions(dt);
    this.updatePortals(dt);
    this.updateTraps();
    this.updateEnemies(dt);
    this.updateGoal(dt);

    if (this.player.emitShockwave) {
      this.player.emitShockwave = false;
      this._doSlamImpact();
    }

    if (this.player.getPosition().y < -10) {
      this.failRun("你掉进了深坑，下次记得先观察前方地形。");
      return;
    }

    this.state.playerState = this.player.powered ? PLAYER_STATES.powered : PLAYER_STATES.normal;
    this.ui.updateHud(this.state);
  }

  updateQuestionBlocks(dt) {
    const velocity = this.player.getVelocity();
    const head = this.player.getHeadPosition();

    this.world.questionBlocks.forEach((record) => {
      if (record.used) return;
      const base = tileToWorld(record.tileX, record.tileY, 0);
      const pos = record.mesh.position;
      record.mesh.rotation.y += dt * 0.6;
      record.mesh.position.y = base.y + Math.sin((performance.now() / 240) + record.tileX) * 0.06;

      const close = Math.abs(head.x - pos.x) < 0.7 && Math.abs(head.z - pos.z) < 1.5;
      const hit = close && velocity.y > 0.5 && pos.y - head.y < 0.95 && pos.y > head.y;
      if (!hit) return;

      record.used = true;
      record.mesh.position.y = base.y;
      record.mesh.traverse((child) => {
        child.material?.color?.set?.("#8e6e52");
        child.material?.emissive?.set?.("#000000");
      });
      this.state.addScore(200);

      const key = `${record.tileX},${record.tileY}`;
      if (this.levelData.mushroomBlocks.has(key)) this.spawnMushroom(record.tileX, record.tileY);
      else this.coins.push(
        new PickupController(this.worldGroup, record.tileX, record.tileY - 1, record.mesh.position.z, this.assets, "coin")
      );
    });

    this.world.breakableBlocks.forEach((record) => {
      if (record.broken) return;
      const pos = record.mesh.position;
      const close = Math.abs(head.x - pos.x) < 0.7 && Math.abs(head.z - pos.z) < 1.5;
      const hit = close && velocity.y > 0.5 && pos.y - head.y < 0.95 && pos.y > head.y;
      if (hit && this.player.powered) {
        this.levelBuilder.breakBlock(record);
        this.state.addScore(150);
      }
    });
  }

  updateCoins(dt) {
    this.coins.forEach((coin) => {
      coin.update(dt);
      if (!coin.collected && this.player.getPosition().distanceTo(coin.mesh.position) < 1.3) {
        coin.collect();
        this.state.addCoin();
      }
    });
  }

  updateBonusPickups(dt) {
    this.bonusPickups.forEach((pickup) => {
      pickup.update(dt);
      if (pickup.collected) return;
      if (this.player.getPosition().distanceTo(pickup.mesh.position) < 1.6) {
        pickup.collect();
        this.state.addScore(pickup.kind === "star" ? 1000 : 600);
      }
    });
  }

  spawnMushroom(tileX, tileY) {
    const base = tileToWorld(tileX, tileY, 0);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
      makeToonMaterial({ color: "#ff8068", emissive: "#632237" })
    );
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.5, 10),
      makeToonMaterial({ color: "#fff0db" })
    );
    const dotLeft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), makeToonMaterial({ color: "#fff8dc" }));
    const dotRight = dotLeft.clone();
    const group = new THREE.Group();
    cap.position.y = 0.25;
    stem.position.y = -0.12;
    dotLeft.position.set(0.14, 0.4, 0.18);
    dotRight.position.set(-0.18, 0.34, -0.12);
    group.add(cap, stem, dotLeft, dotRight);
    group.position.set(base.x, base.y + 0.1, 0);
    this.worldGroup.add(group);
    this.mushrooms.push({
      mesh: group,
      position: group.position,
      velocity: new THREE.Vector3(2.8, 0, 0),
      active: true,
      rising: 0.6
    });
  }

  updateMushrooms(dt) {
    this.mushrooms.forEach((mushroom) => {
      if (!mushroom.active) return;
      if (mushroom.rising > 0) {
        mushroom.rising -= dt;
        mushroom.position.y += dt * 1.1;
      } else {
        mushroom.position.x += mushroom.velocity.x * dt;
        mushroom.mesh.rotation.y += dt * 4;
      }

      if (this.player.getPosition().distanceTo(mushroom.position) < 1.4) {
        mushroom.active = false;
        this.worldGroup.remove(mushroom.mesh);
        this.player.applyPowerup();
        this.state.addScore(500);
      }
    });
  }

  updateSprings() {
    const playerPos = this.player.getPosition();
    const velocity = this.player.getVelocity();
    this.world.springs.forEach((spring) => {
      const top = spring.mesh.position.y + 0.6;
      const close = Math.abs(playerPos.x - spring.mesh.position.x) < 0.9 &&
        Math.abs(playerPos.z - spring.mesh.position.z) < 1.5;
      if (close && playerPos.y > top && playerPos.y - top < 1.25 && velocity.y <= 0) {
        this.player.springJump();
      }
    });
  }

  updatePortals(dt) {
    this.portals.forEach((portal) => {
      portal.cooldown = Math.max(0, portal.cooldown - dt);
    });
  }

  updateInteractions(dt) {
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    if (this.messageTimer <= 0 && this.elements.messageToast) {
      this.elements.messageToast.classList.add("hidden");
    }

    const playerPos = this.player.getPosition();
    let nearest = null;
    let nearestDistance = Infinity;

    this.interactiveProps.forEach((prop) => {
      if (prop.spawn.interaction === "chest" && prop.opened) return;
      const distance = playerPos.distanceTo(prop.mesh.position);
      if (distance < 3.4 && distance < nearestDistance) {
        nearest = prop;
        nearestDistance = distance;
      }
    });

    if (this.elements.interactionPrompt) {
      if (nearest) {
        const text = nearest.spawn.interaction === "sign"
          ? "按 E 查看路牌"
          : nearest.spawn.interaction === "chest"
            ? "按 E 打开宝箱"
            : "按 E 进入传送管道";
        this.elements.interactionPrompt.textContent = text;
        this.elements.interactionPrompt.classList.remove("hidden");
      } else {
        this.elements.interactionPrompt.classList.add("hidden");
      }
    }

    if (!nearest || !this.input.consumeAction()) return;

    if (nearest.spawn.interaction === "sign") {
      this.showMessage("前方有新的探索路线，可以试着偏离主路搜集额外奖励。");
      return;
    }

    if (nearest.spawn.interaction === "chest") {
      nearest.opened = true;
      nearest.mesh.rotation.z = -0.18;
      this.showMessage(nearest.spawn.reward === "star" ? "宝箱开启，获得星辉奖励。" : "宝箱开启，获得宝石奖励。");
      this.bonusPickups.push(
        new PickupController(
          this.worldGroup,
          nearest.spawn.x,
          nearest.spawn.y - 2,
          nearest.spawn.z,
          this.assets,
          nearest.spawn.reward || "jewel"
        )
      );
      return;
    }

    if (nearest.spawn.interaction === "pipe") {
      const portal = this.portals.find((entry) => entry.source.distanceTo(nearest.mesh.position) < 2.8 && entry.cooldown <= 0);
      if (!portal) return;
      this.player.rigidBody.setTranslation(
        { x: portal.target.x, y: portal.target.y + 1.6, z: portal.target.z },
        true
      );
      this.player.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      this.portals.forEach((entry) => {
        entry.cooldown = 1.4;
      });
      this.showMessage("呼的一下，你被糖果管道送到了另一边。");
    }
  }

  showMessage(text) {
    if (!this.elements.messageToast) return;
    this.elements.messageToast.textContent = text;
    this.elements.messageToast.classList.remove("hidden");
    this.messageTimer = 2.8;
  }

  updateTraps() {
    const playerPos = this.player.getPosition();
    this.world.traps.forEach((trap) => {
      const hit = Math.abs(playerPos.x - trap.mesh.position.x) < 0.8 &&
        Math.abs(playerPos.z - trap.mesh.position.z) < 2.6 &&
        playerPos.y - trap.mesh.position.y < 1.2;
      if (hit) this.failRun("你踩中了尖刺陷阱。");
    });
  }

  updateEnemies(dt) {
    this.enemies.forEach((enemy) => {
      enemy.update(dt);
      
      if (this.player.spinActive > 0 && enemy.mesh.position.distanceTo(this.player.getPosition()) < 3.5) {
        enemy.squash();
        this.state.addScore(400);
        return;
      }

      const outcome = enemy.checkPlayer(this.player);
      if (outcome === "stomp") {
        enemy.squash();
        this.player.bounceEnemy();
        this.state.addScore(300);
      } else if (outcome === "hurt" && this.player.hurtTimer <= 0) {
        const result = this.player.takeHit();
        if (result === "dead") this.failRun("你被巡逻怪撞倒了。");
      }
    });

    if (this.player.spinActive > 0) {
       this.world.breakableBlocks.forEach((record) => {
         if (record.broken) return;
         if (record.mesh.position.distanceTo(this.player.getPosition()) < 3.5) {
            this.levelBuilder.breakBlock(record);
            this.state.addScore(150);
            this.showMessage("疾风剑刃击碎了砖块！");
         }
       });
    }
  }

  _doSlamImpact() {
    this.showMessage("陨星千斤坠！地动山摇！");
    const pos = this.player.getPosition();
    this.enemies.forEach((enemy) => {
      if (enemy.mesh.position.distanceTo(pos) < 12) {
         enemy.squash();
         this.state.addScore(400);
      }
    });
    this.world.questionBlocks.forEach((record) => {
       if (record.used || record.mesh.position.distanceTo(pos) > 12) return;
       record.used = true;
       record.mesh.traverse((child) => {
         child.material?.color?.set?.("#8e6e52");
         child.material?.emissive?.set?.("#000000");
       });
       this.state.addScore(200);
       const key = `${record.tileX},${record.tileY}`;
       if (this.levelData.mushroomBlocks.has(key)) this.spawnMushroom(record.tileX, record.tileY);
       else this.coins.push(new PickupController(this.worldGroup, record.tileX, record.tileY - 1, record.mesh.position.z, this.assets, "coin"));
    });
  }

  updateGoal(dt) {
    this.goalRing.rotation.z += dt * 1.4;
    if (this.player.getPosition().distanceTo(this.world.goal.position) < 2.2) {
      this.state.addScore(Math.max(0, Math.floor(this.state.timeLeft)) * 10);
      this.state.screen = SCREEN_STATES.win;
      this.ui.updateHud(this.state);
      this.ui.showScreen(SCREEN_STATES.win, this.state);
    }
  }

  failRun(reason) {
    if (this.state.screen !== SCREEN_STATES.playing) return;
    this.state.lives = Math.max(0, this.state.lives - 1);
    this.state.summary = reason;
    this.state.screen = SCREEN_STATES.lose;
    this.ui.updateHud(this.state);
    this.ui.showScreen(SCREEN_STATES.lose, this.state);
  }

  render(dt) {
    const shake = this.player?.getScreenShake?.();
    const camPos = this.player.getPosition();
    if (shake) { camPos.x += shake.x; camPos.y += shake.y; camPos.z += shake.z; }
    this.sceneManager.updateCamera(camPos, this.input.lookYaw, this.input.lookPitch, dt);
    this.sceneManager.render();
  }

  createClickVFX(pos) {
    const ringMat = new THREE.MeshBasicMaterial({
      color: "#e2c073", transparent: true, opacity: 1.0,
      side: THREE.DoubleSide, depthWrite: false
    });
    const rings = [0.15, 0.4, 0.7].map((r, i) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.07, 32), ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(pos);
      ring.position.y += 0.18;
      this.worldGroup.add(ring);
      return { mesh: ring, delay: i * 0.04 };
    });

    let life = 0.55;
    const animate = () => {
      life -= 0.016;
      if (life <= 0 || !this.running) {
        rings.forEach(r => {
          this.worldGroup.remove(r.mesh);
          r.mesh.geometry.dispose();
        });
        return;
      }
      rings.forEach((r, i) => {
        const t = Math.max(0, (0.55 - life - r.delay * 0.5) / 0.55);
        r.mesh.scale.setScalar(1 + t * 2.5);
        r.mesh.material.opacity = (1 - t) * 0.9;
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  setSelectedCharacter(characterId) {
    if (!characterId) return;
    this.selectedCharacter = characterId;
    this.player?.changeCharacter?.(characterId);
  }

  _raycastCursorWorld() {
    if (!Number.isFinite(this.input?.mouseNDC?.x) || !Number.isFinite(this.input?.mouseNDC?.y)) {
      return null;
    }
    this.raycaster.setFromCamera(this.input.mouseNDC, this.sceneManager.camera);
    const playerPos = this.player?.getPosition?.();
    if (!playerPos) return null;

    // Use a stable navigation plane instead of a Rapier raycast to avoid physics WASM crashes.
    this.navPlane.constant = -Math.max(0, playerPos.y);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.navPlane, target);
    if (!hit) return null;

    target.y = playerPos.y;
    target.z = THREE.MathUtils.clamp(target.z, -95, 95);
    return target;
  }

  _createCursorIndicator() {
    const marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.7, 32),
      new THREE.MeshBasicMaterial({
        color: "#ffe8a3",
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    ring.rotation.x = -Math.PI / 2;

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 20),
      new THREE.MeshBasicMaterial({
        color: "#e2c073",
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    dot.rotation.x = -Math.PI / 2;

    marker.add(ring, dot);
    marker.visible = false;
    this.cursorMarker = marker;
    this.worldGroup.add(marker);
  }

  _updateCursorIndicator(dt) {
    if (!this.cursorMarker) return;
    const hit = this._raycastCursorWorld();
    this.cursorRayHit = hit;
    if (!hit) {
      this.cursorMarker.visible = false;
      return;
    }

    this.cursorMarker.visible = true;
    this.cursorMarker.position.copy(hit);
    this.cursorMarker.position.y += 0.15;
    this.cursorMarker.rotation.y += dt * 1.8;

    const pulse = 0.88 + Math.sin(performance.now() * 0.012) * 0.12;
    this.cursorMarker.scale.setScalar(pulse);
  }

  getDebugState() {
    const position = this.player?.getPosition?.();
    const velocity = this.player?.getVelocity?.();
    return {
      screen: this.state.screen,
      grounded: this.player?.grounded ?? null,
      groundGraceTimer: this.player?.groundGraceTimer ?? null,
      lastGroundDistance: this.player?.lastGroundDistance ?? null,
      jumpCooldown: this.player?.jumpCooldown ?? null,
      position: position ? { x: position.x, y: position.y, z: position.z } : null,
      velocity: velocity ? { x: velocity.x, y: velocity.y, z: velocity.z } : null
    };
  }
}
