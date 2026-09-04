import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export function createTrimesh(mesh) {
  const geometry = mesh.geometry;
  if (!geometry.attributes.position) return null;

  const position = geometry.attributes.position.array;
  const index = geometry.index ? geometry.index.array : [...Array(position.length / 3).keys()];

  return new CANNON.Trimesh(position, index);
}

export function agregarColisionesDesdeEscenario(escenarioModel, world, groundMaterial) {
  escenarioModel.traverse((child) => {
    if (child.isMesh && child.geometry && child.name.toLowerCase().includes('collision')) {
      const shape = createTrimesh(child);
      if (shape) {
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.copy(child.getWorldPosition(new THREE.Vector3()));
        body.quaternion.copy(child.getWorldQuaternion(new THREE.Quaternion()));
        body.material = groundMaterial;
        world.addBody(body);
        child.visible = false; 
      }
    }
  });
}
