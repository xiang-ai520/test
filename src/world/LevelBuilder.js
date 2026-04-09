import * as THREE from "three";
import { TILE_SIZE, tileToWorld } from "./LevelData.js";
import { createPatternTexture, makeToonMaterial } from "../visual/ToonMaterials.js";

function material(color, emissive = "#000000", map = null) {
  return makeToonMaterial({ color, emissive, map });
}

function mappedSurface(map, color = "#ffffff", roughness = 0.96) {
  void roughness;
  return makeToonMaterial({
    color: new THREE.Color(color),
    map
  });
}

function cloneTexture(texture, repeatX = 1, repeatY = 1) {
  const cloned = texture.clone();
  cloned.wrapS = THREE.RepeatWrapping;
  cloned.wrapT = THREE.RepeatWrapping;
  cloned.repeat.set(repeatX, repeatY);
  cloned.colorSpace = texture.colorSpace;
  cloned.anisotropy = texture.anisotropy;
  cloned.needsUpdate = true;
  return cloned;
}

function mappedTextureSet(textureSet, {
  color = "#ffffff",
  map = null,
  roughness = 0.94,
  normalScale = 0.6,
  colorRepeatX = 1,
  colorRepeatY = 1,
  detailRepeatX = colorRepeatX,
  detailRepeatY = colorRepeatY
} = {}) {
  void roughness;
  void normalScale;
  return makeToonMaterial({
    color: new THREE.Color(color),
    map: map ?? cloneTexture(textureSet.colorMap, colorRepeatX, colorRepeatY)
  });
}

