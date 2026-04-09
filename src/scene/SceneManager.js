import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { makeToonMaterial } from "../visual/ToonMaterials.js";

/* ── Cinematic Post-Processing Shaders ──────────────────────────────── */

const CinematicShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignetteOffset: { value: 1.05 },
    vignetteDarkness: { value: 1.15 },
    saturation: { value: 1.12 },
    contrast: { value: 1.06 },
    brightness: { value: 1.02 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float vignetteOffset;
    uniform float vignetteDarkness;
    uniform float saturation;
    uniform float contrast;
    uniform float brightness;
    varying vec2 vUv;

    vec3 adjustSaturation(vec3 color, float s) {
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(luma), color, s);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Vignette
      vec2 uv = (vUv - 0.5) * vec2(vignetteOffset);
      float vignette = smoothstep(0.95, 0.15, dot(uv, uv));
      texel.rgb *= mix(vignetteDarkness, 1.0, vignette);

      // Saturation
      texel.rgb = adjustSaturation(texel.rgb, saturation);

      // Contrast
      texel.rgb = (texel.rgb - 0.5) * contrast + 0.5;

      // Brightness
      texel.rgb *= brightness;

      // Subtle warm color grading
      texel.r *= 1.02;
      texel.b *= 0.97;

      gl_FragColor = texel;
    }
  `
};

export class SceneManager {
  constructor(mount) {
    this.mount = mount;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2("#b8dcff", 0.0028);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 800);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.15, 0.92);
    this.cinematicPass = new ShaderPass(CinematicShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.cinematicPass);

    this.cameraTarget = new THREE.Vector3();
    this.smoothedCameraPosition = new THREE.Vector3(0, 8, 16);
    this.elapsedTime = 0;

    this._setupScene();
    this._attach();
  }

  _setupScene() {
    this._createSky();

    // ── Hemisphere (realistic sky/ground GI bounce) ──────────────────
    const hemi = new THREE.HemisphereLight("#c8e2ff", "#5da84f", 1.35);
    this.scene.add(hemi);

    // ── Soft ambient fill ──────────────────────────────────────────
    const ambient = new THREE.AmbientLight("#fff5e8", 0.35);
    this.scene.add(ambient);

    // ── Primary Sun (warm golden hour) ───────────────────────────────
    this.sun = new THREE.DirectionalLight("#ffe4a8", 2.6);
    this.sun.position.set(90, 140, 60);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.00008;
    this.sun.shadow.normalBias = 0.015;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 600;
    this.sun.shadow.camera.left   = -200;
    this.sun.shadow.camera.right  =  200;
    this.sun.shadow.camera.top    =  200;
    this.sun.shadow.camera.bottom = -200;
    this.scene.add(this.sun);

    // ── Cool sky-side fill (blue rim) ─────────────────────────────────
    const skyFill = new THREE.DirectionalLight("#a8d4ff", 0.55);
    skyFill.position.set(-100, 80, -140);
    this.scene.add(skyFill);

    // ── Warm bounce from below (subsurface warmth) ────────────────────
    const bounce = new THREE.DirectionalLight("#ffc8b0", 0.22);
    bounce.position.set(0, -40, 0);
    this.scene.add(bounce);

    // ── Back rim light for character readability ──────────────────────
    const rim = new THREE.DirectionalLight("#e8d4ff", 0.3);
    rim.position.set(-60, 40, 120);
    this.scene.add(rim);

    // ── Point light near player ────────────────────────────────────
    this.playerLight = new THREE.PointLight("#fff5d0", 1.2, 22, 1.5);
    this.playerLight.position.set(0, 6, 0);
    this.scene.add(this.playerLight);

    this._createBackdrop();
    this._createAtmosphericParticles();
  }

  _createSky() {
    // Multi-stop gradient sky dome for rich atmospheric colors
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0,    "#1a3c7a");
    gradient.addColorStop(0.15, "#2d62b8");
    gradient.addColorStop(0.3,  "#4a8be0");
    gradient.addColorStop(0.5,  "#7ec4f5");
    gradient.addColorStop(0.65, "#b8e4ff");
    gradient.addColorStop(0.78, "#ffe8c0");
    gradient.addColorStop(0.88, "#ffcc88");
    gradient.addColorStop(0.95, "#ff9e6e");
    gradient.addColorStop(1,    "#e86850");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 1024);
    const skyTex = new THREE.CanvasTexture(canvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;

    this.scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(700, 64, 32),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    ));
    this.scene.background = new THREE.Color("#8ec8f0");

    // Sun disc with multi-layer glow
    const sunGroup = new THREE.Group();
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(14, 32, 32),
      new THREE.MeshBasicMaterial({ color: "#fff8e0" })
    );
    sunGroup.add(sunCore);

    // Inner corona
    const corona1 = new THREE.Mesh(
      new THREE.SphereGeometry(22, 32, 32),
      new THREE.MeshBasicMaterial({
        color: "#fff0b0", transparent: true, opacity: 0.25,
        depthWrite: false
      })
    );
    sunGroup.add(corona1);

    // Outer corona / glow
    const corona2 = new THREE.Mesh(
      new THREE.RingGeometry(18, 80, 64),
      new THREE.MeshBasicMaterial({
        color: "#ffe080", transparent: true, opacity: 0.12,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    corona2.lookAt(0, 0, 0);
    sunGroup.add(corona2);

    // God rays (simplified light beams)
    for (let i = 0; i < 6; i++) {
      const rayGeo = new THREE.PlaneGeometry(3, 200);
      const rayMat = new THREE.MeshBasicMaterial({
        color: "#ffe8a0", transparent: true, opacity: 0.04,
        side: THREE.DoubleSide, depthWrite: false
      });
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.rotation.z = (i / 6) * Math.PI;
      sunGroup.add(ray);
    }

    sunGroup.position.set(320, 160, -300);
    this.scene.add(sunGroup);
  }

  _createBackdrop() {
    // 1. Reflective lake with animated ripple appearance
    const lakeGeo = new THREE.PlaneGeometry(4000, 4000, 1, 1);
    lakeGeo.rotateX(-Math.PI / 2);
    const lakeMat = new THREE.MeshStandardMaterial({
      color: "#3db8d8",
      emissive: "#0a3050",
      emissiveIntensity: 0.3,
      roughness: 0.15,
      metalness: 0.6,
      transparent: true,
      opacity: 0.82,
      envMapIntensity: 0.8
    });
    const lake = new THREE.Mesh(lakeGeo, lakeMat);
    lake.position.y = -8;
    lake.receiveShadow = true;
    this.scene.add(lake);

    // 2. Distant mountain ranges with layered parallax
    const mountainLayers = [
      { count: 12, radius: 500, height: 180, color: "#1a3028", emissive: "#0a1810", scale: 1.2 },
      { count: 16, radius: 650, height: 140, color: "#1e3830", emissive: "#0c1c14", scale: 1.0 },
      { count: 20, radius: 850, height: 100, color: "#243d35", emissive: "#101e18", scale: 0.8 }
    ];

    mountainLayers.forEach(layer => {
      for (let i = 0; i < layer.count; i++) {
        const mGeo = new THREE.ConeGeometry(
          60 + Math.random() * 80,
          layer.height * (0.6 + Math.random() * 0.8),
          5 + Math.floor(Math.random() * 3),
          1
        );
        const mMat = new THREE.MeshStandardMaterial({
          color: layer.color,
          emissive: layer.emissive,
          emissiveIntensity: 0.15,
          roughness: 0.95,
          metalness: 0.02,
          flatShading: true
        });
        const mountain = new THREE.Mesh(mGeo, mMat);
        const angle = (i / layer.count) * Math.PI * 2 + Math.random() * 0.3;
        mountain.position.set(
          Math.cos(angle) * layer.radius * (0.9 + Math.random() * 0.2),
          -15 + Math.random() * 10,
          Math.sin(angle) * layer.radius * (0.9 + Math.random() * 0.2)
        );
        mountain.scale.set(layer.scale, layer.scale, layer.scale);
        mountain.rotation.y = Math.random() * Math.PI;
        this.scene.add(mountain);
      }
    });

    // 3. Volumetric clouds with proper layering
    this.cloudGroups = [];
    for (let i = 0; i < 50; i++) {
      const cloud = new THREE.Group();
      const puffCount = 4 + Math.floor(Math.random() * 6);
      for (let j = 0; j < puffCount; j++) {
        const size = 12 + Math.random() * 18;
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(size, 12, 12),
          new THREE.MeshStandardMaterial({
            color: "#ffffff",
            emissive: "#94c8e0",
            emissiveIntensity: 0.15,
            roughness: 1.0,
            transparent: true,
            opacity: 0.7 + Math.random() * 0.25
          })
        );
        puff.scale.set(2.8, 0.7 + Math.random() * 0.3, 1.6);
        puff.position.set(
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 35
        );
        cloud.add(puff);
      }
      const cAngle = Math.random() * Math.PI * 2;
      const cRad = 200 + Math.random() * 700;
      cloud.position.set(
        Math.cos(cAngle) * cRad,
        100 + Math.random() * 120,
        Math.sin(cAngle) * cRad
      );
      cloud.userData.driftSpeed = 0.3 + Math.random() * 0.8;
      cloud.userData.driftAngle = cAngle;
      this.cloudGroups.push(cloud);
      this.scene.add(cloud);
    }

    // 4. Distant floating islands for fantasy atmosphere
    for (let i = 0; i < 5; i++) {
      const island = new THREE.Group();

      const rockGeo = new THREE.DodecahedronGeometry(15 + Math.random() * 12, 1);
      const rockMat = new THREE.MeshStandardMaterial({
        color: "#5a7868", emissive: "#1a2820",
        emissiveIntensity: 0.1, roughness: 0.85, flatShading: true
      });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.scale.set(1, 0.5 + Math.random() * 0.3, 1);
      island.add(rock);

      // Grass cap
      const grassCap = new THREE.Mesh(
        new THREE.CylinderGeometry(12 + Math.random() * 8, 14, 3, 8),
        new THREE.MeshStandardMaterial({
          color: "#6db858", emissive: "#1a3818", roughness: 0.9
        })
      );
      grassCap.position.y = 6;
      island.add(grassCap);

      // Mini trees on floating island
      for (let t = 0; t < 3; t++) {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.6, 4, 5),
          new THREE.MeshStandardMaterial({ color: "#6b4a30", roughness: 0.9 })
        );
        const foliage = new THREE.Mesh(
          new THREE.SphereGeometry(3, 6, 6),
          new THREE.MeshStandardMaterial({
            color: "#4a9838", emissive: "#102808", roughness: 0.85
          })
        );
        trunk.position.set((Math.random() - 0.5) * 8, 9, (Math.random() - 0.5) * 8);
        foliage.position.copy(trunk.position);
        foliage.position.y += 4;
        island.add(trunk, foliage);
      }

      const angle = (i / 5) * Math.PI * 2 + Math.random();
      const dist = 250 + Math.random() * 200;
      island.position.set(
        Math.cos(angle) * dist,
        60 + Math.random() * 80,
        Math.sin(angle) * dist
      );
      island.userData.floatPhase = Math.random() * Math.PI * 2;
      island.userData.baseY = island.position.y;
      this.scene.add(island);
      if (!this.floatingIslands) this.floatingIslands = [];
      this.floatingIslands.push(island);
    }
  }

  _createAtmosphericParticles() {
    // Floating dust motes / pollen particles
    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 30 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;

      const isGolden = Math.random() > 0.6;
      colors[i * 3] = isGolden ? 1.0 : 0.85;
      colors[i * 3 + 1] = isGolden ? 0.9 : 0.92;
      colors[i * 3 + 2] = isGolden ? 0.5 : 1.0;

      sizes[i] = 0.15 + Math.random() * 0.25;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.dustParticles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.dustParticles);
  }

  setupTerrain(assets) {
    const grassMap = assets.getTexture("grass_hd");
    const grassNormal = assets.getTexture("grass_nm");
    if (!grassMap) return;

    // High-quality terrain with proper PBR materials
    const islandGeo = new THREE.PlaneGeometry(800, 800, 128, 128);
    islandGeo.rotateX(-Math.PI / 2);

    const pos = islandGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let y = Math.sin(x * 0.03 + z * 0.02) * 8;
      y += Math.cos(x * 0.08 - z * 0.05) * 4;
      y += Math.sin(x * 0.3 + z * 0.3) * 0.8;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 40) y *= 0.3;
      pos.setY(i, y - 2);
    }
    islandGeo.computeVertexNormals();

    // Use proper MeshStandardMaterial with normal map for terrain
    const grassMapClone = grassMap.clone();
    grassMapClone.wrapS = THREE.RepeatWrapping;
    grassMapClone.wrapT = THREE.RepeatWrapping;
    grassMapClone.repeat.set(60, 60);
    grassMapClone.colorSpace = THREE.SRGBColorSpace;
    grassMapClone.needsUpdate = true;

    const matConfig = {
      color: "#7fdb6c",
      map: grassMapClone,
      roughness: 0.82,
      metalness: 0.02,
      emissive: "#0a2808",
      emissiveIntensity: 0.1
    };

    if (grassNormal) {
      const nmClone = grassNormal.clone();
      nmClone.wrapS = THREE.RepeatWrapping;
      nmClone.wrapT = THREE.RepeatWrapping;
      nmClone.repeat.set(60, 60);
      nmClone.needsUpdate = true;
      matConfig.normalMap = nmClone;
      matConfig.normalScale = new THREE.Vector2(0.8, 0.8);
    }

    const mat = new THREE.MeshStandardMaterial(matConfig);

    const terrain = new THREE.Mesh(islandGeo, mat);
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    this._createArchitecture();

    return {
      vertices: islandGeo.attributes.position.array,
      indices: islandGeo.index.array
    };
  }

  _createArchitecture() {
    // AAA-quality castle with PBR materials
    const stoneMat = new THREE.MeshStandardMaterial({
      color: "#d0d8e8", emissive: "#1a2540", emissiveIntensity: 0.08,
      roughness: 0.85, metalness: 0.05
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: "#3a5080", emissive: "#101830", emissiveIntensity: 0.1,
      roughness: 0.7, metalness: 0.15
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: "#a07048", emissive: "#3a1808", emissiveIntensity: 0.05,
      roughness: 0.9, metalness: 0.02
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: "#e8c868", emissive: "#705810", emissiveIntensity: 0.15,
      roughness: 0.3, metalness: 0.7
    });

    const cityGroup = new THREE.Group();

    // Castle walls
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(40, 60, 4), stoneMat);
    backWall.position.set(0, 30, -18); backWall.castShadow = true; backWall.receiveShadow = true;
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(4, 60, 40), stoneMat);
    leftWall.position.set(-18, 30, 0); leftWall.castShadow = true; leftWall.receiveShadow = true;
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(4, 60, 40), stoneMat);
    rightWall.position.set(18, 30, 0); rightWall.castShadow = true; rightWall.receiveShadow = true;

    const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(12, 60, 4), stoneMat);
    frontLeft.position.set(-14, 30, 18);
    const frontRight = new THREE.Mesh(new THREE.BoxGeometry(12, 60, 4), stoneMat);
    frontRight.position.set(14, 30, 18);
    const frontTop = new THREE.Mesh(new THREE.BoxGeometry(16, 40, 4), stoneMat);
    frontTop.position.set(0, 40, 18);
    cityGroup.add(backWall, leftWall, rightWall, frontLeft, frontRight, frontTop);

    // Royal carpet with emissive glow
    const carpetMat = new THREE.MeshStandardMaterial({
      color: "#c04050", emissive: "#600818", emissiveIntensity: 0.15,
      roughness: 0.95, metalness: 0
    });
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(12, 36), carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.1, 0);
    cityGroup.add(carpet);

    // Throne with gold accents
    const throneBase = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 6), goldMat);
    throneBase.position.set(0, 1, -12);
    const throneBack = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 1), goldMat);
    throneBack.position.set(0, 6, -14);
    cityGroup.add(throneBase, throneBack);

    // Magic braziers with animated glow
    const brazierMat = new THREE.MeshBasicMaterial({
      color: "#3ee8ff", transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    for (let i = 0; i < 4; i++) {
      const bz = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 4), brazierMat);
      bz.position.set(i % 2 == 0 ? -10 : 10, 4, -8 + Math.floor(i / 2) * 12);
      bz.rotation.x = Math.PI;
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4), stoneMat);
      stand.position.copy(bz.position);
      stand.position.y -= 2;

      // Point light per brazier for local illumination
      const brazierLight = new THREE.PointLight("#40e8ff", 0.6, 12, 2);
      brazierLight.position.copy(bz.position);
      brazierLight.position.y += 2;
      cityGroup.add(bz, stand, brazierLight);
    }

    // Castle roof
    const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(30, 20, 4), roofMat);
    mainRoof.position.set(0, 70, 0);
    mainRoof.rotation.y = Math.PI / 4;
    mainRoof.castShadow = true;
    cityGroup.add(mainRoof);

    // Towers with golden spire tips
    const towerPos = [[-25, -25], [25, -25], [-25, 25], [25, 25]];
    towerPos.forEach(([tx, tz]) => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(8, 10, 80, 8), stoneMat);
      tower.position.set(tx, 40, tz);
      tower.castShadow = true; tower.receiveShadow = true;
      const tRoof = new THREE.Mesh(new THREE.ConeGeometry(9, 25, 8), roofMat);
      tRoof.position.set(tx, 92.5, tz);
      tRoof.castShadow = true;
      // Gold spire tip
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.5, 8, 6), goldMat);
      spire.position.set(tx, 108, tz);
      // Tower window glow
      const windowLight = new THREE.PointLight("#ffe080", 0.4, 15, 2);
      windowLight.position.set(tx, 50, tz);
      cityGroup.add(tower, tRoof, spire, windowLight);
    });

    // Outer walls with battlements
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(40, 30, 6), stoneMat);
    wall1.position.set(0, 15, -25); wall1.castShadow = true;
    const wall2 = wall1.clone(); wall2.position.set(0, 15, 25);
    const wall3 = new THREE.Mesh(new THREE.BoxGeometry(6, 30, 40), stoneMat);
    wall3.position.set(-25, 15, 0); wall3.castShadow = true;
    const wall4 = wall3.clone(); wall4.position.set(25, 15, 0);
    cityGroup.add(wall1, wall2, wall3, wall4);

    // Banner flags on walls
    const bannerMat = new THREE.MeshStandardMaterial({
      color: "#c02040", emissive: "#500818",
      roughness: 0.9, side: THREE.DoubleSide
    });
    for (let i = 0; i < 4; i++) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(3, 8), bannerMat);
      const angle = (i / 4) * Math.PI * 2;
      banner.position.set(Math.cos(angle) * 25, 28, Math.sin(angle) * 25);
      banner.lookAt(0, 28, 0);
      cityGroup.add(banner);
    }

    cityGroup.position.set(-60, 0, -80);
    this.scene.add(cityGroup);

    // Scatter houses with better materials
    for (let i = 0; i < 8; i++) {
      const hg = new THREE.Group();
      const hMat = new THREE.MeshStandardMaterial({
        color: "#f8f0d8", emissive: "#302818", emissiveIntensity: 0.05,
        roughness: 0.88, side: THREE.DoubleSide
      });
      const base = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 16), hMat);
      base.position.y = 6;
      base.castShadow = true; base.receiveShadow = true;
      const hRoof = new THREE.Mesh(new THREE.ConeGeometry(14, 10, 4), roofMat);
      hRoof.position.y = 17; hRoof.rotation.y = Math.PI / 4;
      hRoof.castShadow = true;

      // Chimney
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(2, 6, 2),
        new THREE.MeshStandardMaterial({ color: "#705848", roughness: 0.9 })
      );
      chimney.position.set(4, 18, 2);
      hg.add(chimney);

      // Window glow
      const windowGlow = new THREE.PointLight("#ffe0a0", 0.3, 10, 2);
      windowGlow.position.set(0, 6, 8);
      hg.add(windowGlow);

      const table = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 6), woodMat);
      table.position.y = 3;
      hg.add(table);

      if (Math.random() > 0.5) {
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 18, 8), stoneMat);
        silo.position.set(8, 9, 0); silo.castShadow = true;
        const sRoof = new THREE.Mesh(new THREE.ConeGeometry(5, 6, 8), roofMat);
        sRoof.position.set(8, 21, 0);
        hg.add(silo, sRoof);
      }
      hg.add(base, hRoof);

      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 80;
      hg.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      hg.lookAt(0, 0, 0);
      this.scene.add(hg);
    }
  }

  _attach() {
    this.mount.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cursor = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><circle cx=\"16\" cy=\"16\" r=\"6\" fill=\"none\" stroke=\"%23e2c073\" stroke-width=\"2\"/>  <line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"10\" stroke=\"%23e2c073\" stroke-width=\"2\"/><line x1=\"16\" y1=\"22\" x2=\"16\" y2=\"30\" stroke=\"%23e2c073\" stroke-width=\"2\"/><line x1=\"2\" y1=\"16\" x2=\"10\" y2=\"16\" stroke=\"%23e2c073\" stroke-width=\"2\"/><line x1=\"22\" y1=\"16\" x2=\"30\" y2=\"16\" stroke=\"%23e2c073\" stroke-width=\"2\"/></svg>') 16 16, crosshair";
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const width = this.mount.clientWidth || window.innerWidth;
    const height = this.mount.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
  }

  updateCamera(playerPosition, lookYaw, lookPitch, dt) {
    if (!Number.isFinite(playerPosition.x) || !Number.isFinite(playerPosition.y) || !Number.isFinite(playerPosition.z)) {
      return;
    }
    this.elapsedTime += dt;

    // Update cinematic shader time
    if (this.cinematicPass) {
      this.cinematicPass.uniforms.time.value = this.elapsedTime;
    }

    const distance = 9.5;
    const safePitch = THREE.MathUtils.clamp(lookPitch, -0.15, 0.62);
    const height = 4.2 + safePitch * 8.2;
    const focusForward = new THREE.Vector3(Math.sin(lookYaw), 0, Math.cos(lookYaw)).normalize();
    const offset = new THREE.Vector3(-focusForward.x * distance, height, -focusForward.z * distance);

    const desiredPosition = playerPosition.clone().add(offset);
    desiredPosition.y = Math.max(desiredPosition.y, playerPosition.y + 2.5);
    this.smoothedCameraPosition.lerp(desiredPosition, 1 - Math.pow(0.001, dt));
    this.camera.position.copy(this.smoothedCameraPosition);

    const focus = playerPosition
      .clone()
      .add(focusForward.multiplyScalar(6.0))
      .add(new THREE.Vector3(0, 2.2 + safePitch * 2.5, 0));
    this.cameraTarget.lerp(focus, 1 - Math.pow(0.001, dt));
    this.camera.lookAt(this.cameraTarget);

    // Move player fill light with character
    if (this.playerLight) {
      this.playerLight.position.set(
        playerPosition.x + Math.sin(lookYaw) * 3,
        playerPosition.y + 6,
        playerPosition.z + Math.cos(lookYaw) * 3
      );
    }

    // Make sun shadow frustum follow player
    if (this.sun) {
      this.sun.target.position.copy(playerPosition);
      this.sun.target.updateMatrixWorld();
    }

    // Animate dust particles relative to player
    if (this.dustParticles) {
      this.dustParticles.position.set(playerPosition.x, 0, playerPosition.z);
      const positions = this.dustParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(this.elapsedTime * 0.4 + i) * 0.003;
        positions[i] += Math.cos(this.elapsedTime * 0.2 + i * 0.5) * 0.002;
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Animate floating islands
    if (this.floatingIslands) {
      this.floatingIslands.forEach(island => {
        island.position.y = island.userData.baseY +
          Math.sin(this.elapsedTime * 0.3 + island.userData.floatPhase) * 3;
        island.rotation.y += dt * 0.02;
      });
    }

    // Subtle cloud drift
    if (this.cloudGroups) {
      this.cloudGroups.forEach(cloud => {
        cloud.position.x += Math.cos(cloud.userData.driftAngle) * cloud.userData.driftSpeed * dt;
        cloud.position.z += Math.sin(cloud.userData.driftAngle) * cloud.userData.driftSpeed * dt;
      });
    }
  }

  render() {
    this.composer.render();
  }
}
