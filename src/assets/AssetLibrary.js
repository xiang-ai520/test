import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

function configureTexture(texture, renderer, repeatX = 1, repeatY = 1, isColor = true) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 1;
  return texture;
}

function configureSceneShadows(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material) child.frustumCulled = false;
  });
}

function snapshotTransforms(root) {
  const snapshot = [];
  root.traverse((node) => {
    snapshot.push({
      node,
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
      scale: node.scale.clone()
    });
  });
  return snapshot;
}

function restoreTransforms(snapshot) {
  snapshot?.forEach((record) => {
    if (!record?.node) return;
    record.node.position.copy(record.position);
    record.node.quaternion.copy(record.quaternion);
    record.node.scale.copy(record.scale);
    record.node.updateMatrix();
    record.node.updateMatrixWorld(true);
  });
}

export class AssetLibrary {
  constructor(renderer) {
    this.renderer = renderer;
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
    this.textureLoader = new THREE.TextureLoader();
    this.models = new Map();
    this.textures = new Map();
  }

  async load() {
    const modelEntries = await Promise.all([
      this._loadModel("player_girl", "/src/assets/downloads/vivi.vrm"),
      this._loadModel("player_male", "/src/assets/downloads/fem_vroid.vrm"),
      this._loadModel("tree", null)
    ]);

    modelEntries.forEach(([key, value]) => {
      if (value) this.models.set(key, value);
    });

    if (this.models.get("player_girl")) {
      this.models.set("kenneyCharacter", this.models.get("player_girl"));
    }
    
    if (this.models.get("player_male")) {
       this.models.set("player", this.models.get("player_male"));
    } else if (this.models.get("player_girl")) {
       this.models.set("player", this.models.get("player_girl"));
    }

    const textures = await Promise.all([
      this._loadTexture("grass_hd", "/src/assets/downloads/grass_color.jpg", 30, 30, true),
      this._loadTexture("grass_nm", "/src/assets/downloads/grass_normal.jpg", 30, 30, false),
      this._loadTexture("water_nm", "/src/assets/downloads/waternormals.jpg", 15, 15, false)
    ]);

    textures.forEach(([key, value]) => {
      if (value) this.textures.set(key, value);
    });

    return this;
  }

  getTexture(name) {
    return this.textures.get(name) ?? null;
  }

  getModel(name) {
    return this.models.get(name) ?? null;
  }

  getTextureSet(name) {
    if (name === "grass") {
      const colorMap = this.textures.get("grass_hd");
      const normalMap = this.textures.get("grass_nm");
      if (!colorMap || !normalMap) return null;
      return {
        colorMap,
        normalMap,
        roughnessMap: colorMap
      };
    }
    return null;
  }

  instantiateCharacter(name) {
    const asset = this.models.get(name);
    if (!asset?.scene) return null;

    if (asset.vrm) {
      if (asset.scene.parent) asset.scene.parent.remove(asset.scene);
      restoreTransforms(asset.snapshot);
      asset.vrm.expressionManager?.resetValues?.();
      asset.scene.visible = true;
      asset.scene.position.set(0, 0, 0);
      asset.scene.rotation.set(0, 0, 0);
      asset.scene.updateMatrixWorld(true);
      configureSceneShadows(asset.scene);
      return {
        root: asset.scene,
        scene: asset.scene,
        vrm: asset.vrm,
        animations: asset.animations ?? [],
        isVRM: true
      };
    }

    const root = clone(asset.scene);
    configureSceneShadows(root);
    return {
      root,
      scene: root,
      vrm: null,
      animations: asset.animations ?? [],
      isVRM: false
    };
  }

  instantiateModel(name) {
    return this.instantiateCharacter(name)?.root ?? null;
  }

  getAnimations(name) {
    return this.models.get(name)?.animations ?? [];
  }

  async _loadModel(name, url) {
    if (!url) return [name, null];
    try {
      const gltf = await this.gltfLoader.loadAsync(url);
      const vrm = gltf.userData?.vrm ?? null;
      const scene = vrm?.scene ?? gltf.scene;

      if (vrm) {
        VRMUtils.rotateVRM0(vrm);
      }

      configureSceneShadows(scene);

      return [name, {
        ...gltf,
        scene,
        vrm,
        snapshot: snapshotTransforms(scene),
        isVRM: Boolean(vrm)
      }];
    } catch (error) {
      console.warn(`Failed to load model "${name}" from ${url}`, error);
      return [name, null];
    }
  }

  async _loadTexture(name, url, repeatX = 1, repeatY = 1, isColor = true) {
    try {
      const texture = await this.textureLoader.loadAsync(url);
      configureTexture(texture, this.renderer, repeatX, repeatY, isColor);
      return [name, texture];
    } catch {
      return [name, null];
    }
  }
}
