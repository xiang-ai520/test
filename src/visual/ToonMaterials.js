import * as THREE from "three";

let cachedGradient = null;

function createGradientMap() {
  if (cachedGradient) return cachedGradient;
  const data = new Uint8Array([8, 38, 72, 128, 192, 240, 255]);
  const texture = new THREE.DataTexture(data, 7, 1, THREE.RedFormat);
  texture.needsUpdate = true;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  cachedGradient = texture;
  return texture;
}

export function createPatternTexture(kind, accent = "#ffffff", repeatX = 1, repeatY = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (kind === "grass") {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#7ad56b");
    gradient.addColorStop(0.45, "#5fb44f");
    gradient.addColorStop(0.75, "#4a8d3e");
    gradient.addColorStop(1, "#3a7030");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // Natural grass patches
    for (let i = 0; i < 30; i++) {
      const x = (i * 43) % 256;
      const y = (i * 67) % 256;
      const colors = ["rgba(208, 248, 166, 0.22)", "rgba(54, 102, 43, 0.14)", "rgba(117, 197, 98, 0.18)"];
      ctx.fillStyle = colors[i % 3];
      ctx.beginPath();
      ctx.ellipse(x, y, 20 + (i % 5) * 4, 12 + (i % 4), (i % 5) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grass blades
    for (let i = 0; i < 80; i++) {
      const x = (i * 13) % 256;
      const baseY = 256 - ((i * 9) % 30);
      const height = 16 + (i % 6) * 6;
      const sway = (i % 4) - 1.5;
      ctx.strokeStyle = i % 4 === 0 ? "rgba(240, 255, 221, 0.28)" : "rgba(42, 89, 34, 0.2)";
      ctx.lineWidth = i % 5 === 0 ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + sway, baseY - height * 0.55, x + sway * 2.5, baseY - height);
      ctx.stroke();
    }

    // Wildflower dots
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = accent;
    for (let i = 0; i < 14; i++) {
      const x = 8 + ((i * 37) % 240);
      const y = 12 + ((i * 23) % 200);
      ctx.beginPath();
      ctx.arc(x, y, i % 2 === 0 ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (kind === "soil") {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#a07050");
    gradient.addColorStop(1, "#7a5030");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 20) {
      ctx.fillStyle = y % 40 === 0 ? "#8f5e39" : "#a9754c";
      ctx.fillRect(0, y, 256, 12);
    }
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#c99563" : "#7b4d2b";
      ctx.beginPath();
      ctx.arc((i * 23) % 256, (i * 41) % 256, 3 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "brick") {
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(82, 47, 26, 0.28)";
    ctx.lineWidth = 6;
    for (let y = 0; y <= 256; y += 40) ctx.strokeRect(0, y - 3, 256, 6);
    for (let row = 0; row < 7; row++) {
      const offset = row % 2 === 0 ? 0 : 20;
      for (let x = -offset; x < 256; x += 40) ctx.strokeRect(x, row * 40, 5, 40);
    }
    // Subtle mortar wear
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      ctx.fillRect((i * 47) % 256, (i * 31) % 256, 8 + (i % 5) * 3, 4);
    }
  } else if (kind === "wood") {
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(86,48,24,0.24)";
      ctx.fillRect(i * 42, 0, 18, 256);
    }
    ctx.strokeStyle = "rgba(84, 51, 22, 0.25)";
    ctx.lineWidth = 3;
    for (let y = 20; y < 256; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(56, y - 10, 156, y + 10, 256, y - 6);
      ctx.stroke();
    }
  } else if (kind === "stone") {
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(51, 67, 88, 0.18)";
    ctx.lineWidth = 4;
    for (let y = 0; y < 256; y += 30) {
      for (let x = (y / 30) % 2 === 0 ? 0 : 18; x < 256; x += 36) {
        ctx.strokeRect(x, y, 30, 24);
      }
    }
    // Add wear spots for realism
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = "rgba(0,0,0,0.03)";
      ctx.beginPath();
      ctx.arc((i * 53) % 256, (i * 37) % 256, 6 + (i % 4) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeToonMaterial({
  color,
  emissive = "#000000",
  map = null,
  transparent = false,
  opacity = 1
}) {
  return new THREE.MeshToonMaterial({
    color,
    emissive,
    map,
    gradientMap: createGradientMap(),
    transparent,
    opacity
  });
}

/** Create a high-quality PBR material for AAA scene elements */
export function makePBRMaterial({
  color = "#ffffff",
  emissive = "#000000",
  emissiveIntensity = 0,
  map = null,
  normalMap = null,
  normalScale = 1.0,
  roughness = 0.8,
  metalness = 0.05,
  transparent = false,
  opacity = 1,
  side = THREE.FrontSide
}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    map,
    normalMap,
    roughness,
    metalness,
    transparent,
    opacity,
    side
  });
  if (normalMap && normalScale !== 1.0) {
    mat.normalScale = new THREE.Vector2(normalScale, normalScale);
  }
  return mat;
}
