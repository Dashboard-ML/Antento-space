import * as THREE from 'three';

export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.lights = {};
    this.init();
  }

  init() {
    this.setEnhancedLighting();
  }

  setEnhancedLighting() {
    this.clearLights();

    this.lights.ambient = new THREE.AmbientLight(0xffffff, 1.6);
    this.scene.add(this.lights.ambient);

    this.lights.mainLight = new THREE.DirectionalLight(0xfffbec, 1.5);
    this.lights.mainLight.position.set(5, 12, 5);
    this.lights.mainLight.castShadow = true;
    this.lights.mainLight.shadow.mapSize.width = 2048;
    this.lights.mainLight.shadow.mapSize.height = 2048;
    this.lights.mainLight.shadow.camera.near = 0.5;
    this.lights.mainLight.shadow.camera.far = 30;
    this.lights.mainLight.shadow.camera.left = -15;
    this.lights.mainLight.shadow.camera.right = 15;
    this.lights.mainLight.shadow.camera.top = 15;
    this.lights.mainLight.shadow.camera.bottom = -15;
    this.lights.mainLight.shadow.bias = -0.001;
    this.scene.add(this.lights.mainLight);

    this.lights.fillLight = new THREE.DirectionalLight(0x7c9ed6, 1);
    this.lights.fillLight.position.set(-8, 5, 5);
    this.lights.fillLight.castShadow = false;
    this.scene.add(this.lights.fillLight);

    const cornerLights = [
      new THREE.PointLight(0xfff4d8, 0.5, 12),
      new THREE.PointLight(0xd8f4ff, 0.5, 12),
      new THREE.PointLight(0xfff4d8, 0.5, 12),
      new THREE.PointLight(0xd8f4ff, 0.5, 12)
    ];

    cornerLights[0].position.set(6, 3.5, 6);
    cornerLights[1].position.set(-6, 3.5, 6);
    cornerLights[2].position.set(6, 3.5, -6);
    cornerLights[3].position.set(-6, 3.5, -6);

    cornerLights.forEach(light => {
      light.castShadow = false;
      this.scene.add(light);
    });
    this.lights.corners = cornerLights;

    this.lights.hemisphere = new THREE.HemisphereLight(
      0x88c0e0,
      0x3c2819,
      0.5
    );
    this.scene.add(this.lights.hemisphere);
  }

  setSkyboxLighting() {
    this.setEnhancedLighting();
  }

  // Se conserva por compatibilidad, pero el escenario ya no utiliza HDRI.
  addEnvironmentLighting() {}

  updateLighting(params) {
    if (params.ambient && this.lights.ambient) {
      this.lights.ambient.intensity = params.ambient.intensity;
      if (params.ambient.color) {
        this.lights.ambient.color.setHex(params.ambient.color);
      }
    }
  }

  clearLights() {
    const removeFromScene = (entry) => {
      if (Array.isArray(entry)) {
        entry.forEach(removeFromScene);
        return;
      }

      if (entry?.parent) {
        entry.parent.remove(entry);
      }
    };

    Object.values(this.lights).forEach(removeFromScene);
    this.lights = {};
  }
}
