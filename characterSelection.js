import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class CharacterSelection {
  constructor(onCharacterSelected) {
    this.onCharacterSelected = onCharacterSelected;
    this.selectedCharacter = null;
    this.selectionDiv = null;
    this.keyHandler = null;
    this.backgroundMusic = null;
    this.switchSound = null;
    this.models = {
      male: null,
      female: null
    };

    this.colorableParts = [
      'cabello', 'camisa', 'ojos', 
      'pantalon', 'piel', 'zapatos'
    ];
    
    this.currentColors = {
      cabello: '#5e2a00',
      camisa: '#1d3cee',
      ojos: '#000000',
      pantalon: '#2c3e50',
      piel: '#e99292',
      zapatos: '#1a1a1a'
    };
    
    this.colorPickerCallbacks = {};
  }

  initAudio() {
    this.backgroundMusic = new Audio('sounds/ambient-background-loop-234090.mp3');
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.2;

    this.switchSound = new Audio('sounds/punchy-taps-ui-6-183902.mp3');
    this.switchSound.volume = 0.4;

    this.backgroundMusic.play().catch(e => {
      console.log("Autoplay bloqueado:", e);
      document.addEventListener('click', () => {
        this.backgroundMusic.play();
      }, { once: true });
    });
  }

show() {
  this.initAudio();
  
  this.selectionDiv = document.createElement('div');
  this.selectionDiv.id = 'character-selection';
  this.selectionDiv.style.position = 'fixed';
  this.selectionDiv.style.inset = '0';
  this.selectionDiv.style.zIndex = '50';
  this.selectionDiv.style.display = 'flex';
  this.selectionDiv.style.flexDirection = 'column';
  this.selectionDiv.style.alignItems = 'center';
  this.selectionDiv.style.background = 'linear-gradient(-180deg, rgba(136, 210, 248, 1) 0%, rgba(0, 85, 140, 1) 100%)';
  this.selectionDiv.style.overflowY = 'auto';
  this.selectionDiv.style.padding = '1.5rem 1rem';
  
  // GUARDAR EL VALOR EN UNA VARIABLE PARA EVITAR ERRORES DE INTERPOLACIÓN
  const maleDisplayClass = this.selectedCharacter === 'male' ? 'opacity-100' : 'opacity-0 pointer-events-none';
  const femaleDisplayClass = this.selectedCharacter === 'female' ? 'opacity-100' : 'opacity-0 pointer-events-none';
  
  this.selectionDiv.innerHTML = `
    <div class="absolute inset-0 overflow-hidden">
      <div class="holographic-line" style="top: 15%; width: 100%; animation-delay: 0s;"></div>
      <div class="holographic-line" style="top: 35%; width: 80%; animation-delay: 1s;"></div>
      <div class="holographic-line" style="top: 55%; width: 60%; animation-delay: 3s;"></div>
      <div class="holographic-line" style="top: 75%; width: 40%; animation-delay: 5s;"></div>
    </div>

    <div class="relative z-10 w-full max-w-5xl flex flex-col items-center">
      <h1 class="text-4xl md:text-5xl font-bold mb-2 text-center">
        <span class="gradient-text">SELECCIONA TU AVATAR</span>
      </h1>
      
      <!-- Selector de género con tabs -->
      <div class="glass-effect rounded-full p-1 flex mb-6">
        <button class="tab-button px-5 py-2 rounded-full text-white text-base active" data-character="male">
          <i class="fas fa-mars mr-2"></i>Masculino
        </button>
        <button class="tab-button px-5 py-2 rounded-full text-white text-base" data-character="female">
          <i class="fas fa-venus mr-2"></i>Femenino
        </button>
      </div>

      <div class="w-full flex flex-col lg:flex-row gap-6 items-start">
        <!-- Visualización del personaje -->
        <div class="w-full lg:w-1/2 flex flex-col items-center">
          <div class="relative w-full h-64 md:h-80 lg:h-96 mb-4 glass-effect rounded-xl overflow-hidden">
            <!-- Modelo masculino -->
            <div class="absolute inset-0 transition-all duration-500 ${maleDisplayClass}">
              <canvas class="model-canvas w-full h-full" id="canvas-male"></canvas>
            </div>
            
            <!-- Modelo femenino -->
            <div class="absolute inset-0 transition-all duration-500 ${femaleDisplayClass}">
              <canvas class="model-canvas w-full h-full" id="canvas-female"></canvas>
            </div>
          </div>
          
          <!-- Campo de nombre debajo del modelo - ACTUALIZADO -->
          <div class="name-container">
            <label class="name-label">Tu nombre en el metaverso</label>
            <div class="name-input-container">
              <input type="text" id="player-name" placeholder="Escribe tu nombre..." maxlength="20" required>
            </div>
            <p id="name-error" class="hidden">¡Debes ingresar un nombre para continuar!</p>
          </div>
        </div>
        
        <!-- Panel de personalización de colores -->
        <div class="w-full lg:w-1/2 glass-effect p-6 rounded-xl">
          <h3 class="text-lg font-semibold text-white mb-6 text-center">Personaliza los colores</h3>
          
          <div class="flex flex-col gap-6 mb-6" id="color-controls">
            ${this.generateColorControls()}
          </div>
          
          <div class="flex justify-center">
            <button id="random-colors" class="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition flex items-center text-white font-medium">
              <i class="fas fa-random mr-2"></i> Colores Aleatorios
            </button>
          </div>
        </div>
      </div>
      
      <!-- Botón de confirmación -->
      <div class="w-full flex justify-center mt-6">
        <button id="confirm-character" class="confirm-button relative overflow-hidden group px-10 py-4 rounded-full text-lg font-bold text-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
          <div class="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 group-hover:from-purple-700 group-hover:to-pink-600 transition-all duration-300"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
          <div class="relative z-10 flex items-center justify-center">
            <span class="mr-2">CONFIRMAR AVATAR</span>
          </div>
          <div class="absolute inset-0 border-2 border-white/30 rounded-full group-hover:border-white/60 transition-all duration-300"></div>
          <div class="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full blur-md opacity-30 group-hover:opacity-50 group-hover:inset-0 transition-all duration-500"></div>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(this.selectionDiv);

  // Resto del código permanece igual...
this.models.male = this.createCharacterPreview('canvas-male', 'models/boxman.glb', this.currentColors);
this.models.female = this.createCharacterPreview('canvas-female', 'models/mujer.glb', this.currentColors);
  this.selectedCharacter = 'male';
  this.updateUI();
  this.setupColorControls();
    
    const tabButtons = this.selectionDiv.querySelectorAll('.tab-button');
    const self = this;
    
    tabButtons.forEach(button => {
      button.addEventListener('click', function() {
        const character = this.getAttribute('data-character');
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        self.switchToCharacter(character);
      });
    });

    const confirmBtn = this.selectionDiv.querySelector('#confirm-character');
    const nameInput = this.selectionDiv.querySelector('#player-name');
    const nameError = this.selectionDiv.querySelector('#name-error');

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (!nameInput || nameInput.value.trim() === '') {
          if (nameError) nameError.classList.remove('hidden');
          if (nameInput) nameInput.classList.add('border-red-500');
          if (nameInput) nameInput.focus();
        } else {
          this.confirmSelection();
        }
      });
    }

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        if (nameInput.value.trim() !== '') {
          if (nameError) nameError.classList.add('hidden');
          nameInput.classList.remove('border-red-500');
        }
      });
    }

    this.keyHandler = (e) => {
      if (e.key === 'Enter') {
        if (!nameInput || nameInput.value.trim() === '') {
          if (nameError) nameError.classList.remove('hidden');
          if (nameInput) nameInput.classList.add('border-red-500');
          if (nameInput) nameInput.focus();
        } else {
          this.confirmSelection();
        }
      }
    };
    
    document.addEventListener('keydown', this.keyHandler);
  }

  switchToCharacter(character) {
    if (this.switchSound) {
      this.switchSound.currentTime = 0;
      this.switchSound.play().catch(e => console.log("Error al reproducir sonido:", e));
    }

    this.selectedCharacter = character;
    this.updateUI();
  }

  confirmSelection() {
    if (!this.selectedCharacter || !this.selectionDiv) return;
    
    const playerNameInput = this.selectionDiv.querySelector('#player-name');
    if (!playerNameInput) return;
    
    const playerName = playerNameInput.value.trim();
    if (!playerName) return;
    
    if (this.backgroundMusic) {
      const fadeAudio = setInterval(() => {
        if (this.backgroundMusic.volume > 0.1) {
          this.backgroundMusic.volume -= 0.05;
        } else {
          this.backgroundMusic.pause();
          this.backgroundMusic.currentTime = 0;
          clearInterval(fadeAudio);
        }
      }, 100);
    }
    
    document.removeEventListener('keydown', this.keyHandler);
    
    if (this.selectionDiv.style) {
      this.selectionDiv.style.opacity = '0';
      this.selectionDiv.style.transition = 'opacity 0.5s ease';
    }
    
    setTimeout(() => {
      if (this.selectionDiv && this.selectionDiv.parentNode) {
        this.selectionDiv.parentNode.removeChild(this.selectionDiv);
      }
      
      if (typeof this.onCharacterSelected === 'function') {
        this.onCharacterSelected(this.selectedCharacter, playerName, this.currentColors);
      }

      Object.values(this.models).forEach(modelObj => {
        if (modelObj && typeof modelObj.cleanup === 'function') modelObj.cleanup();
      });
    }, 500);
  }

  updateUI() {
    if (!this.selectionDiv) return;

    const maleDisplay = this.selectionDiv.querySelector('#canvas-male')?.parentElement;
    const femaleDisplay = this.selectionDiv.querySelector('#canvas-female')?.parentElement;
    const maleTab = this.selectionDiv.querySelector('[data-character="male"]');
    const femaleTab = this.selectionDiv.querySelector('[data-character="female"]');
    
    if (maleDisplay) {
      maleDisplay.classList.toggle('opacity-0', this.selectedCharacter !== 'male');
      maleDisplay.classList.toggle('pointer-events-none', this.selectedCharacter !== 'male');
    }
    
    if (femaleDisplay) {
      femaleDisplay.classList.toggle('opacity-0', this.selectedCharacter !== 'female');
      femaleDisplay.classList.toggle('pointer-events-none', this.selectedCharacter !== 'female');
    }
    
    if (maleTab && femaleTab) {
      if (this.selectedCharacter === 'male') {
        maleTab.classList.add('active');
        femaleTab.classList.remove('active');
      } else {
        maleTab.classList.remove('active');
        femaleTab.classList.add('active');
      }
    }
  }

  generateColorControls() {
    const partIcons = {
      cabello: 'fas fa-cut',
      camisa: 'fas fa-tshirt', 
      ojos: 'fas fa-eye',
      pantalon: 'fas fa-running',
      piel: 'fas fa-hand-paper',
      zapatos: 'fas fa-shoe-prints'
    };

    const partTitles = {
      cabello: 'Cabello',
      camisa: 'Camisa',
      ojos: 'Ojos',
      pantalon: 'Pantalón',
      piel: 'Piel',
      zapatos: 'Zapatos'
    };
    const firstRow = this.colorableParts.slice(0, 3);
    const secondRow = this.colorableParts.slice(3);

    return `
      <div class="grid grid-cols-3 gap-6 mb-4 justify-items-center">
        ${firstRow.map(part => this.createColorControl(part, partIcons, partTitles)).join('')}
      </div>
      <div class="grid grid-cols-3 gap-6 justify-items-center">
        ${secondRow.map(part => this.createColorControl(part, partIcons, partTitles)).join('')}
      </div>
    `;
  }
createColorControl(part, partIcons, partTitles) {
  const presetColors = this.getPresetColors(part);
  const title = partTitles[part];
  
  return `
    <div class="color-control group relative flex flex-col items-center" data-part="${part}">
      <div class="relative">
        <label class="block mb-2 cursor-pointer">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center border-2 border-white/20 hover:border-white/40 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-purple-500/25">
            <i class="${partIcons[part]} text-white text-xl"></i>
          </div>
        </label>
        <div class="color-palette absolute top-full left-1/2 transform -translate-x-1/2 mt-3 glass-effect p-3 rounded-lg grid grid-cols-4 gap-2 z-20 hidden">
          ${presetColors.map(color => `
            <div class="w-7 h-7 rounded cursor-pointer border-2 border-white/30 hover:scale-110 transition-transform hover:border-white/60" 
                 style="background-color: ${color}" 
                 data-color="${color}"
                 title="${color}"></div>
          `).join('')}
        </div>
      </div>
      <div class="color-preview w-8 h-8 rounded-full border-3 border-white/80 shadow-xl mt-3 transition-all duration-300 group-hover:scale-125" style="background-color: ${this.currentColors[part]}"></div>
      <div class="absolute -bottom-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs px-3 py-2 rounded-full font-medium">
        ${title}
      </div>
    </div>
  `;
}
// Añade este método para obtener colores predefinidos por parte
getPresetColors(part) {
  const colorPresets = {
    cabello: ['#5e2a00', '#3a1800', '#8b4513', '#a52a2a', '#d2691e', '#000000', '#a8a8a8', '#f4f13e'],
    camisa: ['#1d3cee', '#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'],
    ojos: ['#000000', '#3b0c67', '#0f5c36', '#1e3f8b', '#8b1a1a', '#5d4037', '#607d8b', '#795548'],
    pantalon: ['#3c9eff', '#1a1a1a', '#36454f', '#654321', '#708090', '#483c32', '#556b2f', '#800020'],
    piel: ['#e99292', '#f5d0c4', '#d8ae84', '#c68642', '#a86a3d', '#8d5524', '#7f4b1f', '#6c3e17'],
    zapatos: ['#1a1a1a', '#2c3e50', '#654321', '#483c32', '#000000', '#2f4f4f', '#800020', '#36454f']
  };
  
  return colorPresets[part] || ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];
}

setupColorControls() {
  this.colorableParts.forEach(part => {
    // Encuentra el control de color por el texto del tooltip
    const colorControls = this.selectionDiv.querySelectorAll('.color-control');
    let colorControl = null;
    
    // Buscar el control que corresponde a esta parte
    colorControls.forEach(control => {
      const tooltip = control.querySelector('div.absolute.-bottom-10');
      if (tooltip && tooltip.textContent.trim() === this.getPartTitle(part)) {
        colorControl = control;
      }
    });
    
    if (!colorControl) {
      console.warn(`No se encontró control para: ${part}`);
      return;
    }
    
    const iconContainer = colorControl.querySelector('label');
    const colorPalette = colorControl.querySelector('.color-palette');
    const colorPreview = colorControl.querySelector('.color-preview');
    
    if (!iconContainer || !colorPalette || !colorPreview) {
      console.warn(`Elementos faltantes para: ${part}`);
      return;
    }
    
    // Mostrar/ocultar paleta al hacer clic
    iconContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      // Cerrar otras paletas abiertas
      document.querySelectorAll('.color-palette').forEach(palette => {
        if (palette !== colorPalette) {
          palette.classList.add('hidden');
        }
      });
      
      colorPalette.classList.toggle('hidden');
    });
    
colorPalette.querySelectorAll('div[data-color]').forEach(colorElement => {
  colorElement.addEventListener('click', (e) => {
    e.stopPropagation();
    const colorValue = colorElement.getAttribute('data-color');
    this.currentColors[part] = colorValue;
    colorPreview.style.backgroundColor = colorValue;
    // Aplicar a ambos personajes en lugar de solo al seleccionado
    this.applyColorsToModel(this.selectedCharacter, part, colorValue);
    colorPalette.classList.add('hidden');
  });
});
  });

  // Cerrar paletas al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.color-control')) {
      document.querySelectorAll('.color-palette').forEach(palette => {
        palette.classList.add('hidden');
      });
    }
  });

  const randomButton = this.selectionDiv.querySelector('#random-colors');
  if (randomButton) {
    randomButton.addEventListener('click', () => {
      this.randomizeColors();
      this.updateColorPreviews();
    });
  }
}

// Añade este método helper para obtener el título de la parte
getPartTitle(part) {
  const partTitles = {
    cabello: 'Cabello',
    camisa: 'Camisa',
    ojos: 'Ojos',
    pantalon: 'Pantalón',
    piel: 'Piel',
    zapatos: 'Zapatos'
  };
  return partTitles[part] || part;
}

  updateColorPreviews() {
    this.colorableParts.forEach(part => {
      const colorInput = this.selectionDiv.querySelector(`#color-${part}`);
      if (colorInput) {
        const colorPreview = colorInput.closest('.color-control').querySelector('.color-preview');
        if (colorPreview) {
          colorPreview.style.backgroundColor = this.currentColors[part];
        }
      }
    });
  }

  randomizeColors() {
    const randomColor = () => {
      return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    };

    this.colorableParts.forEach(part => {
      if (part !== 'ojos' && part !== 'piel') {
        const newColor = randomColor();
        this.currentColors[part] = newColor;
        const colorInput = this.selectionDiv.querySelector(`#color-${part}`);
        if (colorInput) {
          colorInput.value = newColor;
        }
        this.applyColorsToModel(this.selectedCharacter, part, newColor);
      }
    });
  }

