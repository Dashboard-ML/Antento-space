// jugadorFisica.js
import * as CANNON from 'cannon-es';

/**
 * Crea un cuerpo en forma de cápsula para el jugador.
 * @param {number} radius - Radio de las esferas.
 * @param {number} height - Altura del cilindro entre esferas.
 * @param {CANNON.Material} material - Material físico para el cuerpo.
 * @returns {CANNON.Body}
 */
export function createCapsule(radius, height, material) {
  const capsuleBody = new CANNON.Body({ mass: 1 });
  const sphere = new CANNON.Sphere(radius);
  const cylinder = new CANNON.Cylinder(radius, radius, height, 8);
  const q = new CANNON.Quaternion();
  q.setFromEuler(Math.PI / 2, 0, 0); // rotación horizontal del cilindro

  capsuleBody.addShape(cylinder, new CANNON.Vec3(0, 0, 0), q);
  capsuleBody.addShape(sphere, new CANNON.Vec3(0, height / 2, 0));
  capsuleBody.addShape(sphere, new CANNON.Vec3(0, -height / 2, 0));

  capsuleBody.material = material;
  capsuleBody.linearDamping = 0.9;
  capsuleBody.angularDamping = 1.0;

  return capsuleBody;
}
