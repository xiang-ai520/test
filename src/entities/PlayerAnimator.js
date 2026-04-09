import * as THREE from "three";
import { PLAYER_STATES } from "../core/GameState.js";
import { VRMHumanBoneName } from "@pixiv/three-vrm";

/* ── Bone lookup table ───────────────────────────────────────────── */
const BONE_NAME_MAP = {
  hips: VRMHumanBoneName.Hips,
  spine: VRMHumanBoneName.Spine,
  chest: VRMHumanBoneName.Chest,
  upperChest: VRMHumanBoneName.UpperChest,
  neck: VRMHumanBoneName.Neck,
  head: VRMHumanBoneName.Head,
  leftUpperArm: VRMHumanBoneName.LeftUpperArm,
  rightUpperArm: VRMHumanBoneName.RightUpperArm,
  leftLowerArm: VRMHumanBoneName.LeftLowerArm,
  rightLowerArm: VRMHumanBoneName.RightLowerArm,
  leftHand: VRMHumanBoneName.LeftHand,
  rightHand: VRMHumanBoneName.RightHand,
  leftUpperLeg: VRMHumanBoneName.LeftUpperLeg,
  rightUpperLeg: VRMHumanBoneName.RightUpperLeg,
  leftLowerLeg: VRMHumanBoneName.LeftLowerLeg,
  rightLowerLeg: VRMHumanBoneName.RightLowerLeg,
  leftFoot: VRMHumanBoneName.LeftFoot,
  rightFoot: VRMHumanBoneName.RightFoot,
  leftToes: VRMHumanBoneName.LeftToes,
  rightToes: VRMHumanBoneName.RightToes
};

const BONE_KEYS = [
  "hips", "spine", "chest", "upperChest", "neck", "head",
  "leftUpperArm", "rightUpperArm", "leftLowerArm", "rightLowerArm",
  "leftHand", "rightHand",
  "leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg",
  "leftFoot", "rightFoot", "leftToes", "rightToes"
];

/* ── Base idle pose per character style ──────────────────────────── */
const BASE_POSE = {
  default: {
    hips: { x: 0.04 },
    spine: { x: -0.06 },
    chest: { x: -0.06 },
    upperChest: { x: -0.04 },
    leftUpperArm:  { x: 0.12, y: 0.08, z: 1.0 },
    rightUpperArm: { x: 0.12, y: -0.08, z: -1.0 },
    leftLowerArm:  { x: -0.18, z: 0.08 },
    rightLowerArm: { x: -0.18, z: -0.08 },
    leftHand:  { z: 0.06 },
    rightHand: { z: -0.06 },
    leftUpperLeg:  { x: -0.04 },
    rightUpperLeg: { x: -0.04 },
    leftLowerLeg:  { x: -0.06 },
    rightLowerLeg: { x: -0.06 },
    leftFoot:  { x: 0.04 },
    rightFoot: { x: 0.04 }
  },
  girl: {
    hips: { x: 0.08, y: -0.02 },
    spine: { x: -0.1 },
    chest: { x: -0.1 },
    upperChest: { x: -0.06 },
    neck: { x: -0.02 },
    leftUpperArm:  { x: 0.15, y: 0.08, z: 1.15 },
    rightUpperArm: { x: 0.15, y: -0.08, z: -1.15 },
    leftLowerArm:  { x: -0.28, y: 0.04, z: 0.08 },
    rightLowerArm: { x: -0.28, y: -0.04, z: -0.08 },
    leftHand:  { x: -0.05, y: 0.02, z: 0.08 },
    rightHand: { x: -0.05, y: -0.02, z: -0.08 },
    leftUpperLeg:  { x: -0.08, z: -0.04 },
    rightUpperLeg: { x: -0.08, z: 0.04 },
    leftLowerLeg:  { x: -0.12 },
    rightLowerLeg: { x: -0.12 },
    leftFoot:  { x: 0.08, z: -0.03 },
    rightFoot: { x: 0.08, z: 0.03 },
    leftToes:  { x: -0.02 },
    rightToes: { x: -0.02 }
  }
};