applyColorsToModel(characterType, partName, colorValue) {
  // Aplicar el color a ambos personajes, no solo al seleccionado
  Object.keys(this.models).forEach(charType => {
    const model = this.models[charType];
    if (model && typeof model.applyColor === 'function') {
      model.applyColor(partName, colorValue);
    }
  });
}

randomizeColors() {
  const randomColor = () => {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  };

  this.colorableParts.forEach(part => {
    if (part !== 'ojos' && part !== 'piel') {
      const newColor = randomColor();
      this.currentColors[part] = newColor;
      const colorInput = this.selectionDiv.querySelector(`#color-${part}`);
      if (colorInput) {
        colorInput.value = newColor;
      }
      // Aplicar a ambos personajes
      this.applyColorsToModel(this.selectedCharacter, part, newColor);
    }
  });
}

createCharacterPreview(canvasId, modelPath, initialColors = null) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return () => {};

  const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    alpha: true,
    antialias: true 
  });
  
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60, 
    canvas.clientWidth / canvas.clientHeight, 
    0.1, 
    100
  );
  
  camera.position.set(0, 1.5, 4);
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight1.position.set(10, 3, 10);
  scene.add(directionalLight1);
  
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight2.position.set(-1, 3.5, -1);
  scene.add(directionalLight2);

  const accentLight = new THREE.PointLight(0x8b5cf6, 1.5, 10);
  accentLight.position.set(0, 2, 5);
  scene.add(accentLight);

  let mixer, clock, model, animationId;
  const loader = new GLTFLoader();
  
  const originalMaterials = {};

  const applyColor = (partName, colorValue) => {
    if (!model) return;
    
    model.traverse(child => {
      if (child.isMesh && child.material) {
        const materialName = child.material.name.toLowerCase();
        if (materialName.includes(partName.toLowerCase())) {
          child.material.color.set(colorValue);
          child.material.needsUpdate = true;
        }
      }
    });
  };
  
  const applyInitialColors = (colors) => {
    if (!model || !colors) return;
    
    Object.keys(colors).forEach(partName => {
      applyColor(partName, colors[partName]);
    });
  };

  const cleanup = () => {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    if (mixer && model) mixer.uncacheRoot(model);
    if (renderer) renderer.dispose();
  };

  const onResize = () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  };

  loader.load(modelPath, gltf => {
    model = gltf.scene;

    model.traverse(child => {
      if (child.isMesh && child.material) {
        originalMaterials[child.uuid] = child.material.clone();
      }
    });

    const bbox = new THREE.Box3().setFromObject(model);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    let targetHeight = 4.0;
    let scale = targetHeight / size.y;
    if (modelPath.includes('mujer')) {
      scale *= 1.15; 
      targetHeight = 4.2; 
    }
    
    model.scale.set(scale, scale, scale);
    model.position.y = -center.y * scale + 0.8; 
    model.position.x = -center.x * scale;
    model.rotation.y = Math.PI * 1.5;
    scene.add(model);
    if (initialColors) {
      applyInitialColors(initialColors);
    }

    if (gltf.animations?.length > 0) {
      clock = new THREE.Clock();
      mixer = new THREE.AnimationMixer(model);

      const idleAnimation = gltf.animations.find(anim => anim.name === "idle") || gltf.animations[0];
      const action = mixer.clipAction(idleAnimation);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
    }

    const modelHeight = size.y * scale;
    
    if (modelPath.includes('mujer')) {
      camera.position.z = modelHeight * 4.4; 
      camera.position.y = modelHeight * 2.4;
    } else {
      camera.position.z = modelHeight * 5.8;
      camera.position.y = modelHeight * 3.1;
    }

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (mixer && clock) mixer.update(clock.getDelta());
      if (model) model.rotation.y += 0.005;
      renderer.render(scene, camera);
    };

    animate();
    window.addEventListener('resize', onResize);
  }, undefined, error => {
    console.error(`Error loading ${modelPath}:`, error);
  });

  return {
    cleanup,
    applyColor
  };
}
}