export class LevelBuilder {
  constructor(scene, physicsWorld, assets) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.assets = assets;
    this.questionBlocks = [];
    this.breakableBlocks = [];
    this.coins = [];
    this.springs = [];
    this.traps = [];
    this.enemySpawns = [];
    this.structures = [];
    this.props = [];
    this.goal = null;
  }

  build(levelData) {
    const materials = {
      G: this._tileMaterial("G"),
      P: this._tileMaterial("P"),
      Q: this._tileMaterial("Q"),
      B: this._tileMaterial("B"),
      S: this._tileMaterial("S"),
      T: this._tileMaterial("T")
    };

    for (let y = 0; y < levelData.map.length; y += 1) {
      for (let x = 0; x < levelData.map[y].length; x += 1) {
        const tile = levelData.map[y][x];
        if (tile === "." || tile === "C") continue;
        const world = tileToWorld(x, y, 0);
        
        // Make the terrain physically bumpy and organic!
        if (tile === "G") {
           // Skip creating G tile blocks because we have a huge, beautiful procedural trimesh ground now!
           continue;
        }

        const depth = tile === "P" ? 18 : 5.2;
        const mesh = this._createTileMesh(tile, materials[tile], depth);
        mesh.position.set(world.x, world.y, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const body = this.physicsWorld.createStaticBox({
          x: world.x,
          y: world.y,
          z: 0,
          hx: TILE_SIZE * 0.5,
          hy: TILE_SIZE * 0.5,
          hz: depth * 0.5,
          userData: { tile, x, y }
        });

        const record = { tile, tileX: x, tileY: y, mesh, body };
        if (tile === "Q") this.questionBlocks.push({ ...record, used: false });
        if (tile === "B") this.breakableBlocks.push({ ...record, broken: false });
        if (tile === "S") this.springs.push({ ...record });
        if (tile === "T") this.traps.push({ ...record });
      }
    }

    this.coins = levelData.coinSpawns.map((coin) => ({ ...coin }));
    this.enemySpawns = levelData.enemySpawns.map((spawn) => ({ ...spawn }));
    this.structures = (levelData.structures ?? []).map((structure) => this._createStructure(structure));
    this.props = (levelData.propSpawns ?? []).map((spawn) => this._createProp(spawn)).filter(Boolean);
    this.goal = this._createGoal(levelData.goal);

    return {
      questionBlocks: this.questionBlocks,
      breakableBlocks: this.breakableBlocks,
      coins: this.coins,
      springs: this.springs,
      traps: this.traps,
      structures: this.structures,
      props: this.props,
      goal: this.goal,
      enemySpawns: this.enemySpawns
    };
  }

  _tileMaterial(tile) {
    const rock = this.assets?.getTextureSet("rock");
    const grass = this.assets?.getTextureSet("grass");
    const grassHd = this.assets?.getTexture("grass_hd");

    if (tile === "G") {
      const fallbackGrassMap = createPatternTexture("grass", "#f3d46f", 2.2, 30);
      const grassOverlay = grassHd ? cloneTexture(grassHd, 8, 8) : (grass ? cloneTexture(grass.colorMap, 2.2, 30) : fallbackGrassMap);
      grassOverlay.colorSpace = THREE.SRGBColorSpace;
      
      return {
        body: rock
          ? mappedTextureSet(rock, {
            color: "#ebe6dc",
            roughness: 0.92,
            normalScale: 1.15,
            colorRepeatX: 2.2,
            colorRepeatY: 18,
            detailRepeatX: 3.6,
            detailRepeatY: 18
          })
          : material("#8f6a4a", "#000000", createPatternTexture("soil", "#9a6842", 1, 8)),
        top: grassHd
          ? new THREE.MeshStandardMaterial({
              color: "#99d685",
              map: cloneTexture(grassHd, 8, 8),
              bumpMap: cloneTexture(grassHd, 8, 8),
              bumpScale: 0.2,
              roughness: 0.85
            })
          : (grass
          ? mappedTextureSet(grass, {
            color: "#ffffff",
            map: createPatternTexture("grass", "#f3d46f", 2.2, 30),
            roughness: 0.86,
            normalScale: 0.52,
            detailRepeatX: 2.2,
            detailRepeatY: 30
          })
          : mappedSurface(fallbackGrassMap, "#ffffff", 0.94)),
        accent: new THREE.MeshStandardMaterial({
          color: "#d6c56e",
          map: grassOverlay,
          roughness: 0.9,
          metalness: 0
        })
      };
    }

    const stoneMat = mappedSurface(createPatternTexture("stone", "#607090", 2, 2), "#b9caf0", 0.7);

    if (tile === "P") {
        return { 
           body: stoneMat,
           glow: makeToonMaterial({ color: "#69f0ff", emissive: "#49e8ff" })
        };
    }

    if (tile === "Q") return material("#ffd866", "#ffad33");
    if (tile === "B") return makeToonMaterial({ color: "#7dc4ff", emissive: "#62d9ff", transparent: true, opacity: 0.92 });
    if (tile === "S") return new THREE.MeshBasicMaterial({ color: "#8effd1", transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    if (tile === "T") return material("#d04d66", "#4a0d19");
    return stoneMat;
  }

  _createTileMesh(tile, tileMaterial, depth) {
    if (tile === "G") {
      const group = new THREE.Group();
      const soil = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE + 0.03, TILE_SIZE, depth), tileMaterial.body ?? tileMaterial);
      const grass = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE + 0.08, 0.18, depth + 0.08), tileMaterial.top ?? material("#60c26b"));
      const lip = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE + 0.02, 0.07, depth * 0.96), tileMaterial.accent ?? material("#8cb665"));
      grass.position.y = TILE_SIZE * 0.5 - 0.1;
      lip.position.y = TILE_SIZE * 0.5 - 0.02;
      group.add(soil, grass, lip);
      return group;
    }

    if (tile === "P") {
      const group = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(TILE_SIZE*0.7, TILE_SIZE*0.5, depth, 6), tileMaterial.body);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(TILE_SIZE*0.65, 0.2, 8, 24), tileMaterial.glow);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = depth*0.5;
      group.add(base, ring);
      return group;
    }

    if (tile === "S") {
      const group = new THREE.Group();
      // Wind Updraft Look
      const wind = new THREE.Mesh(new THREE.CylinderGeometry(TILE_SIZE*0.6, TILE_SIZE*0.6, depth * 4, 16, 1, true), tileMaterial);
      wind.position.y = depth * 1.5;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(TILE_SIZE*0.8, TILE_SIZE*0.9, depth, 8), material("#d1f7ff"));
      group.add(wind, base);
      return group;
    }

    if (tile === "T") {
      const group = new THREE.Group();
      for (let i = 0; i < 8; i += 1) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.5, 4), tileMaterial);
        const radius = TILE_SIZE * 0.4;
        const ang = (i/8)*Math.PI*2;
        spike.rotation.x = (Math.random()-0.5);
        spike.rotation.z = (Math.random()-0.5);
        spike.position.set(Math.cos(ang)*radius, Math.random(), Math.sin(ang)*radius);
        group.add(spike);
      }
      return group;
    }

    if (tile === "Q") {
      const group = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.IcosahedronGeometry(TILE_SIZE * 0.4, 0), new THREE.MeshBasicMaterial({color: "#ffc800", wireframe: true, transparent:true, opacity: 0.6}));
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(TILE_SIZE * 0.25, 0), tileMaterial);
      group.add(outer, core);
      // Floating animation offset will be handled in loop? We just add it here
      group.position.y += 1.0;
      return group;
    }

    if (tile === "B") {
      const group = new THREE.Group();
      // Breakable amethyst crystal cluster
      for(let i=0; i<3; i++) {
          const shardSq = new THREE.Mesh(new THREE.DodecahedronGeometry(TILE_SIZE * 0.4, 0), tileMaterial);
          shardSq.position.set((Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5);
          shardSq.rotation.set(Math.random(), Math.random(), Math.random());
          group.add(shardSq);
      }
      return group;
    }

    return new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, depth), tileMaterial);
  }

  _createGoal(goal) {
    const base = tileToWorld(goal.x, goal.y, 0);
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 12, 10), material("#f3f8ff"));
    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.1), material("#ff6d7b", "#712640"));
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), material("#ffe39b", "#6b4b00"));
    pole.position.y = 5.8;
    flag.position.set(0.9, 10.5, 0);
    orb.position.y = 11.9;
    group.add(pole, flag, orb);
    group.position.set(base.x, base.y - 0.4, 0);
    this.scene.add(group);

    this.physicsWorld.createSensor({
      x: base.x,
      y: base.y + 4.2,
      z: 0,
      hx: 1.2,
      hy: 5.5,
      hz: 1.8,
      userData: { type: "goal" }
    });

    return { position: new THREE.Vector3(base.x, base.y + 4.2, 0), mesh: group };
  }

  _createStructure(structure) {
    const size = {
      x: (structure.sizeX ?? 1) * TILE_SIZE,
      y: (structure.sizeY ?? 1) * TILE_SIZE,
      z: (structure.sizeZ ?? 1) * TILE_SIZE
    };
    const center = tileToWorld(structure.x, structure.y, structure.z ?? 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), this._structureMaterial(structure.style));
    mesh.position.set(center.x, center.y, center.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const topDecor = structure.style === "grass" ? this.assets?.instantiateModel("platform") : null;
    if (topDecor) {
      topDecor.position.copy(mesh.position);
      topDecor.position.y += size.y * 0.5;
      topDecor.scale.set(Math.max(1, structure.sizeX ?? 1), 1, Math.max(1, structure.sizeZ ?? 1));
      this.scene.add(topDecor);
    }

    const body = this.physicsWorld.createStaticBox({
      x: center.x,
      y: center.y,
      z: center.z,
      hx: size.x * 0.5,
      hy: size.y * 0.5,
      hz: size.z * 0.5,
      userData: { type: "structure", style: structure.style }
    });

    return { mesh, body, structure };
  }

  _createProp(spawn) {
    const model = this.assets?.instantiateModel(spawn.type);
    if (!model) return null;
    const world = tileToWorld(spawn.x, spawn.y, spawn.z ?? 0);
    model.position.set(world.x, world.y - TILE_SIZE * 0.4, world.z);
    model.scale.setScalar(spawn.scale ?? 1);
    model.rotation.y = spawn.rotationY ?? ((spawn.x + Math.abs(spawn.z ?? 0)) % 2 === 0 ? 0 : Math.PI * 0.5);
    this.scene.add(model);
    
    let body = null;
    if (["tree", "rocks", "pipe", "crate", "chest", "sign", "flowers", "mushrooms"].includes(spawn.type)) {
      body = this.physicsWorld.createStaticBox({
        x: world.x,
        y: world.y + 1,
        z: world.z,
        hx: 0.6 * (spawn.scale ?? 1),
        hy: 2 * (spawn.scale ?? 1),
        hz: 0.6 * (spawn.scale ?? 1),
        userData: { type: "prop", propType: spawn.type }
      });
    }

    return { mesh: model, spawn, opened: false, body };
  }

  _structureMaterial(style = "stone") {
    const rock = this.assets?.getTextureSet("rock");
    const grass = this.assets?.getTextureSet("grass");

    if (style === "grass") {
      return grass
        ? mappedTextureSet(grass, {
          color: "#ffffff",
          map: createPatternTexture("grass", "#f0d670", 1.4, 1.4),
          roughness: 0.88,
          normalScale: 0.42,
          detailRepeatX: 1.4,
          detailRepeatY: 1.4
        })
        : mappedSurface(createPatternTexture("grass", "#f0d670", 1.1, 1.1), "#ffffff", 0.94);
    }
    if (style === "wood") return mappedSurface(createPatternTexture("wood", "#bb8653", 1, 1), "#ffffff", 0.9);
    if (style === "brick") return material("#cd7f60", "#000000", createPatternTexture("brick", "#cd7f60"));
    if (style === "accent") return material("#5fb8d4", "#09263f");
    if (rock) {
      return mappedTextureSet(rock, { color: "#f1f1f1", roughness: 0.92, normalScale: 1.2, repeatX: 1.2, repeatY: 1.2 });
    }
    return mappedSurface(createPatternTexture("stone", "#91a1b2", 1.5, 1.5), "#f8f8f8", 0.9);
  }

  breakBlock(record) {
    if (record.broken) return;
    record.broken = true;
    this.scene.remove(record.mesh);
    this.physicsWorld.removeRigidBody(record.body.rigidBody);
  }
}