/* ── Anatomical Gait Data (Degrees for Sasgittal/Flexion) ────────── */
const GAIT_CURVES = {
  // Keyframes at [% phase]: [Hip, Knee, Ankle]
  normal: [
    { p: 0.00, hip: 28,  knee: 4,   ank: 0 },   // Initial Contact
    { p: 0.12, hip: 20,  knee: 18,  ank: -8 },  // Loading Response
    { p: 0.31, hip: 0,   knee: 4,   ank: 6 },   // Mid Stance
    { p: 0.50, hip: -18, knee: 1,   ank: 8 },   // Terminal Stance
    { p: 0.62, hip: -12, knee: 35,  ank: -16 }, // Pre-Swing
    { p: 0.75, hip: 14,  knee: 62,  ank: -8 },  // Initial Swing
    { p: 0.88, hip: 32,  knee: 25,  ank: 0 },   // Mid Swing
    { p: 1.00, hip: 28,  knee: 4,   ank: 0 }    // Loop
  ],
  run: [
    { p: 0.00, hip: 45,  knee: 10,  ank: 0 },
    { p: 0.15, hip: 30,  knee: 45,  ank: -20 },
    { p: 0.35, hip: -15, knee: 15,  ank: 10 },
    { p: 0.50, hip: -45, knee: 5,   ank: 15 },
    { p: 0.65, hip: -30, knee: 60,  ank: -10 },
    { p: 0.85, hip: 25,  knee: 85,  ank: -5 },
    { p: 1.00, hip: 45,  knee: 10,  ank: 0 }
  ]
};

function evaluateGait(cycle, phase) {
  const curve = GAIT_CURVES[cycle] || GAIT_CURVES.normal;
  const p = (phase % 1 + 1) % 1;
  let i = 0;
  while (i < curve.length - 1 && curve[i + 1].p < p) i++;
  const c1 = curve[i], c2 = curve[i + 1];
  const t = (p - c1.p) / (c2.p - c1.p);
  const lerp = (a, b) => a + (b - a) * t;
  const degToRad = Math.PI / 180;
  return {
    hip: lerp(c1.hip, c2.hip) * degToRad,
    knee: lerp(c1.knee, c2.knee) * degToRad,
    ankle: lerp(c1.ank, c2.ank) * degToRad
  };
}

/* ===================================================================
 *  PlayerAnimator  —  "Last-writer-wins" spring bone system
 *
 *  DESIGN:  Each call to _setBone(key, axis, target, stiffness)
 *  SETS the target for that bone:axis (not accumulating).
 *  Later calls overwrite earlier ones (last writer wins).
 *  At the end of update(), ONE lerp per bone:axis is performed.
 *
 *  This fixes the old sequential-lerp bug where multiple lerps
 *  per frame on the same bone dampened each other's results.
 * =================================================================*/
export class PlayerAnimator {
  constructor(assets, selectedCharacter = "tartaglia") {
    this.assets = assets;
    this.selectedCharacter = selectedCharacter;
    this.root = new THREE.Group();
    this.visualOffsetY = -1.15;
    this.playerState = PLAYER_STATES.normal;
    this.state = "idle";
    this.animTime = 0;
    this.landBounce = 0;
    this.prevGrounded = false;

    this.vrm = null;
    this.model = null;
    this.mixer = null;
    this.actions = new Map();
    this.activeAction = null;
    this.smoothedPlanarSpeed = 0;

    this.bones = {};
    this.restRotation = {};
    this.restPosition = {};

    /* persistent spring state (survives across frames) */
    this._rotCur = {};
    this._posCur = {};

    /* per-frame target buffers: key → { target, stiffness } */
    this._fRot = {};
    this._fPos = {};

    /* per-frame VRM output */
    this._poseRot = {};
    this._posePos = {};

    this._build();
  }

