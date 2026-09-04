// ========== FILTRO DE POSE 6DOF ==========
class Pose6DOFFilter {
  constructor() {
    // Configuración de filtros para posición (metros)
    this.positionFilter = {
      x: this.createDoubleExponentialFilter(0.05, 0.1),
      y: this.createDoubleExponentialFilter(0.05, 0.1),
      z: this.createDoubleExponentialFilter(0.05, 0.1)
    };
    
    // Configuración de filtros para rotación (radianes)
    this.rotationFilter = {
      x: this.createDoubleExponentialFilter(0.1, 0.2),
      y: this.createDoubleExponentialFilter(0.1, 0.2),
      z: this.createDoubleExponentialFilter(0.1, 0.2),
      w: this.createDoubleExponentialFilter(0.1, 0.2)
    };
    
    this.lastTimestamp = 0;
    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();
  }

  createDoubleExponentialFilter(smoothingFactor, correctionFactor) {
    return {
      smoothed: 0,
      trend: 0,
      update: function(value, deltaTime) {
        const prevSmoothed = this.smoothed;
        const prevTrend = this.trend;
        
        this.smoothed = smoothingFactor * value + 
                       (1 - smoothingFactor) * (prevSmoothed + prevTrend);
        
        this.trend = correctionFactor * (this.smoothed - prevSmoothed) + 
                    (1 - correctionFactor) * prevTrend;
        
        return this.smoothed;
      },
      reset: function(value) {
        this.smoothed = value;
        this.trend = 0;
      }
    };
  }

  update(rawPosition, rawQuaternion, timestamp) {
    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    
    // 1. Filtrado de posición con compensación de velocidad
    const filteredPosition = new THREE.Vector3(
      this.positionFilter.x.update(rawPosition.x, deltaTime),
      this.positionFilter.y.update(rawPosition.y, deltaTime),
      this.positionFilter.z.update(rawPosition.z, deltaTime)
    );

    // 2. Filtrado de rotación con normalización
    const filteredQuaternion = new THREE.Quaternion(
      this.rotationFilter.x.update(rawQuaternion.x, deltaTime),
      this.rotationFilter.y.update(rawQuaternion.y, deltaTime),
      this.rotationFilter.z.update(rawQuaternion.z, deltaTime),
      this.rotationFilter.w.update(rawQuaternion.w, deltaTime)
    ).normalize();

    // 3. Compensación de movimiento basada en velocidad
    if (deltaTime > 0 && deltaTime < 0.2) {
      const newVelocity = filteredPosition.clone().sub(this.lastPosition).divideScalar(deltaTime);
      this.velocity.lerp(newVelocity, 0.3);
      
      const deltaQuat = filteredQuaternion.clone().multiply(this.lastQuaternion.clone().invert());
      const angle = 2 * Math.acos(Math.min(Math.abs(deltaQuat.w), 1));
      if (angle > 0.001) {
        const axisNorm = Math.sqrt(deltaQuat.x**2 + deltaQuat.y**2 + deltaQuat.z**2);
        const axis = new THREE.Vector3(
          deltaQuat.x / axisNorm,
          deltaQuat.y / axisNorm,
          deltaQuat.z / axisNorm
        );
        const newAngVel = axis.multiplyScalar(angle / deltaTime);
        this.angularVelocity.lerp(newAngVel, 0.3);
      }
    }

    this.lastPosition = filteredPosition.clone();
    this.lastQuaternion = filteredQuaternion.clone();

    return {
      position: filteredPosition,
      quaternion: filteredQuaternion,
      velocity: this.velocity.clone(),
      angularVelocity: this.angularVelocity.clone()
    };
  }

  reset(position, quaternion) {
    this.lastPosition = position.clone();
    this.lastQuaternion = quaternion.clone();
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    
    this.positionFilter.x.reset(position.x);
    this.positionFilter.y.reset(position.y);
    this.positionFilter.z.reset(position.z);
    
    this.rotationFilter.x.reset(quaternion.x);
    this.rotationFilter.y.reset(quaternion.y);
    this.rotationFilter.z.reset(quaternion.z);
    this.rotationFilter.w.reset(quaternion.w);
  }
}

