import * as THREE from 'three';

let mixer = null;
let actions = {};
let activeAction = null;


/**
 * Inicializa el AnimationMixer y configura las animaciones del modelo.
 * @param {THREE.Object3D} model - Modelo cargado.
 * @param {Array<THREE.AnimationClip>} animations - Animaciones GLTF.
 */
export function inicializarAnimaciones(model, animations) {
  mixer = new THREE.AnimationMixer(model);
  actions = {};

  animations.forEach((clip) => {
    actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
  });

  cambiarAnimacion('idle');
}

/**
 * Cambia la animación actual de forma suave.
 * @param {string} nombreAnimacion - Nombre de la animación (ej. 'run', 'idle').
 */
export function cambiarAnimacion(nombreAnimacion) {
  const nueva = actions[nombreAnimacion.toLowerCase()];
  if (nueva && nueva !== activeAction) {
    if (activeAction) {
      activeAction.fadeOut(0.2);
    }
    activeAction = nueva;
    activeAction.reset().fadeIn(0.2).play();
  }
}

/**
 * Actualiza el mixer.
 * @param {number} delta 
 */
export function actualizarAnimaciones(delta) {
  if (mixer) {
    mixer.update(delta);
  }
}

export function obtenerAcciones() {
  return actions;
}