  /* ─── Model setup ─────────────────────────────────────────────── */
  _build() {
    const preferred = this.selectedCharacter === "girl" ? "player_girl" : "player";
    const fallback  = preferred === "player_girl" ? "player" : "player_girl";
    const assetName = this.assets.getModel(preferred) ? preferred
                    : this.assets.getModel(fallback) ? fallback : null;

    const inst = assetName ? this.assets.instantiateCharacter(assetName) : null;
    if (!inst?.root) { this._buildFallback(); return; }

    this.vrm = inst.vrm ?? null;
    if (this.vrm?.humanoid) {
      this.vrm.humanoid.autoUpdateHumanBones = true;
      this.vrm.humanoid.resetNormalizedPose?.();
    }
    this.model = inst.root;

    this._normalizeModelScale(this.model);
    this._applyMaterials(this.model);
    this._captureBones(this.model, this.vrm);
    this.root.add(this.model);

    const clips = inst.animations ?? [];
    if (clips.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.model);
      clips.forEach(c => this.actions.set(c.name.toLowerCase(), this.mixer.clipAction(c)));
      this._playAction(this._resolveClipName(), 0);
    }
  }

  _normalizeModelScale(model) {
    const sz = new THREE.Vector3();
    new THREE.Box3().setFromObject(model).getSize(sz);
    if (sz.y > 0.001) {
      const h = this.selectedCharacter === "girl" ? 6.4 : 5.2;
      model.scale.setScalar(h / sz.y);
    }
    const box = new THREE.Box3().setFromObject(model);
    if (Number.isFinite(box.min.y)) this.visualOffsetY = -1.15 - box.min.y;
  }

  _applyMaterials(model) {
    model.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
      const convert = src => {
        if (!src || src.isMToonMaterial) return src;
        return new THREE.MeshStandardMaterial({
          map: src.map ?? null, normalMap: src.normalMap ?? null,
          roughnessMap: src.roughnessMap ?? null, metalnessMap: src.metalnessMap ?? null,
          color: src.color?.clone?.() ?? new THREE.Color("#c9c9c9"),
          emissive: src.emissive?.clone?.() ?? new THREE.Color("#000000"),
          emissiveIntensity: src.emissiveIntensity ?? 0,
          roughness: src.roughness ?? 0.72, metalness: src.metalness ?? 0.08,
          transparent: Boolean(src.transparent), opacity: src.opacity ?? 1,
          side: src.side ?? THREE.FrontSide
        });
      };
      child.material = Array.isArray(child.material) ? child.material.map(convert) : convert(child.material);
    });
  }

  _captureBones(model, vrm) {
    const grab = (key, node) => {
      if (!node) return;
      this.bones[key] = node;
      this.restRotation[key] = node.rotation.clone();
      this.restPosition[key] = node.position.clone();
    };

    if (vrm?.humanoid) {
      Object.entries(BONE_NAME_MAP).forEach(([k, bn]) => {
        grab(k, vrm.humanoid.getNormalizedBoneNode(bn) ?? vrm.humanoid.getRawBoneNode(bn));
      });
    }

    if (!this.bones.hips) {
      model.traverse(c => {
        if (!c.isBone) return;
        const n = c.name.toLowerCase();
        if (n.includes("hips")) grab("hips", c);
        if (n.includes("spine") && !n.includes("spine1")) grab("spine", c);
        if (n.includes("spine1") || n.includes("spine_01") || n.includes("chest")) grab("chest", c);
        if (n.includes("spine2") || n.includes("upperchest")) grab("upperChest", c);
        if (n.includes("neck")) grab("neck", c);
        if (n.includes("head")) grab("head", c);
        if (n.includes("leftupperarm") || n.includes("left_upper_arm") || n.includes("leftarm")) grab("leftUpperArm", c);
        if (n.includes("rightupperarm") || n.includes("right_upper_arm") || n.includes("rightarm")) grab("rightUpperArm", c);
        if (n.includes("leftlowerarm") || n.includes("left_fore_arm") || n.includes("leftforearm")) grab("leftLowerArm", c);
        if (n.includes("rightlowerarm") || n.includes("right_fore_arm") || n.includes("rightforearm")) grab("rightLowerArm", c);
        if (n.includes("lefthand") || n.includes("left_hand")) grab("leftHand", c);
        if (n.includes("righthand") || n.includes("right_hand")) grab("rightHand", c);
        if (n.includes("leftupleg") || n.includes("leftupperleg") || n.includes("left_thigh")) grab("leftUpperLeg", c);
        if (n.includes("rightupleg") || n.includes("rightupperleg") || n.includes("right_thigh")) grab("rightUpperLeg", c);
        if (n.includes("leftlowerleg") || n.includes("leftshin") || n.includes("left_leg")) grab("leftLowerLeg", c);
        if (n.includes("rightlowerleg") || n.includes("rightshin") || n.includes("right_leg")) grab("rightLowerLeg", c);
        if ((n.includes("leftfoot") || n.includes("left_foot")) && !n.includes("toe")) grab("leftFoot", c);
        if ((n.includes("rightfoot") || n.includes("right_foot")) && !n.includes("toe")) grab("rightFoot", c);
        if (n.includes("lefttoe")) grab("leftToes", c);
        if (n.includes("righttoe")) grab("rightToes", c);
      });
    }

    this.hasHumanoidRig = Boolean(
      this.bones.hips && this.bones.leftUpperArm && this.bones.rightUpperArm &&
      this.bones.leftUpperLeg && this.bones.rightUpperLeg
    );
  }

  _buildFallback() {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.45, 1.1, 4, 8),
      new THREE.MeshStandardMaterial({ color: "#8f9aa6", roughness: 0.72, metalness: 0.08 })
    );
    body.castShadow = true;
    body.receiveShadow = true;
    this.root.add(body);
    this.visualOffsetY = -1.1;
  }

  setPowered(powered) {
    this.playerState = powered ? PLAYER_STATES.powered : PLAYER_STATES.normal;
  }

  /* ─── Last-writer-wins spring target system ───────────────────── */

  /**
   * SET the target rotation for bone `key` on `axis`.
   * If called multiple times for the same key:axis in one frame,
   * the LAST call's value wins (not additive).
   */
  _setBone(key, axis, target, stiffness = 0.1) {
    const sk = `${key}:${axis}`;
    this._fRot[sk] = { target, stiffness };
  }

  /** SET the target position offset for bone `key` on `axis`. */
  _setPos(key, axis, target, stiffness = 0.12) {
    const sk = `${key}:pos:${axis}`;
    this._fPos[sk] = { target, stiffness };
  }

  /** Apply all target springs in a SINGLE lerp pass. */
  _flushSprings(dt) {
    const isVRM = Boolean(this.vrm?.humanoid);

    /* ── rotations ── */
    for (const sk in this._fRot) {
      const { target, stiffness } = this._fRot[sk];
      const dotIdx = sk.indexOf(":");
      const key  = sk.substring(0, dotIdx);
      const axis = sk.substring(dotIdx + 1);

      const bone = this.bones[key];
      const boneIsVRM = isVRM && Boolean(BONE_NAME_MAP[key]);
      if (!bone && !boneIsVRM) continue;

      const base = boneIsVRM ? 0 : (this.restRotation[key]?.[axis] ?? 0);
      const finalTarget = base + target;

      if (this._rotCur[sk] === undefined) {
        this._rotCur[sk] = boneIsVRM ? 0 : (bone?.rotation?.[axis] ?? 0);
      }

      const alpha = 1 - Math.exp(-dt / stiffness);
      this._rotCur[sk] += (finalTarget - this._rotCur[sk]) * alpha;

      if (boneIsVRM) {
        if (!this._poseRot[key]) this._poseRot[key] = { x: 0, y: 0, z: 0 };
        this._poseRot[key][axis] = this._rotCur[sk];
      } else if (bone) {
        bone.rotation[axis] = this._rotCur[sk];
      }
    }

    /* ── positions ── */
    for (const sk in this._fPos) {
      const { target, stiffness } = this._fPos[sk];
      const first  = sk.indexOf(":");
      const second = sk.indexOf(":", first + 1);
      const key  = sk.substring(0, first);
      const axis = sk.substring(second + 1);

      const bone = this.bones[key];
      const boneIsVRM = isVRM && Boolean(BONE_NAME_MAP[key]);
      if (!bone && !boneIsVRM) continue;

      const base = boneIsVRM ? 0 : (this.restPosition[key]?.[axis] ?? 0);
      const finalTarget = base + target;

      if (this._posCur[sk] === undefined) {
        this._posCur[sk] = boneIsVRM ? 0 : (bone?.position?.[axis] ?? 0);
      }

      const alpha = 1 - Math.exp(-dt / stiffness);
      this._posCur[sk] += (finalTarget - this._posCur[sk]) * alpha;

      if (boneIsVRM) {
        if (!this._posePos[key]) this._posePos[key] = { x: 0, y: 0, z: 0 };
        this._posePos[key][axis] = this._posCur[sk];
      } else if (bone) {
        bone.position[axis] = this._posCur[sk];
      }
    }

    /* Return untouched bones to rest (0 for VRM) */
    for (const sk in this._rotCur) {
      if (sk in this._fRot) continue; // already handled
      // This bone:axis wasn't set this frame — decay toward 0/rest
      const dotIdx = sk.indexOf(":");
      const key  = sk.substring(0, dotIdx);
      const axis = sk.substring(dotIdx + 1);
      const bone = this.bones[key];
      const boneIsVRM = isVRM && Boolean(BONE_NAME_MAP[key]);
      const base = boneIsVRM ? 0 : (this.restRotation[key]?.[axis] ?? 0);
      const alpha = 1 - Math.exp(-dt / 0.16);
      this._rotCur[sk] += (base - this._rotCur[sk]) * alpha;
      if (boneIsVRM) {
        if (!this._poseRot[key]) this._poseRot[key] = { x: 0, y: 0, z: 0 };
        this._poseRot[key][axis] = this._rotCur[sk];
      } else if (bone) {
        bone.rotation[axis] = this._rotCur[sk];
      }
    }
    for (const sk in this._posCur) {
      if (sk in this._fPos) continue;
      const first  = sk.indexOf(":");
      const second = sk.indexOf(":", first + 1);
      const key  = sk.substring(0, first);
      const axis = sk.substring(second + 1);
      const bone = this.bones[key];
      const boneIsVRM = isVRM && Boolean(BONE_NAME_MAP[key]);
      const base = boneIsVRM ? 0 : (this.restPosition[key]?.[axis] ?? 0);
      const alpha = 1 - Math.exp(-dt / 0.16);
      this._posCur[sk] += (base - this._posCur[sk]) * alpha;
      if (boneIsVRM) {
        if (!this._posePos[key]) this._posePos[key] = { x: 0, y: 0, z: 0 };
        this._posePos[key][axis] = this._posCur[sk];
      } else if (bone) {
        bone.position[axis] = this._posCur[sk];
      }
    }
  }

  _commitVrmPose() {
    if (!this.vrm?.humanoid) return;
    const pose = {};
    const euler = new THREE.Euler(0, 0, 0, "XYZ");
    const quat  = new THREE.Quaternion();

    for (const [key, boneName] of Object.entries(BONE_NAME_MAP)) {
      const rot = this._poseRot[key];
      const pos = this._posePos[key];
      if (!rot && !pos) continue;

      const t = {};
      if (rot) {
        euler.set(rot.x ?? 0, rot.y ?? 0, rot.z ?? 0, "XYZ");
        quat.setFromEuler(euler);
        t.rotation = [quat.x, quat.y, quat.z, quat.w];
      }
      if (pos) t.position = [pos.x ?? 0, pos.y ?? 0, pos.z ?? 0];
      pose[boneName] = t;
    }

    this.vrm.humanoid.setNormalizedPose(pose);
  }

  /* ─── Pose helpers ────────────────────────────────────────────── */
  _getBasePose() {
    return this.selectedCharacter === "girl" ? BASE_POSE.girl : BASE_POSE.default;
  }

  /** Get base pose value for a bone:axis, defaulting to 0 */
  _base(key, axis) {
    return this._getBasePose()[key]?.[axis] ?? 0;
  }

  /* ─── Main update ─────────────────────────────────────────────── */
  update(dt, state) {
    this.setPowered(state.powered);
    this.animTime += dt;
    this.landBounce = Math.max(0, this.landBounce - dt * 3.5);

    const planarSpeed = Math.sqrt(state.velocity.x * state.velocity.x + state.velocity.z * state.velocity.z);
    this.smoothedPlanarSpeed = THREE.MathUtils.lerp(this.smoothedPlanarSpeed, planarSpeed, 1 - Math.exp(-dt * 10));

    if (!state.grounded) this.state = state.velocity.y > 0.8 ? "jump" : "fall";
    else if (this.smoothedPlanarSpeed > 7.2) this.state = "run";
    else if (this.smoothedPlanarSpeed > 0.08) this.state = "walk";
    else this.state = "idle";
    if (state.hurtTimer > 0) this.state = "hurt";

    if (state.grounded && !this.prevGrounded) this.landBounce = 1;
    this.prevGrounded = state.grounded;

    if (this.mixer) {
      this.mixer.update(dt);
      this._playAction(this._resolveClipName(), 0.2);
    }

    if (!this.hasHumanoidRig) { this.vrm?.update?.(dt); return; }

    /* reset per-frame buffers */
    this._poseRot = {};
    this._posePos = {};
    this._fRot = {};
    this._fPos = {};

    /* ──────────────────────────────────────────────────────────────
     *  Set base pose for ALL bones first.
     *  Animations then OVERWRITE specific bone:axis targets.
     * ────────────────────────────────────────────────────────────── */
    const bp = this._getBasePose();
    for (const key of BONE_KEYS) {
      const axes = bp[key];
      if (axes) {
        for (const [axis, val] of Object.entries(axes)) {
          this._setBone(key, axis, val, 0.08);
        }
      }
    }
    this._setPos("hips", "y", 0, 0.1);

    /* ── State animation (overwrites base pose on touched axes) ── */
    if (this.state === "walk" || this.state === "run") {
      const run = this.state === "run";
      const freq = run ? 1.6 : 1.1; // Frequency in Hz
      const cycleTime = this.animTime * freq;
      
      const leftPhase = cycleTime % 1;
      const rightPhase = (cycleTime + 0.5) % 1;
      
      const leftGait = evaluateGait(run ? "run" : "normal", leftPhase);
      const rightGait = evaluateGait(run ? "run" : "normal", rightPhase);
      
      const speedFactor = THREE.MathUtils.clamp(this.smoothedPlanarSpeed / (run ? 11 : 5.5), 0.5, 1.35);
      const intensity = run ? 1.15 : 0.95;

      /* Lower Body: High-fidelity gait lookup */
      // VRM: -X is flexion/forward
      this._setBone("leftUpperLeg",  "x", this._base("leftUpperLeg","x") - leftGait.hip * intensity, 0.05);
      this._setBone("rightUpperLeg", "x", this._base("rightUpperLeg","x") - rightGait.hip * intensity, 0.05);
      
      // Knee: -X is flexion/back
      this._setBone("leftLowerLeg",  "x", this._base("leftLowerLeg","x") - leftGait.knee * intensity, 0.05);
      this._setBone("rightLowerLeg", "x", this._base("rightLowerLeg","x") - rightGait.knee * intensity, 0.05);
      
      this._setBone("leftFoot",  "x", this._base("leftFoot","x") + leftGait.ankle * intensity, 0.05);
      this._setBone("rightFoot", "x", this._base("rightFoot","x") + rightGait.ankle * intensity, 0.05);

      /* Upper Body: Procedural secondary motion sync'd to phases */
      const bounceFreq = freq * 2;
      const bounceTime = this.animTime * bounceFreq;
      const bounce = Math.abs(Math.sin(bounceTime * Math.PI));
      const sway = Math.sin(cycleTime * Math.PI * 2);
      const tilt = Math.cos(cycleTime * Math.PI * 2);

      // Pelvis Mechanics
      this._setBone("hips", "z", this._base("hips","z") + tilt * (run ? 0.12 : 0.07), 0.08); // Roll
      this._setBone("hips", "y", this._base("hips","y") - sway * (run ? 0.15 : 0.1), 0.08);  // Yaw
      this._setPos("hips", "y", (run ? 0.06 : 0.04) - bounce * (run ? 0.14 : 0.08), 0.08);   // Vertical Bob
      
      // Torso Counter-rotation (3D)
      this._setBone("spine", "y", this._base("spine","y") + sway * 0.12, 0.08);
      this._setBone("chest", "y", this._base("chest","y") + sway * 0.08, 0.08);
      this._setBone("chest", "z", this._base("chest","z") - tilt * 0.06, 0.1);
      
      // Arms: Out of phase swing with lag
      const armSwing = sway * (run ? 1.1 : 0.75);
      const shoulderShrug = bounce * 0.05;
      this._setBone("leftUpperArm",  "x", this._base("leftUpperArm","x") + armSwing, 0.06);
      this._setBone("rightUpperArm", "x", this._base("rightUpperArm","x") - armSwing, 0.06);
      this._setBone("leftUpperArm",  "z", this._base("leftUpperArm","z") + shoulderShrug, 0.1);
      this._setBone("rightUpperArm", "z", this._base("rightUpperArm","z") - shoulderShrug, 0.1);
      
      const armLag = Math.sin((cycleTime - 0.08) * Math.PI * 2);
      this._setBone("leftLowerArm",  "x", this._base("leftLowerArm","x") - Math.max(0, armLag) * (run ? 0.7 : 0.3), 0.09);
      this._setBone("rightLowerArm", "x", this._base("rightLowerArm","x") - Math.max(0, -armLag) * (run ? 0.7 : 0.3), 0.09);

      // Global Dynamic Lean
      const speedLean = THREE.MathUtils.clamp(this.smoothedPlanarSpeed * 0.02, 0, 0.28);
      this._setBone("spine", "x", this._base("spine","x") - speedLean, 0.1);
      this._setBone("neck", "x", this._base("neck","x") + speedLean * 0.3, 0.15);

    } else if (this.state === "jump" || this.state === "fall") {
      const rising = state.velocity.y > 0;
      const lift = THREE.MathUtils.clamp(Math.abs(state.velocity.y) / 12, 0, 1);

      /* Legs: -X = tuck forward when rising, slight back when falling */
      this._setBone("leftUpperLeg",  "x", rising ? 0.4 : -0.2, 0.065);
      this._setBone("rightUpperLeg", "x", rising ? 0.4 : -0.2, 0.065);
      this._setBone("leftLowerLeg",  "x", rising ? -0.3 : -0.6, 0.06);
      this._setBone("rightLowerLeg", "x", rising ? -0.3 : -0.6, 0.06);
      this._setBone("leftFoot",  "x", rising ? -0.08 : 0.18, 0.06);
      this._setBone("rightFoot", "x", rising ? -0.08 : 0.18, 0.06);

      /* Arms: raise up when rising, spread when falling */
      this._setBone("leftUpperArm",  "x", this._base("leftUpperArm","x") + (rising ? 0.5 : -0.35), 0.06);
      this._setBone("rightUpperArm", "x", this._base("rightUpperArm","x") + (rising ? 0.5 : -0.35), 0.06);
      this._setBone("leftLowerArm",  "x", this._base("leftLowerArm","x") + (rising ? 0.2 : -0.15), 0.06);
      this._setBone("rightLowerArm", "x", this._base("rightLowerArm","x") + (rising ? 0.2 : -0.15), 0.06);
      this._setBone("leftHand",  "z", this._base("leftHand","z") + lift * 0.06, 0.08);
      this._setBone("rightHand", "z", this._base("rightHand","z") - lift * 0.06, 0.08);
      this._setBone("spine", "x", this._base("spine","x") + (rising ? -0.1 : 0.08), 0.08);
      this._setBone("chest", "x", this._base("chest","x") + (rising ? -0.06 : 0.04), 0.08);
      this._setPos("hips", "y", rising ? -0.03 : -0.06, 0.08);

    } else {
      /* Idle with high-fidelity breathing and weight shifts */
      const slowCycle = this.animTime * 0.82;
      const breathe = Math.sin(this.animTime * 1.5) * 0.022;
      const shift = Math.sin(slowCycle) * 0.015;
      
      this._setBone("spine", "x", this._base("spine","x") - breathe, 0.2);
      this._setBone("chest", "x", this._base("chest","x") - breathe * 0.7, 0.2);
      this._setBone("hips", "z", this._base("hips","z") + shift * 0.5, 0.22);
      this._setBone("hips", "y", this._base("hips","y") + Math.cos(slowCycle * 0.5) * 0.01, 0.22);
      
      this._setBone("neck", "y", this._base("neck","y") + Math.sin(slowCycle * 1.2) * 0.012, 0.24);
      this._setBone("head", "y", this._base("head","y") + Math.sin(slowCycle * 0.9) * 0.02, 0.25);
      
      // Gentle hand swaying
      const handSway = Math.sin(this.animTime * 1.4) * 0.03;
      this._setBone("leftHand",  "x", this._base("leftHand","x") - handSway, 0.22);
      this._setBone("rightHand", "x", this._base("rightHand","x") + handSway, 0.22);
      this._setPos("hips", "y", breathe * 0.15, 0.2);
    }

    /* Landing bounce: legs compress (-X lower leg = knee bend) */
    if (this.landBounce > 0) {
      const bounce = Math.sin((1 - this.landBounce) * Math.PI) * 0.28 * this.landBounce;
      this._setBone("leftUpperLeg",  "x", -0.1 - bounce * 0.18, 0.045);
      this._setBone("rightUpperLeg", "x", -0.1 - bounce * 0.18, 0.045);
      this._setBone("leftLowerLeg",  "x", -0.18 - bounce * 0.3, 0.045);
      this._setBone("rightLowerLeg", "x", -0.18 - bounce * 0.3, 0.045);
      this._setBone("spine", "x", this._base("spine","x") + bounce * 0.1, 0.05);
      this._setPos("hips", "y", -0.08 * this.landBounce, 0.045);
    }

    /* Basic attack: slash motion */
    if (state.basicAttackTime > 0) {
      const attack = 1 - state.basicAttackTime / 0.5;
      const slash = Math.sin(attack * Math.PI);
      this._setBone("spine", "y", slash * 0.2, 0.04);
      this._setBone("chest", "y", slash * 0.3, 0.04);
      this._setBone("rightUpperArm", "x", 1.0 - slash * 0.4, 0.035);
      this._setBone("rightUpperArm", "z", -0.35, 0.04);
      this._setBone("rightLowerArm", "x", 0.5 - slash * 0.3, 0.035);
      this._setBone("rightHand", "z", -0.5 + slash * 0.2, 0.035);
      this._setBone("leftUpperArm",  "x", this._base("leftUpperArm","x") - 0.18 + slash * 0.15, 0.05);
      this._setBone("leftLowerArm",  "x", this._base("leftLowerArm","x") - 0.18, 0.06);
    }

    /* Dash: lean forward */
    if (state.dashActive > 0) {
      this._setBone("spine", "x", this._base("spine","x") - 0.3, 0.04);
      this._setBone("chest", "x", this._base("chest","x") - 0.14, 0.04);
      this._setBone("leftUpperArm",  "x", this._base("leftUpperArm","x") + 0.5, 0.04);
      this._setBone("rightUpperArm", "x", this._base("rightUpperArm","x") + 0.5, 0.04);
      this._setBone("leftLowerArm",  "x", this._base("leftLowerArm","x") - 0.2, 0.04);
      this._setBone("rightLowerArm", "x", this._base("rightLowerArm","x") - 0.2, 0.04);
      this._setBone("leftUpperLeg",  "x", 0.2, 0.045);
      this._setBone("rightUpperLeg", "x", 0.2, 0.045);
      this._setBone("leftFoot",  "x", -0.08, 0.045);
      this._setBone("rightFoot", "x", -0.08, 0.045);
    }

    /* Spin attack: Torso-driven whirlpool motion */
    if (state.spinActive > 0) {
      const sp = Math.sin(this.animTime * 28);
      this._setBone("spine", "y", sp * 0.45, 0.04);
      this._setBone("chest", "y", sp * 0.65, 0.04);
      this._setBone("leftUpperArm",  "z", 0.6 + sp * 0.2, 0.04);
      this._setBone("rightUpperArm", "z", -0.6 - sp * 0.2, 0.04);
      this._setBone("leftLowerArm",  "x", -0.2, 0.045);
      this._setBone("rightLowerArm", "x", -0.2, 0.045);
      this._setBone("leftHand",  "y",  sp * 0.4, 0.04);
      this._setBone("rightHand", "y", -sp * 0.4, 0.04);
      this._setPos("hips", "y", -0.05 + Math.abs(sp) * 0.03, 0.05);
    }

    /* Shield: arms guard position */
    if (state.shieldActive) {
      this._setBone("leftUpperArm",  "x", this._base("leftUpperArm","x") - 0.06, 0.05);
      this._setBone("rightUpperArm", "x", this._base("rightUpperArm","x") - 0.06, 0.05);
      this._setBone("leftUpperArm",  "z", this._base("leftUpperArm","z") - 0.35, 0.05);
      this._setBone("rightUpperArm", "z", this._base("rightUpperArm","z") + 0.35, 0.05);
      this._setBone("leftLowerArm",  "x", this._base("leftLowerArm","x") + 0.45, 0.05);
      this._setBone("rightLowerArm", "x", this._base("rightLowerArm","x") + 0.45, 0.05);
      this._setBone("leftHand",  "z", this._base("leftHand","z") + 0.08, 0.05);
      this._setBone("rightHand", "z", this._base("rightHand","z") - 0.08, 0.05);
      this._setBone("chest", "x", this._base("chest","x") - 0.03, 0.06);
    }

    /* Slam (R): Dramatic weight-driven atmospheric dive */
    if (state.slamming) {
      const descending = state.velocity.y < 0;
      this._setBone("spine", "x", this._base("spine","x") + (descending ? 0.45 : 0.25), 0.05);
      this._setBone("chest", "x", this._base("chest","x") + (descending ? 0.25 : 0.1), 0.05);
      this._setBone("leftUpperArm",  "x", this._base("leftUpperArm","x") + 1.2, 0.04);
      this._setBone("rightUpperArm", "x", this._base("rightUpperArm","x") + 1.2, 0.04);
      this._setBone("leftLowerArm",  "x", 0.6, 0.045);
      this._setBone("rightLowerArm", "x", 0.6, 0.045);
      this._setBone("leftUpperLeg",  "x", descending ? -0.4 : 0.5, 0.05);
      this._setBone("rightUpperLeg", "x", descending ? -0.4 : 0.5, 0.05);
      this._setBone("leftLowerLeg",  "x", -0.45, 0.05);
      this._setBone("rightLowerLeg", "x", -0.45, 0.05);
      this._setPos("hips", "y", -0.1, 0.05);
    }

    /* Slam recovery: Heavy weight absorption and slow rise */
    if (state.slamRecovering) {
      this._setBone("spine", "x", this._base("spine","x") + 0.12, 0.04);
      this._setBone("chest", "x", this._base("chest","x") + 0.05, 0.04);
      this._setBone("leftUpperLeg",  "x", -0.52, 0.045);
      this._setBone("rightUpperLeg", "x", -0.52, 0.045);
      this._setBone("leftLowerLeg",  "x", -0.65, 0.045);
      this._setBone("rightLowerLeg", "x", -0.65, 0.045);
      this._setBone("leftFoot", "x", 0.35, 0.05);
      this._setBone("rightFoot", "x", 0.35, 0.05);
      this._setPos("hips", "y", -0.28, 0.04);
    }

    /* ── Flush ONE lerp per bone:axis, then commit ── */
    this._updateExpressions(state);
    this._flushSprings(dt);
    this._commitVrmPose();
    this.vrm?.update?.(dt);
  }

  /* ─── Expressions ─────────────────────────────────────────────── */
  _updateExpressions(state) {
    const expr = this.vrm?.expressionManager;
    if (!expr) return;

    const blink = Math.max(0, Math.sin(this.animTime * 1.65 + 0.7) * 3 - 2.35);
    expr.setValue?.("blink",      blink);
    expr.setValue?.("blinkLeft",  blink);
    expr.setValue?.("blinkRight", blink);

    const aw = state.basicAttackTime > 0 ? Math.sin((1 - state.basicAttackTime / 0.5) * Math.PI) * 0.7 : 0;
    const sw = state.slamming || state.spinActive > 0 ? 0.45 : aw * 0.35;
    expr.setValue?.("aa",    sw);
    expr.setValue?.("oh",    sw * 0.6);
    expr.setValue?.("happy", this.state === "run" ? 0.18 : 0);
    expr.update?.();
  }

  /* ─── Clip helpers ────────────────────────────────────────────── */
  _resolveClipName() {
    if (this.state === "run")  return this._pickClip("run", "running", "walk", "idle");
    if (this.state === "walk") return this._pickClip("walk", "walking", "run", "idle");
    if (this.state === "jump" || this.state === "fall") return this._pickClip("jump", "fall", "idle");
    if (this.state === "hurt") return this._pickClip("hit", "hurt", "idle");
    return this._pickClip("idle");
  }

  _pickClip(...names) {
    for (const [n] of this.actions.entries()) {
      if (names.some(k => n.includes(k))) return n;
    }
    return null;
  }

  _playAction(name, duration = 0.22) {
    if (!name) return;
    const next = this.actions.get(name);
    if (!next || this.activeAction === next) return;
    next.reset().fadeIn(duration).play();
    if (this.activeAction) this.activeAction.fadeOut(duration);
    this.activeAction = next;
  }
}