// ========== SISTEMA AR ULTRA-ESTABLE ==========
class UltraStableARTracker {
  constructor(modelEl, markerEl) {
    this.model = modelEl;
    this.marker = markerEl;
    this.poseFilter = new Pose6DOFFilter();
    this.isTracking = false;
    this.poseHistory = [];
    this.maxHistory = 5;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.marker.addEventListener('targetFound', () => {
      this.isTracking = true;
      const markerObj = this.marker.object3D;
      if (markerObj) {
        this.poseFilter.reset(markerObj.position, markerObj.quaternion);
      }
      this.poseHistory = [];
    });
    
    this.marker.addEventListener('targetLost', () => {
      this.isTracking = false;
    });
  }

  update() {
    if (!this.isTracking) return;

    const markerObj = this.marker.object3D;
    const modelObj = this.model.object3D;
    if (!markerObj || !modelObj) return;
    const filteredPose = this.poseFilter.update(
      markerObj.position,
      markerObj.quaternion,
      performance.now()
    );
    this.poseHistory.push(filteredPose.position.clone());
    if (this.poseHistory.length > this.maxHistory) {
      this.poseHistory.shift();
    }
    
    const avgPosition = new THREE.Vector3();
    this.poseHistory.forEach(pos => avgPosition.add(pos));
    avgPosition.divideScalar(this.poseHistory.length);
    modelObj.position.lerp(avgPosition, 0.5);
    const targetQuat = filteredPose.quaternion.clone();
    if (this.poseHistory.length > 2) {
      const driftCorrection = this.calculateDriftCorrection(modelObj.quaternion, targetQuat);
      targetQuat.multiply(driftCorrection);
    }
    modelObj.quaternion.slerp(targetQuat, 0.4);
  }

  calculateDriftCorrection(currentQuat, targetQuat) {
    const delta = targetQuat.clone().multiply(currentQuat.clone().invert());
    const angle = delta.angleTo(new THREE.Quaternion());
    
    if (angle < 0.05) {
      const correctionFactor = Math.min(angle * 2, 0.1);
      return new THREE.Quaternion().slerp(delta, correctionFactor);
    }
    return new THREE.Quaternion(); 
  }
}
// ========== INICIALIZACIÓN ==========
document.addEventListener("DOMContentLoaded", () => {
  const scene = document.querySelector("a-scene");
  
  scene.addEventListener("loaded", () => {
    scene.setAttribute("mindar-image", {
      imageTargetSrc: "mind/targets.mind",
      autoStart: true,
      maxTrack: 5,  
      filterMinCF: 0.003,
      filterBeta: 0.002,
      uiLoading: false,
      uiScanning: false,
      uiError: false
    });
  });
  const createTracker = (modelId, markerId) => {
    const model = document.getElementById(modelId);
    const marker = document.getElementById(markerId);
    
    if (!model || !marker) return null;
    
    const tracker = new UltraStableARTracker(model, marker);
    model.addEventListener("model-loaded", () => {
      const mesh = model.getObject3D("mesh");
      if (mesh) {
        mesh.traverse((node) => {
          if (node.isMesh) {
            node.material.transparent = true;
            node.material.opacity = 0;
          }
        });
      }
    });
    marker.addEventListener("targetFound", () => {
      model.setAttribute("visible", true);
      animateOpacity(model, 1, 300);
    });

    marker.addEventListener("targetLost", () => {
      animateOpacity(model, 0, 300, () => {
        model.setAttribute("visible", false);
      });
    });
    
    return tracker;
  };
  const modelTrackers = [
    createTracker('model-drone', 'marker-drone'),
    createTracker('model-1', 'marker-1'),
    createTracker('model-2', 'marker-2'),
    createTracker('model-3', 'marker-3'),
    createTracker('model-4', 'marker-4')
  ].filter(tracker => tracker !== null);
  function animateOpacity(model, target, duration, callback) {
    const mesh = model.getObject3D("mesh");
    if (!mesh) return;

    let completed = 0;
    const nodes = [];
    mesh.traverse((node) => node.isMesh && nodes.push(node));
    
    nodes.forEach((node) => {
      const start = node.material.opacity;
      const delta = target - start;
      const startTime = performance.now();
      
      const update = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        node.material.opacity = start + delta * progress;
        
        if (progress < 1) {
          requestAnimationFrame(update);
        } else if (++completed === nodes.length && callback) {
          callback();
        }
      };
      update();
    });
  }
  const targetFPS = 45;
  const interval = 1000 / targetFPS;
  let lastTime = 0;
  
  const tick = (time) => {
    if (time - lastTime >= interval) {
      modelTrackers.forEach(tracker => tracker.update());
      lastTime = time - ((time - lastTime) % interval);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});