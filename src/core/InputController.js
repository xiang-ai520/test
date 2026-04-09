import * as THREE from "three";

export class InputController {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Map();
    this.lookYaw = Math.PI * 0.5;
    this.lookPitch = 0.22;
    this.jumpQueued = false;
    this.actionQueued = false;
    this.basicAttackQueued = false;
    this.rightClickQueued = false;
    this.skillQueued1 = false;
    this.skillQueued2 = false;
    this.skillQueued3 = false;
    this.skillQueued4 = false;

    this.mouseNDC = new THREE.Vector2(0, 0);
    this.rightClickWorldPos = null;

    this._draggingCamera = false;
    this._lastMouseX = 0;
    this._lastMouseY = 0;
    this._hasMousePos = false;

    this._bind();
  }

  _bind() {
    window.addEventListener("keydown", (event) => {
      this.keys.set(event.code, true);
      if (!event.repeat && (event.code === "Space" || event.code === "ArrowUp")) {
        this.jumpQueued = true;
        event.preventDefault();
      }
      if (!event.repeat && (event.code === "Enter" || event.code === "KeyF")) {
        this.actionQueued = true;
      }
      if (!event.repeat && event.code === "KeyQ") this.skillQueued1 = true;
      if (!event.repeat && event.code === "KeyW") this.skillQueued2 = true;
      if (!event.repeat && event.code === "KeyE") this.skillQueued3 = true;
      if (!event.repeat && event.code === "KeyR") this.skillQueued4 = true;
    });

    window.addEventListener("keyup", (event) => {
      this.keys.set(event.code, false);
    });

    this.domElement.addEventListener("mousemove", (event) => {
      const rect = this.domElement.getBoundingClientRect();
      this.mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (!this._hasMousePos) {
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;
        this._hasMousePos = true;
        return;
      }

      const dx = event.clientX - this._lastMouseX;
      const dy = event.clientY - this._lastMouseY;
      this.lookYaw -= dx * 0.003;
      this.lookPitch = THREE.MathUtils.clamp(this.lookPitch - dy * 0.002, -0.2, 0.72);
      this._lastMouseX = event.clientX;
      this._lastMouseY = event.clientY;
    });

    this.domElement.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        this.basicAttackQueued = true;
      } else if (event.button === 2) {
        this.rightClickQueued = true;
      }
    });

    this.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

    this.domElement.addEventListener("wheel", (event) => {
      this.lookPitch = THREE.MathUtils.clamp(this.lookPitch + event.deltaY * 0.001, -0.15, 0.62);
    }, { passive: true });
  }

  isPressed(code) {
    return Boolean(this.keys.get(code));
  }

  consumeRightClick() {
    if (!this.rightClickQueued) return false;
    this.rightClickQueued = false;
    return true;
  }

  consumeBasicAttack() {
    if (!this.basicAttackQueued) return false;
    this.basicAttackQueued = false;
    return true;
  }

  consumeJump() {
    if (!this.jumpQueued) return false;
    this.jumpQueued = false;
    return true;
  }

  consumeAction() {
    if (!this.actionQueued) return false;
    this.actionQueued = false;
    return true;
  }

  consumeSkill1() {
    if (!this.skillQueued1) return false;
    this.skillQueued1 = false;
    return true;
  }

  consumeSkill2() {
    if (!this.skillQueued2) return false;
    this.skillQueued2 = false;
    return true;
  }

  consumeSkill3() {
    if (!this.skillQueued3) return false;
    this.skillQueued3 = false;
    return true;
  }

  consumeSkill4() {
    if (!this.skillQueued4) return false;
    this.skillQueued4 = false;
    return true;
  }

  getMoveVector() {
    const x = (this.isPressed("KeyD") || this.isPressed("ArrowRight") ? 1 : 0)
      - (this.isPressed("KeyA") || this.isPressed("ArrowLeft") ? 1 : 0);
    const z = (this.isPressed("KeyS") || this.isPressed("ArrowDown") ? 1 : 0)
      - (this.isPressed("ArrowUp") ? 1 : 0);

    const vector = new THREE.Vector3(x, 0, z);
    if (vector.lengthSq() > 1) vector.normalize();
    return vector;
  }

  update(dt) {
    void dt;
  }
}
