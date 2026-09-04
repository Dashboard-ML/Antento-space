import * as THREE from 'three';

export class AudioSystem {
  constructor() {
    this.audioLoader = new THREE.AudioLoader();
    this.listener = new THREE.AudioListener();
    this.sounds = {};
    this.backgroundMusic = null;
    this.audioContext = null;
    this.globalVolume = 0.7; // Volumen por defecto (70%)
    
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log("AudioContext inicializado correctamente");
    } catch (e) {
      console.error("Error al inicializar AudioContext:", e);
    }
  }

  // ========================
  // MÉTODOS PARA MÚSICA
  // ========================
  loadBackgroundMusic(path) {
    return new Promise((resolve) => {
      this.backgroundMusic = new Audio(path);
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = this.globalVolume * 0.5; // Música al 50% del volumen global
      
      // Conexión al AudioContext si está disponible
      if (this.audioContext) {
        const source = this.audioContext.createMediaElementSource(this.backgroundMusic);
        source.connect(this.audioContext.destination);
      }
      
      resolve(this.backgroundMusic);
    });
  }

  playBackgroundMusic() {
    if (!this.backgroundMusic) return;

    this.backgroundMusic.play()
      .then(() => console.log("Música de fondo iniciada"))
      .catch(e => {
        console.log("Autoplay bloqueado:", e);
        this.enableAutoplay();
      });
  }

  enableAutoplay() {
    document.addEventListener('click', () => {
      this.backgroundMusic.play();
      console.log("Música iniciada después de interacción");
    }, { once: true });
  }

  // ========================
  // MÉTODOS PARA EFECTOS DE SONIDO
  // ========================
  loadSound(key, path, options = {}) {
    return new Promise((resolve) => {
      const sound = new Audio(path);
      sound.volume = options.volume || this.globalVolume;
      sound.loop = options.loop || false;
      sound.playing = false;
      
      // Conexión al AudioContext
      if (this.audioContext) {
        const source = this.audioContext.createMediaElementSource(sound);
        source.connect(this.audioContext.destination);
      }

      this.sounds[key] = sound;
      resolve(sound);
    });
  }

  playSound(key) {
    const sound = this.sounds[key];
    if (!sound) return;

    sound.currentTime = 0; // Reiniciar si ya se estaba reproduciendo
    sound.play()
      .then(() => {
        sound.playing = true;
      })
      .catch(e => {
        console.error(`Error al reproducir sonido ${key}:`, e);
        sound.playing = false;
      });
  }

  stopSound(key) {
    const sound = this.sounds[key];
    if (sound && sound.playing) {
      sound.pause();
      sound.currentTime = 0;
      sound.playing = false;
    }
  }

  // ========================
  // CONTROL DE VOLUMEN
  // ========================
  setGlobalVolume(volume) {
    this.globalVolume = THREE.MathUtils.clamp(volume, 0, 1);
    
    // Aplicar a todos los sonidos
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.globalVolume;
    });
    
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.globalVolume * 0.5;
    }
  }

  toggleMute() {
    this.setGlobalVolume(this.globalVolume > 0 ? 0 : 0.7);
  }

  // ========================
  // DESTRUCCIÓN/CLEANUP
  // ========================
  cleanup() {
    // Detener todos los sonidos
    Object.values(this.sounds).forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
    
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
    
    // Liberar recursos
    this.sounds = {};
    this.backgroundMusic = null;
  }
}