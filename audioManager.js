// audioManager.js
export class AudioManager {
    constructor() {
        this.backgroundMusic = null;
        this.walkingSound = null;
        this.audioContext = null;
        this.isAudioContextInitialized = false;
    }

    init() {
        try {
            // Crear elementos de audio
            this.backgroundMusic = new Audio('sounds/fondo.mp3');
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = 0.1;

            this.walkingSound = new Audio('sounds/02-pasos-44064.mp3');
            this.walkingSound.loop = true;
            this.walkingSound.volume = 0.9;
            this.walkingSound.playing = false;

            // Inicializar AudioContext
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaElementSource(this.backgroundMusic);
            source.connect(this.audioContext.destination);
            const walkSource = this.audioContext.createMediaElementSource(this.walkingSound);
            walkSource.connect(this.audioContext.destination);
            
            this.isAudioContextInitialized = true;
            console.log("AudioManager inicializado correctamente");
        } catch (e) {
            console.log("AudioContext no soportado:", e);
            this.isAudioContextInitialized = false;
        }
    }

    safePlay() {
        if (this.backgroundMusic) {
            this.backgroundMusic.play().catch(e => {
                console.log("Reproducción automática prevenida:", e);
                // Agregar listener para iniciar con interacción del usuario
                const playOnInteraction = () => {
                    this.backgroundMusic.play();
                    document.removeEventListener('click', playOnInteraction);
                    document.removeEventListener('touchstart', playOnInteraction);
                };
                
                document.addEventListener('click', playOnInteraction, { once: true });
                document.addEventListener('touchstart', playOnInteraction, { once: true });
            });
        }
    }

    playWalkingSound() {
        if (this.walkingSound && !this.walkingSound.playing) {
            this.walkingSound.play().catch(e => {
                console.log("Error al reproducir sonido de caminar:", e);
                // Intentar reproducir con interacción del usuario
                const playOnInteraction = () => {
                    this.walkingSound.play();
                    document.removeEventListener('click', playOnInteraction);
                    document.removeEventListener('touchstart', playOnInteraction);
                };
                
                document.addEventListener('click', playOnInteraction, { once: true });
                document.addEventListener('touchstart', playOnInteraction, { once: true });
            });
            this.walkingSound.playing = true;
        }
    }

    stopWalkingSound() {
        if (this.walkingSound && this.walkingSound.playing) {
            this.walkingSound.pause();
            this.walkingSound.currentTime = 0;
            this.walkingSound.playing = false;
        }
    }

    setBackgroundMusicVolume(volume) {
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = Math.max(0, Math.min(1, volume));
        }
    }

    setWalkingSoundVolume(volume) {
        if (this.walkingSound) {
            this.walkingSound.volume = Math.max(0, Math.min(1, volume));
        }
    }

    pauseAll() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
        }
        if (this.walkingSound) {
            this.walkingSound.pause();
            this.walkingSound.playing = false;
        }
    }

    resumeAll() {
        if (this.backgroundMusic) {
            this.backgroundMusic.play().catch(console.error);
        }
    }

    dispose() {
        this.pauseAll();
        
        if (this.backgroundMusic) {
            this.backgroundMusic.src = '';
            this.backgroundMusic = null;
        }
        
        if (this.walkingSound) {
            this.walkingSound.src = '';
            this.walkingSound = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.isAudioContextInitialized = false;
    }
}

// Instancia global opcional (si prefieres un singleton)
export const audioManager = new AudioManager();