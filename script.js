// script.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FileLoader } from 'three';
import * as CANNON from 'cannon-es';
import { CharacterSelection } from './characterSelection.js';
import { configurarHotspot, checkHotspotInteraction } from './hotspots.js';
import { createTrimesh, agregarColisionesDesdeEscenario } from './colisiones.js';
import { createCapsule } from './jugadorFisica.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ColorCorrectionShader } from 'three/addons/shaders/ColorCorrectionShader.js';
import { LightingSystem } from './lightingSystem.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { AudioManager } from './audioManager.js';

// IndexedDB Manager
class IndexedDBManager {
  constructor() {
    this.dbName = 'ModelCacheDB';
    this.version = 3;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('models')) {
          const store = db.createObjectStore('models', { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveModel(url, arrayBuffer) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      
      const modelData = {
        url: url,
        data: arrayBuffer,
        timestamp: Date.now(),
        size: arrayBuffer.byteLength
      };

      const request = store.put(modelData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getModel(url) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.get(url);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteModel(url) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      const request = store.delete(url);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldModels(maxAge = 30 * 24 * 60 * 60 * 1000) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      const index = store.index('timestamp');
      const cutoff = Date.now() - maxAge;

      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getStorageInfo() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.getAll();

      request.onsuccess = () => {
        const models = request.result;
        const totalSize = models.reduce((sum, model) => sum + (model.size || 0), 0);
        resolve({
          totalModels: models.length,
          totalSize: totalSize,
          models: models.map(m => ({ url: m.url, size: m.size, timestamp: m.timestamp }))
        });
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// Cached GLTF Loader
class CachedGLTFLoader {
  constructor(manager) {
    this.loader = new GLTFLoader(manager);
    this.dbManager = new IndexedDBManager();
    this.cacheEnabled = true;
  }

  async load(url, onLoad, onProgress, onError) {
    // Intentar cargar desde caché primero
    if (this.cacheEnabled) {
      try {
        await this.dbManager.init();
        const cachedData = await this.dbManager.getModel(url);
        
        if (cachedData) {
          this.loader.parse(cachedData, '', (gltf) => {
            onLoad(gltf);
            // Actualizar timestamp
            this.dbManager.saveModel(url, cachedData);
          });
          return;
        }
      } catch (error) {
        console.warn('Error al cargar desde caché, cargando desde red:', error);
      }
    }

    // Cargar desde red si no está en caché
    const fileLoader = new FileLoader();
    fileLoader.setResponseType('arraybuffer');
    
    fileLoader.load(url, async (arrayBuffer) => {
      try {
        // Guardar en caché
        if (this.cacheEnabled) {
          await this.dbManager.saveModel(url, arrayBuffer);
        }
        
        // Parsear el modelo
        this.loader.parse(arrayBuffer, '', (gltf) => {
          onLoad(gltf);
        });
      } catch (error) {
        if (onError) onError(error);
      }
    }, onProgress, onError);
  }

  setCacheEnabled(enabled) {
    this.cacheEnabled = enabled;
  }

  async clearCache() {
    return this.dbManager.clearOldModels(0);
  }

  async getCacheInfo() {
    return this.dbManager.getStorageInfo();
  }
}

// ===== SUPABASE =====
// Esta aplicación es HTML/JS estático, por eso NEXT_PUBLIC_* no se inyecta automáticamente.
// La publishable key está diseñada para usarse en el cliente; nunca uses aquí una service_role key.
const SUPABASE_URL = "https://cpmaiwupksujvuajtarn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_K6-15r0ebV4Z8GmYi_O3WQ_yndV5tD1";

if (!window.supabase?.createClient) {
  throw new Error('Supabase JS no se cargó. Revisa el script CDN en index.html.');
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    realtime: {
      params: { eventsPerSecond: 20 }
    }
  }
);

const PLAYERS_TABLE = 'players';
const CHAT_TABLE = 'chat';
let playersChannel = null;
let chatChannel = null;
let inactiveCleanupTimer = null;
let pendingPlayerRow = null;
let playerUpsertRunning = false;

// Variables globales
let animationsPanelActive = false;
let animationTimeout = null;
let video = null;
let videoTexture = null;
let myPlayerColors = {
  cabello: '#030d17',
  camisa: '#a7a7a7',
  ojos: '#000000',
  pantalon: '#2c3e50',
  piel: '#f499b3',
  zapatos: '#1a1a1a'
};

const audioManager = new AudioManager();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const lightingSystem = new LightingSystem(scene);
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.8, 0) });
const playerMaterial = new CANNON.Material('playerMaterial');
const groundMaterial = new CANNON.Material('groundMaterial');
const contactMaterial = new CANNON.ContactMaterial(playerMaterial, groundMaterial, {
  friction: 1, 
  restitution: 0.0,
  contactEquationStiffness: 1e8, 
  contactEquationRelaxation: 3    
});

// ===== CHAT SYSTEM =====
let chatActive = false;
const chatToggle = document.getElementById('chat-toggle');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const chatSend = document.getElementById('chat-send');
const chatClose = document.getElementById('chat-close');

// Mostrar/Ocultar chat
if (chatToggle) {
  chatToggle.addEventListener('click', () => {
    chatActive = !chatActive;
    chatBox.classList.toggle('hidden');
    if (chatActive) {
      chatInput.focus();
    } else {
      chatInput.blur();
    }
  });
}

if (chatClose) {
  chatClose.addEventListener('click', () => {
    chatActive = false;
    chatBox.classList.add('hidden');
    chatInput.blur();
  });
}

// ===== FULLSCREEN FUNCTIONALITY =====
function initFullscreen() {
  const fullscreenBtn = document.getElementById('fullscreen-toggle');
  
  if (!fullscreenBtn) {
    console.error('No se encontró el botón de pantalla completa');
    return;
  }

  // Función para toggle de pantalla completa
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      // Entrar en pantalla completa
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      }
    } else {
      // Salir de pantalla completa
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  // Actualizar estado del botón
  function updateFullscreenButton() {
    if (document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.msFullscreenElement) {
      fullscreenBtn.classList.add('fullscreen-active');
      fullscreenBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
        </svg>
      `;
      fullscreenBtn.title = "Salir de pantalla completa";
    } else {
      fullscreenBtn.classList.remove('fullscreen-active');
      fullscreenBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
      `;
      fullscreenBtn.title = "Pantalla completa";
    }
  }

  // Event listeners
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  
  // Escuchar cambios de estado de pantalla completa
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
  document.addEventListener('msfullscreenchange', updateFullscreenButton);

  // Mostrar el botón cuando la experiencia cargue
  function showFullscreenButton() {
    fullscreenBtn.classList.add('show');
  }

  // Atajo de teclado F11
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  return {
    show: showFullscreenButton,
    toggle: toggleFullscreen
  };
}

// Inicializar fullscreen
const fullscreenManager = initFullscreen();

function applyStandardMaterials(object) {
  object.traverse(child => {
    if (child.isMesh && child.material) {
      const mat = child.material;
      const matName = (mat.name || '').toLowerCase();

      if (matName.includes("glass") || matName.includes("cristal")) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0xffffff),
          metalness: 0.1,
          roughness: 0.05,
          transmission: 0.95,
          thickness: 0.5,
          transparent: true,
          opacity: 0.97,
          envMap: scene.environment,
          envMapIntensity: 2.8,
          side: THREE.DoubleSide
        });
      } else {
        if (mat.emissive) {
          mat.emissiveIntensity = 1.2;
          mat.emissive.multiplyScalar(1.5);
        }
        mat.roughness = Math.max(0.3, mat.roughness || 0.8);
        mat.metalness = Math.min(0.4, mat.metalness || 0);
        mat.envMapIntensity = 1.2;
        mat.needsUpdate = true;
      }
    }
  });
}

const seenChatMessageIds = new Set();

function normalizeChatRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    playerId: row.player_id,
    name: row.name,
    text: row.text,
    timestamp: Number(row.timestamp) || Date.now()
  };
}

function renderChatMessage(rawMessage) {
  const msg = rawMessage?.player_id ? normalizeChatRow(rawMessage) : rawMessage;
  if (!msg || !chatMessages) return;

  if (msg.id && seenChatMessageIds.has(msg.id)) return;
  if (msg.id) seenChatMessageIds.add(msg.id);

  const div = document.createElement('div');
  div.classList.add('chat-message', msg.playerId === myPlayerId ? 'own' : 'other', 'new');

  const sender = document.createElement('div');
  sender.className = 'sender';
  sender.textContent = msg.name || 'Jugador';

  const textNode = document.createTextNode(msg.text || '');

  const timestamp = document.createElement('div');
  timestamp.className = 'timestamp';
  timestamp.textContent = new Date(msg.timestamp).toLocaleTimeString();

  div.appendChild(sender);
  div.appendChild(textNode);
  div.appendChild(timestamp);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  const allMessages = chatMessages.querySelectorAll('.chat-message');
  if (allMessages.length > 20) {
    chatMessages.removeChild(allMessages[0]);
  }

  if (remotePlayerModels[msg.playerId]) {
    showSpeechBubble(remotePlayerModels[msg.playerId], msg.text);
  } else if (msg.playerId === myPlayerId && model) {
    showSpeechBubble(model, msg.text);
  }
}

async function loadRecentChatMessages() {
  const { data, error } = await supabaseClient
    .from(CHAT_TABLE)
    .select('id, player_id, name, text, timestamp')
    .order('timestamp', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error cargando chat desde Supabase:', error);
    return;
  }

  [...(data || [])].reverse().forEach(renderChatMessage);
}

function subscribeToChat() {
  if (chatChannel) {
    supabaseClient.removeChannel(chatChannel);
  }

  chatChannel = supabaseClient
    .channel(`chat-${myPlayerId || 'viewer'}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: CHAT_TABLE },
      (payload) => renderChatMessage(payload.new)
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Error en el canal Realtime del chat');
      }
    });
}

async function initChatRealtime() {
  await loadRecentChatMessages();
  subscribeToChat();
}

async function sendMessage() {
  if (!chatInput || chatInput.value.trim() === '' || !myPlayerId) return;

  const message = chatInput.value.trim();
  chatInput.value = '';

  try {
    // Mantener como máximo 20 mensajes, igual que la implementación anterior.
    const { data: oldestRows, count, error: countError } = await supabaseClient
      .from(CHAT_TABLE)
      .select('id, timestamp', { count: 'exact' })
      .order('timestamp', { ascending: true })
      .limit(1);

    if (countError) throw countError;

    if ((count || 0) >= 20 && oldestRows?.[0]?.id) {
      const { error: deleteError } = await supabaseClient
        .from(CHAT_TABLE)
        .delete()
        .eq('id', oldestRows[0].id);

      if (deleteError) throw deleteError;
    }

    const { data: inserted, error: insertError } = await supabaseClient
      .from(CHAT_TABLE)
      .insert({
        player_id: myPlayerId,
        name: playerName,
        text: message,
        timestamp: Date.now()
      })
      .select('id, player_id, name, text, timestamp')
      .single();

    if (insertError) throw insertError;

    // Realtime también lo recibirá; el Set evita duplicarlo.
    renderChatMessage(inserted);
  } catch (error) {
    console.error('Error enviando mensaje con Supabase:', error);
  }
}

if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

if (chatSend) {
  chatSend.addEventListener('click', sendMessage);
}

function isChatActive() {
  return chatActive;
}

world.addContactMaterial(contactMaterial);
scene.fog = new THREE.FogExp2(0xF2F2F2, 0.0);

const remotePlayers = {};
const remotePlayerModels = {};
let myPlayerId = null;
let lastUpdateTime = 0;
let playerName = 'Anónimo';

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.8, -3);
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  powerPreference: "high-performance",
  failIfMajorPerformanceCaveat: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;
renderer.useLegacyLights = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;

let escenarioCargado = false;
let personajeCargado = false;
let playerBody = null;
let escenarioModel = null;
let interactableHotspots = [];
let showInteractHint = false;
let mixer, model, actions = {}, activeAction;
const clock = new THREE.Clock();
let cameraYaw = 0, cameraPitch = 0;
const keys = {};
let velocidadCaminar = 1.9;
let velocidadCorrer = 5;
let velocidadActual = velocidadCaminar;
let composer;
let escenarioCargaPromise = null;
let experienciaIniciada = false;

const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');
const loadingTitle = document.getElementById('loading-title');
const startButton = document.getElementById('start-button');
const loadingScreen = document.getElementById('loading-screen');
const progressBarContainer = document.getElementById('progress-bar-container');
const transitionScreen = document.getElementById('transition-screen');
const transitionProgress = document.getElementById('transition-progress');
const remotePlayerMixers = {};
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/'); 
dracoLoader.setDecoderConfig({ type: 'js' });
const loadingManager = new THREE.LoadingManager();

// Inicializar el loader con caché
const gltfLoader = new CachedGLTFLoader(loadingManager);

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  if (progressBar && loadingText) {
    const progress = (itemsLoaded / itemsTotal) * 100;
    progressBar.style.width = `${progress}%`;
    loadingText.textContent = `${Math.round(progress)}%`;
  }
};

loadingManager.onLoad = () => {
  if (loadingText && startButton && loadingIndicator) {
    loadingText.textContent = '100%';
    setTimeout(() => {
      if (loadingTitle) loadingTitle.style.opacity = '0';
      if (loadingText) loadingText.style.opacity = '0';
      if (progressBarContainer) progressBarContainer.style.opacity = '0';
      startButton.classList.remove('hidden');
      startButton.classList.add('show');
      loadingIndicator.classList.add('hidden');
    }, 500);
  }
};

if (startButton) {
  startButton.addEventListener('click', () => {
    if (loadingScreen?.classList) {
      loadingScreen.classList.add('opacity-0');
    }
    
    setTimeout(() => {
      if (loadingScreen?.style) {
        loadingScreen.style.display = 'none';
      }
      
      const characterSelection = new CharacterSelection((characterType, name, colors) => {
        if (typeof startExperience === 'function') {
          startExperience(characterType, name, colors);
        }
      });
      
      if (characterSelection?.show) {
        characterSelection.show();
      }
    }, 500);
  });
} else {
  console.warn('No se encontró el botón de inicio');
  const characterSelection = new CharacterSelection((characterType, name, colors) => {
    if (typeof startExperience === 'function') {
      startExperience(characterType, name, colors);
    }
  });
  
  if (characterSelection?.show) {
    characterSelection.show();
  }
}

document.addEventListener('keydown', (e) => {
  if (!e) return;
  
  // Manejar Escape para salir de pantalla completa o chat
  if (e.key === 'Escape') {
    if (isChatActive()) {
      chatActive = false;
      chatBox.classList.add('hidden');
      chatInput.blur();
    } else if (document.fullscreenElement) {
      // Salir de pantalla completa con Escape
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    return;
  }
  
  if (isChatActive()) return;
  
  const key = e.key?.toLowerCase?.() || '';
  keys[key] = true;
  if (key === 'shift') {
    velocidadActual = velocidadCorrer;
  }
});

document.addEventListener('keyup', (e) => {
  if (!e) return;
  if (isChatActive()) return;
  
  const key = e.key?.toLowerCase?.() || '';
  keys[key] = false;
  if (key === 'shift') {
    velocidadActual = velocidadCaminar;
  }
});

let isMouseDown = false;

document.addEventListener('mousedown', () => {
  isMouseDown = true;
});

document.addEventListener('mouseup', () => {
  isMouseDown = false;
});

document.addEventListener('mousemove', (e) => {
  if (!isMouseDown || !e) return;
  
  const movementX = e.movementX || 0;
  const movementY = e.movementY || 0;
  
  cameraYaw -= movementX * 0.005;
  cameraPitch = THREE.MathUtils.clamp(
    cameraPitch - movementY * 0.005, 
    -Math.PI / 4, 
    Math.PI / 4
  );
});

function updateTransitionProgress(progress) {
  if (transitionProgress) {
    transitionProgress.style.width = `${progress * 100}%`;
  }
}

function initAnimationsSystem() {
  const animationsToggle = document.getElementById('animations-toggle');
  const animationsPanel = document.getElementById('animations-panel');
  const animationButtons = document.querySelectorAll('.animation-btn');
  
  if (animationsToggle) {
    animationsToggle.classList.remove('hidden');
  }
  
  if (animationsToggle && animationsPanel) {
    animationsToggle.addEventListener('click', () => {
      animationsPanelActive = !animationsPanelActive;
      animationsPanel.classList.toggle('hidden');
    });
  }
  
  animationButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const animationName = e.currentTarget.dataset.animation;
      playExtraAnimation(animationName);
      
      if (animationsPanel) {
        animationsPanel.classList.add('hidden');
        animationsPanelActive = false;
      }
    });
  });
  
  document.addEventListener('click', (e) => {
    if (animationsPanelActive && 
        animationsPanel && 
        !animationsPanel.contains(e.target) && 
        e.target !== animationsToggle) {
      animationsPanel.classList.add('hidden');
      animationsPanelActive = false;
    }
  });
}

function playExtraAnimation(animationName) {
  if (!mixer || !actions) return;
  
  if (activeAction) {
    activeAction.fadeOut(0.2);
  }
  
  let newAction = null;
  
  const animationMap = {
    'wave': ['wave', 'hello', 'salute', 'greet'],
    'dance': ['dance', 'dancing', 'party'],
    'sit': ['sit', 'sitting', 'chair'],
    'jump': ['jump', 'jumping', 'hop'],
    'laugh': ['laugh', 'laughing', 'happy'],
    'clap': ['clap', 'clapping', 'applause']
  };
  
  if (animationMap[animationName]) {
    for (const animName of animationMap[animationName]) {
      if (actions[animName]) {
        newAction = actions[animName];
        break;
      }
    }
  }
  
  if (!newAction) {
    newAction = actions['idle'] || Object.values(actions)[0];
  }
  
  if (newAction) {
    activeAction = newAction;
    activeAction.reset().fadeIn(0.2).play();
    // La animación se sincroniza en el siguiente heartbeat de updatePlayerPosition().
    
    if (animationName !== 'sit') {
      if (animationTimeout) clearTimeout(animationTimeout);
      animationTimeout = setTimeout(() => {
        if (activeAction && activeAction !== actions['idle']) {
          activeAction.fadeOut(0.5);
          activeAction = actions['idle'] || Object.values(actions)[0];
          activeAction.reset().fadeIn(0.5).play();
          // El estado idle se sincroniza en el siguiente heartbeat.
        }
      }, 5000);
    }
  }
}

function cargarEscenario() {
  if (escenarioCargado && escenarioModel) {
    return Promise.resolve(escenarioModel);
  }

  if (escenarioCargaPromise) {
    return escenarioCargaPromise;
  }

  escenarioCargaPromise = new Promise((resolve) => {
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load('imagenes/paul_lobe_haus_1k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.encoding = THREE.sRGBEncoding;
      scene.environment = texture;
      scene.environmentIntensity = 2.0;
      scene.environmentRotation = new THREE.Euler(0, Math.PI / 3, 0);
      scene.background = new THREE.Color(0xc0e0ff);

      // Usar el loader con caché
      gltfLoader.load('models/Site2.glb', (gltf) => {
        escenarioModel = gltf.scene;
        escenarioModel.position.set(0, 0, -9);
        escenarioModel.rotation.y = Math.PI;
        scene.add(escenarioModel);

        video = document.createElement('video');
        video.src = 'imagenes/DESARROLLO_20252_1.mp4'; 
        video.loop = true;
        video.muted = true;
        video.play();

        videoTexture = new THREE.VideoTexture(video);
        const tvMesh = gltf.scene.getObjectByName('tv');
        if (tvMesh) {
            const tvMaterial = new THREE.MeshStandardMaterial({
                map: videoTexture,
                side: THREE.DoubleSide
            });
            tvMesh.material = tvMaterial;
        }

        requestAnimationFrame(() => {
          applyStandardMaterials(escenarioModel); 
          configurarHotspot(escenarioModel, "punto1", " ", scene);
          configurarHotspot(escenarioModel, "punto2", " ", scene);
          configurarHotspot(escenarioModel, "punto3", " ", scene);
          configurarHotspot(escenarioModel, "punto4", " ", scene);
          configurarHotspot(escenarioModel, "punto5", " ", scene);
          configurarHotspot(escenarioModel, "punto6", " ", scene);
          configurarHotspot(escenarioModel, "punto7", " ", scene);
          setTimeout(() => {
            agregarColisionesDesdeEscenario(escenarioModel, world, groundMaterial);
          }, 500);
        });

        escenarioCargado = true;
        resolve(escenarioModel);
      }, undefined, (error) => {
        console.error('Error loading scene:', error);
        escenarioCargaPromise = null;
        resolve(null);
      });
    }, undefined, (error) => {
      console.error('Error loading HDR:', error);
      escenarioCargaPromise = null;
      resolve(null);
    });
  });

  return escenarioCargaPromise;
}

async function cargarPersonaje(characterType = 'male', colors = null) {
  return new Promise((resolve) => {
    updateTransitionProgress(0.3);
    
    playerBody = createCapsule(0.25, 1, playerMaterial);
    playerBody.position.set(0, 1, 0);
    world.addBody(playerBody);
    
    const modelPath = characterType === 'female' ? 'models/mujer.glb' : 'models/boxman.glb';

    // Usar el loader con caché
    gltfLoader.load(modelPath, (gltf) => {
      updateTransitionProgress(0.6);
      
      model = gltf.scene;
      model.scale.set(1, 1, 1);
      model.userData.characterType = characterType;
      
      requestAnimationFrame(() => {
        model.traverse(child => {
          if (child.isMesh) {
            const originalName = child.material?.name || '';
            
            const standardMaterial = new THREE.MeshStandardMaterial({
              color: child.material?.color || new THREE.Color(0xcccccc),
              roughness: 1,
              metalness: 0.0,
              flatShading: false
            });
            
            if (child.material?.map) {
              standardMaterial.map = child.material.map;
              standardMaterial.map.encoding = THREE.SRGBColorSpace;
            }
            
            standardMaterial.name = originalName;
            
            child.material = standardMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        if (colors) {
          applyCustomColors(model, colors);
        } else {
          const savedColors = localStorage.getItem('characterColors');
          if (savedColors) {
            try {
              const parsedColors = JSON.parse(savedColors);
              applyCustomColors(model, parsedColors);
            } catch (e) {
              console.error("Error parsing saved colors:", e);
            }
          }
        }
        
        scene.add(model);
        mixer = new THREE.AnimationMixer(model);
        if (gltf.animations?.length > 0) {
          gltf.animations.forEach(anim => {
            actions[anim.name.toLowerCase()] = mixer.clipAction(anim);
          });

          activeAction = actions['idle'] || actions[Object.keys(actions)[0]];
          if (activeAction) {
            activeAction.play();
          }
        }
        
        personajeCargado = true;
        updateTransitionProgress(0.9);
        resolve();
      });
    }, undefined, (error) => {
      console.error('Error loading character:', error);
      resolve();
    });
  });
}

function applyCustomColors(model, colors) {
  
  if (!model || !colors) {
    console.error("Modelo o colores no definidos");
    return;
  }

  const materialMappings = {
    cabello: ['hair', 'cabello', 'pelo', 'head'],
    camisa: ['shirt', 'camisa', 'top', 'upper'],
    ojos: ['eyes', 'ojos', 'eye'],
    pantalon: ['pants', 'pantalon', 'pantalones', 'trousers', 'legs', 'lower'], 
    piel: ['skin', 'piel', 'face', 'body'],
    zapatos: ['shoes', 'zapatos', 'foot', 'feet', 'boots']
  };

  
  model.traverse(child => {
    if (child.isMesh && child.material) {
      const materialName = child.material.name.toLowerCase();
      
      for (const part in materialMappings) {
        if (materialMappings[part].some(keyword => materialName.includes(keyword)) && colors[part]) {
          
          try {
            const threeColor = new THREE.Color(colors[part]);
            child.material.color.copy(threeColor);
            child.material.needsUpdate = true;
          } catch (e) {
            console.error(`Error aplicando color ${colors[part]} a ${part}:`, e);
          }
          
          break; 
        }
      }
    }
  });
  
}

function generatePlayerId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
}

function normalizePlayerRow(row) {
  if (!row) return null;

  return {
    position: row.position || { x: 0, y: 1, z: 0 },
    rotation: Number(row.rotation) || 0,
    currentAnimation: row.current_animation || 'idle',
    characterType: row.character_type || 'male',
    name: row.name || 'Jugador',
    colors: row.colors || {},
    timestamp: Number(row.timestamp) || 0
  };
}

function buildPlayerRow(playerData) {
  return {
    id: myPlayerId,
    position: playerData.position,
    rotation: playerData.rotation,
    current_animation: playerData.currentAnimation,
    character_type: playerData.characterType,
    name: playerData.name,
    colors: playerData.colors,
    timestamp: Number(playerData.timestamp) || Date.now()
  };
}

function queuePlayerUpsert(playerData) {
  if (!myPlayerId) return;

  pendingPlayerRow = buildPlayerRow(playerData);
  if (playerUpsertRunning) return;

  playerUpsertRunning = true;

  (async () => {
    try {
      while (pendingPlayerRow) {
        const row = pendingPlayerRow;
        pendingPlayerRow = null;

        const { error } = await supabaseClient
          .from(PLAYERS_TABLE)
          .upsert(row, { onConflict: 'id' });

        if (error) {
          console.error('Error actualizando jugador en Supabase:', error);
        }
      }
    } finally {
      playerUpsertRunning = false;

      // Si llegó otro estado justo al finalizar, procésalo también.
      if (pendingPlayerRow) {
        queuePlayerUpsert({
          position: pendingPlayerRow.position,
          rotation: pendingPlayerRow.rotation,
          currentAnimation: pendingPlayerRow.current_animation,
          characterType: pendingPlayerRow.character_type,
          name: pendingPlayerRow.name,
          colors: pendingPlayerRow.colors,
          timestamp: pendingPlayerRow.timestamp
        });
      }
    }
  })();
}

async function loadExistingPlayers() {
  const cutoff = Date.now() - 30000;
  const { data, error } = await supabaseClient
    .from(PLAYERS_TABLE)
    .select('*')
    .gte('timestamp', cutoff);

  if (error) {
    console.error('Error cargando jugadores desde Supabase:', error);
    return;
  }

  for (const row of data || []) {
    if (row.id === myPlayerId) continue;
    const playerData = normalizePlayerRow(row);
    if (!remotePlayerModels[row.id]) {
      createRemotePlayerModel(row.id, playerData);
    } else {
      updateRemotePlayer(row.id, playerData);
    }
  }
}

function subscribeToPlayers() {
  if (playersChannel) {
    supabaseClient.removeChannel(playersChannel);
  }

  playersChannel = supabaseClient
    .channel(`players-${myPlayerId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: PLAYERS_TABLE },
      (payload) => {
        const row = payload.new;
        if (!row || row.id === myPlayerId) return;
        const playerData = normalizePlayerRow(row);
        if (remotePlayerModels[row.id]) {
          updateRemotePlayer(row.id, playerData);
        } else {
          createRemotePlayerModel(row.id, playerData);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: PLAYERS_TABLE },
      (payload) => {
        const row = payload.new;
        if (!row || row.id === myPlayerId) return;
        const playerData = normalizePlayerRow(row);
        if (remotePlayerModels[row.id]) {
          updateRemotePlayer(row.id, playerData);
        } else {
          createRemotePlayerModel(row.id, playerData);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: PLAYERS_TABLE },
      (payload) => {
        const playerId = payload.old?.id;
        if (playerId && playerId !== myPlayerId) {
          removeRemotePlayer(playerId);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Cubre reconexiones: resincroniza el estado actual de la sala.
        loadExistingPlayers();
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error en el canal Realtime de jugadores');
      }
    });
}

async function cleanupInactivePlayers() {
  if (!myPlayerId) return;

  const cutoff = Date.now() - 30000;
  const { data, error } = await supabaseClient
    .from(PLAYERS_TABLE)
    .delete()
    .lt('timestamp', cutoff)
    .neq('id', myPlayerId)
    .select('id');

  if (error) {
    console.error('Error eliminando jugadores inactivos:', error);
    return;
  }

  for (const row of data || []) {
    if (row.id) removeRemotePlayer(row.id);
  }
}

function setupInactivePlayerCleanup() {
  if (inactiveCleanupTimer) clearInterval(inactiveCleanupTimer);
  inactiveCleanupTimer = setInterval(cleanupInactivePlayers, 15000);
}

async function initMultiplayer() {
  myPlayerId = generatePlayerId();

  await cleanupInactivePlayers();
  await loadExistingPlayers();
  subscribeToPlayers();
  await initChatRealtime();
  setupInactivePlayerCleanup();
}

async function createRemotePlayerModel(playerId, playerData) {
  
  if (remotePlayerModels[playerId]) {
    console.warn("Jugador ya existe:", playerId);
    return;
  }

  try {
    const modelPath = playerData.characterType === 'female' ? 'models/mujer.glb' : 'models/boxman.glb';
    
    // Usar el loader con caché para modelos remotos
    gltfLoader.load(modelPath, (gltf) => {
      const remoteModel = gltf.scene;
      applyStandardMaterials(remoteModel);
      remoteModel.scale.set(1.0, 1.0, 1.0);
      remoteModel.name = `remotePlayer_${playerId}`;
      
      if (playerData.colors && Object.keys(playerData.colors).length > 0) {
        applyCustomColors(remoteModel, playerData.colors);
      } else {
        const defaultColors = generateDefaultColorsForPlayer(playerId);
        applyCustomColors(remoteModel, defaultColors);
      }
      
      const displayName = playerData.name || 'Jugador';
      const nameTag = createNameTag(displayName); 
      remoteModel.add(nameTag);
      
      const remoteMixer = new THREE.AnimationMixer(remoteModel);
      const remoteActions = {};
      gltf.animations.forEach(anim => {
        remoteActions[anim.name.toLowerCase()] = remoteMixer.clipAction(anim);
      });
      
      const initialAction = remoteActions[playerData.currentAnimation?.toLowerCase()] || remoteActions['idle'];
      if (initialAction) {
        initialAction.play();
      }
      
      remotePlayerMixers[playerId] = {
        mixer: remoteMixer,
        actions: remoteActions,
        currentAction: initialAction
      };

      remoteModel.position.set(
        playerData.position.x,
        playerData.position.y - 0.75,
        playerData.position.z
      );
      remoteModel.rotation.y = playerData.rotation;
      
      remoteModel.traverse(obj => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      
      scene.add(remoteModel);
      remotePlayerModels[playerId] = remoteModel;
      remotePlayers[playerId] = {
        targetPosition: new THREE.Vector3(
          playerData.position.x,
          playerData.position.y - 0.75,
          playerData.position.z
        ),
        targetRotation: playerData.rotation,
        currentAnimation: playerData.currentAnimation || 'idle',
        characterType: playerData.characterType || 'male',
        colors: playerData.colors || {},
        name: displayName
      };
      
    }, undefined, (error) => {
      console.error("Error al cargar modelo remoto:", error);
      createCubeFallback(playerId, playerData);
    });
  } catch (error) {
    console.error("Error al crear modelo:", error);
    createCubeFallback(playerId, playerData);
  }
}

function generateDefaultColorsForPlayer(playerId) {
  // Generar colores consistentes basados en el ID del jugador
  const hash = playerId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const hues = [
    Math.abs(hash % 360),
    Math.abs((hash + 120) % 360),
    Math.abs((hash + 240) % 360)
  ];
  
  return {
    cabello: `hsl(${hues[0]}, 70%, 20%)`,
    camisa: `hsl(${hues[1]}, 60%, 50%)`,
    ojos: '#000000',
    pantalon: `hsl(${hues[2]}, 50%, 30%)`,
    piel: '#f499b3',
    zapatos: '#1a1a1a'
  };
}

function createCubeFallback(playerId, playerData) {
  const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
  const color = playerData.characterType === 'female' ? 0xff69b4 : 0x3498db; 
  const material = new THREE.MeshStandardMaterial({ 
    color: new THREE.Color(color),
    name: `remotePlayer_${playerId}`
  });
  
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  cube.name = `remotePlayer_${playerId}`;
  
  cube.position.set(
    playerData.position.x,
    playerData.position.y - 0.75,
    playerData.position.z
  );
  cube.rotation.y = playerData.rotation;

  const displayName = playerData.name || 'Jugador';
  cube.add(createNameTag(displayName));
  
  scene.add(cube);
  remotePlayerModels[playerId] = cube;
  remotePlayers[playerId] = {
    targetPosition: new THREE.Vector3(
      playerData.position.x,
      playerData.position.y - 0.75,
      playerData.position.z
    ),
    targetRotation: playerData.rotation,
    name: displayName
  };
}

function createNameTag(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(15, 23, 42, 0.85)';
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, 20);
  context.fill();
  context.strokeStyle = '#8b5cf6';
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, 20);
  context.stroke();
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#ec4899');
  gradient.addColorStop(1, '#8b5cf6');
  context.font = 'bold 28px Montserrat';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = gradient;
  context.fillText(name, canvas.width / 2, canvas.height / 2);
  context.shadowColor = 'rgba(139, 92, 246, 0.7)';
  context.shadowBlur = 10;
  context.fillText(name, canvas.width / 2, canvas.height / 2);
  context.shadowBlur = 0;
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
    depthTest: false
  });
  
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.8, 0.45, 1);
  sprite.position.y = 2.2;
  sprite.name = 'nameTag';
  sprite.userData.isNameTag = true; 
  sprite.userData.ignoreRaycast = true; 
  
  return sprite;
}

function disposeNameTag(nameTag) {
  if (!nameTag?.material) return;

  if (nameTag.material.map) {
    nameTag.material.map.dispose();
  }

  nameTag.material.dispose();
}

function updateRemotePlayer(playerId, playerData) {
  if (!remotePlayers[playerId]) {
    remotePlayers[playerId] = {};
  }
  
  if (!remotePlayers[playerId].targetPosition) {
    remotePlayers[playerId].targetPosition = new THREE.Vector3();
  }
  remotePlayers[playerId].targetPosition.set(
    playerData.position.x,
    playerData.position.y - 0.75,
    playerData.position.z
  );
  remotePlayers[playerId].targetRotation = playerData.rotation;
  
  if (playerData.colors && 
      JSON.stringify(playerData.colors) !== JSON.stringify(remotePlayers[playerId].colors)) {
    
    remotePlayers[playerId].colors = { ...playerData.colors };
    
    const remoteModel = remotePlayerModels[playerId];
    if (remoteModel) {
      applyCustomColors(remoteModel, playerData.colors);
    }
  }
  
  const remoteModel = remotePlayerModels[playerId];
  const displayName = playerData.name || 'Jugador';
  const currentNameTag = remoteModel?.getObjectByName('nameTag');

  if (remoteModel && (
    !currentNameTag ||
    remotePlayers[playerId].name !== displayName
  )) {
    if (currentNameTag) {
      remoteModel.remove(currentNameTag);
      disposeNameTag(currentNameTag);
    }
    
    const newTag = createNameTag(displayName);
    remoteModel.add(newTag);
    remotePlayers[playerId].name = displayName;
  }
  
  if (playerData.currentAnimation && 
      remotePlayers[playerId].currentAnimation !== playerData.currentAnimation) {
    remotePlayers[playerId].currentAnimation = playerData.currentAnimation;
    
    const remotePlayer = remotePlayerMixers[playerId];
    if (remotePlayer) {
      let newAction = null;
      const animationName = playerData.currentAnimation.toLowerCase();
      
      if (remotePlayer.actions[animationName]) {
        newAction = remotePlayer.actions[animationName];
      } else {
        const animationAlternatives = {
          'wave': ['wave', 'hello', 'salute', 'greet'],
          'dance': ['dance', 'dancing', 'party'],
          'sit': ['sit', 'sitting', 'chair'],
          'jump': ['jump', 'jumping', 'hop'],
          'laugh': ['laugh', 'laughing', 'happy'],
          'clap': ['clap', 'clapping', 'applause']
        };
        
        for (const [key, names] of Object.entries(animationAlternatives)) {
          if (key === animationName) {
            for (const name of names) {
              if (remotePlayer.actions[name]) {
                newAction = remotePlayer.actions[name];
                break;
              }
            }
            break;
          }
        }
      }
      
      if (!newAction) {
        newAction = remotePlayer.actions['idle'] || Object.values(remotePlayer.actions)[0];
      }
      
      if (newAction) {
        remotePlayer.currentAction?.fadeOut(0.2);
        remotePlayer.currentAction = newAction;
        newAction.reset().fadeIn(0.2).play();
      }
    }
  }
}

function removeRemotePlayer(playerId) {
  if (remotePlayerModels[playerId]) {
    
    const modelToRemove = remotePlayerModels[playerId];
    scene.remove(modelToRemove);
    
    if (remotePlayerMixers[playerId]) {
      remotePlayerMixers[playerId].mixer.uncacheRoot(remotePlayerMixers[playerId].mixer.getRoot());
      delete remotePlayerMixers[playerId];
    }
    
    if (modelToRemove.isObject3D) {
      modelToRemove.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

    const remoteModel = remotePlayerModels[playerId];
    if (remoteModel) {
      const nameTag = remoteModel.getObjectByName('nameTag');
      if (nameTag) {
        remoteModel.remove(nameTag);
        disposeNameTag(nameTag);
      }
    }
    
    delete remotePlayerModels[playerId];
    delete remotePlayers[playerId];
    renderer.renderLists.dispose();
  }
}

function showSpeechBubble(playerModel, text) {
  document.querySelectorAll('.speech-bubble').forEach(bubble => {
    if (bubble.dataset.player === playerModel.uuid) {
      bubble.remove();
    }
  });

  const bubble = document.createElement("div");
  bubble.className = "speech-bubble";
  bubble.dataset.player = playerModel.uuid;
  const content = document.createElement("div");
  content.className = "bubble-content";
  content.innerText = text;
  const tail = document.createElement("div");
  tail.className = "bubble-tail";
  bubble.appendChild(content);
  bubble.appendChild(tail);
  document.body.appendChild(bubble);

  if (playerModel === model) {
    bubble.classList.add("highlight");
  }

  const duration = 5000;
  const start = Date.now();

  function update() {
    const pos = new THREE.Vector3();
    playerModel.getWorldPosition(pos);
    
    pos.y += 1.34;

    const projected = pos.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    const bubbleWidth = bubble.offsetWidth;
    const bubbleHeight = bubble.offsetHeight;
    
    let finalX = x - bubbleWidth / 2;
    let finalY = y - bubbleHeight - 10;

    finalX = Math.max(15, Math.min(finalX, window.innerWidth - bubbleWidth - 15));
    finalY = Math.max(15, Math.min(finalY, window.innerHeight - bubbleHeight - 15));

    bubble.style.left = `${finalX}px`;
    bubble.style.top = `${finalY}px`;

    const tailX = x - finalX;
    tail.style.left = `${tailX}px`;

    if (Date.now() - start < duration) {
      requestAnimationFrame(update);
    } else {
      bubble.style.opacity = '0';
      bubble.style.transform = 'translateY(-15px) scale(0.85)';
      setTimeout(() => bubble.remove(), 300);
    }
  }

  update();
}

function setupPostProcessing() {
  composer = new EffectComposer(renderer);
  
  const renderScene = new RenderPass(scene, camera);
  composer.addPass(renderScene);

  const colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
  colorCorrectionPass.uniforms['powRGB'].value.set(1.1, 1.1, 1.1);
  colorCorrectionPass.uniforms['mulRGB'].value.set(1.1, 1.1, 1.1);
  colorCorrectionPass.uniforms['addRGB'].value.set(0.02, 0.02, 0.02);
  composer.addPass(colorCorrectionPass);

  const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
  outlinePass.edgeStrength = 1.0;
  outlinePass.edgeGlow = 0.3;
  outlinePass.edgeThickness = 1.0;
  outlinePass.pulsePeriod = 0;
  outlinePass.visibleEdgeColor.set(0x000000);
  outlinePass.hiddenEdgeColor.set(0x222222);
  composer.addPass(outlinePass);

  const vignettePass = new ShaderPass(VignetteShader);
  vignettePass.uniforms['offset'].value = 0.9;
  vignettePass.uniforms['darkness'].value = 0.3;
  composer.addPass(vignettePass);
}

function updatePlayerPosition() {
  const now = Date.now();
  if (now - lastUpdateTime > 100) {
    lastUpdateTime = now;
    
    if (model && playerBody && myPlayerId) {
      const displayName = playerName || (model.userData.characterType === 'female' ? 'Exploradora' : 'Explorador');
      
      const currentColors = { ...myPlayerColors };
      
      const playerData = {
        position: {
          x: playerBody.position.x,
          y: playerBody.position.y,
          z: playerBody.position.z
        },
        rotation: model.rotation.y,
        currentAnimation: activeAction ? activeAction.getClip().name : 'idle',
        characterType: model.userData.characterType,
        name: playerName,
        colors: currentColors,
        timestamp: Date.now()
      };
      
      if (typeof playerData.name === 'undefined') {
        console.error("Nombre no definido, usando valor por defecto");
        playerData.name = displayName;
      }
      
      queuePlayerUpsert(playerData);
    }
  }
}

// Funciones para gestionar la caché
async function clearModelCache() {
  try {
    await gltfLoader.clearCache();
  } catch (error) {
    console.error('Error limpiando caché:', error);
  }
}

async function getCacheInfo() {
  try {
    const info = await gltfLoader.getCacheInfo();
    return info;
  } catch (error) {
    console.error('Error obteniendo info de caché:', error);
    return null;
  }
}

function setupCacheUI() {
  const clearCacheBtn = document.createElement('button');
  clearCacheBtn.textContent = '🗑️ Limpiar Caché';
  clearCacheBtn.style.position = 'fixed';
  clearCacheBtn.style.top = '10px';
  clearCacheBtn.style.right = '10px';
  clearCacheBtn.style.zIndex = '1000';
  clearCacheBtn.style.padding = '5px 10px';
  clearCacheBtn.style.background = '#ff4444';
  clearCacheBtn.style.color = 'white';
  clearCacheBtn.style.border = 'none';
  clearCacheBtn.style.borderRadius = '5px';
  clearCacheBtn.style.cursor = 'pointer';
  clearCacheBtn.style.fontSize = '12px';
  
  clearCacheBtn.addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que quieres limpiar la caché de modelos?')) {
      await clearModelCache();
      alert('Caché limpiada correctamente');
    }
  });
  
  document.body.appendChild(clearCacheBtn);
}

async function startExperience(characterType, name, colors = null) {
  if (experienciaIniciada) {
    console.warn('La experiencia ya se está iniciando o se encuentra activa');
    return;
  }

  experienciaIniciada = true;

  try {
    const transitionScreen = document.getElementById('transition-screen');
    if (transitionScreen?.classList) {
      transitionScreen.classList.remove('hidden');
    }
    
    updateTransitionProgress(0.1);
    
    playerName = name || (characterType === 'female' ? 'Exploradora' : 'Explorador');

    if (colors) {
      myPlayerColors = { ...colors };

      const cleanedColors = {};
      for (const part in colors) {
        let color = colors[part];
        if (color && typeof color === 'string') {
          if (color.startsWith('#')) {
            color = color.substring(0, 7); 
          } else {
            color = '#' + color.substring(0, 6);
          }
          cleanedColors[part] = color;
        }
      }
      
      localStorage.setItem('characterColors', JSON.stringify(cleanedColors));
    } else {
      try {
        const savedColors = localStorage.getItem('characterColors');
        if (savedColors) {
          myPlayerColors = JSON.parse(savedColors);
        }
      } catch (e) {
        console.error("Error cargando colores guardados:", e);
        myPlayerColors = {
          cabello: '#030d17',
          camisa: '#a7a7a7',
          ojos: '#000000',
          pantalon: '#2c3e50',
          piel: '#f499b3',
          zapatos: '#1a1a1a'
        };
      }
    }
    
    
    audioManager.init();
    audioManager.safePlay();
    
    await Promise.all([
      cargarEscenario(),
      cargarPersonaje(characterType, colors)
    ]);
    
    updateTransitionProgress(1.0);
    setTimeout(() => {
      if (transitionScreen?.classList) {
        transitionScreen.classList.add('hidden');
      }
      
      const chatToggle = document.getElementById('chat-toggle');
      if (chatToggle) {
        chatToggle.classList.remove('hidden');
        chatToggle.style.display = 'flex';
      }

  if (fullscreenManager) {
    fullscreenManager.show();
  }
  
      
      initMultiplayer();
      setupPostProcessing();
      animate();
    }, 500);
  } catch (error) {
    experienciaIniciada = false;
    console.error('Error starting experience:', error);
    const transitionScreen = document.getElementById('transition-screen');
    if (transitionScreen) {
      transitionScreen.innerHTML = '<p class="text-red-500 text-xl">Error al cargar la experiencia. Por favor recarga la página.</p>';
    }
  }
}

const yAxis = new THREE.Vector3(0, 1, 0);
const movementInput = new THREE.Vector3();
const movementDirection = new THREE.Vector3();
const modelMoveDirection = new THREE.Vector3();

function getDirectionVector() {
  movementInput.set(0, 0, 0);

  if (isChatActive()) {
    return movementInput;
  }
  
  if (keys['w']) movementInput.z += 1;
  if (keys['s']) movementInput.z -= 1;
  if (keys['w'] || keys['s']) {
    if (keys['a']) movementInput.x += 1;
    if (keys['d']) movementInput.x -= 1;
  }
  
  return movementInput.normalize();
}

const raycaster = new THREE.Raycaster();
const camOffset = new THREE.Vector3();
const cameraTargetPosition = new THREE.Vector3();
const cameraRayOrigin = new THREE.Vector3();
const cameraRayDirection = new THREE.Vector3();
const cameraLookTarget = new THREE.Vector3();
const cameraIntersections = [];

function updateCamera() {
  if (!model) return;
  
  raycaster.camera = camera;
  const distancia = 2.1;
  const altura = 1.4;
  camOffset.set(0, altura, distancia);
  camOffset.applyAxisAngle(yAxis, cameraYaw);
  cameraTargetPosition.copy(model.position).add(camOffset);
  cameraRayOrigin.copy(model.position);
  cameraRayOrigin.y += altura;
  cameraRayDirection.subVectors(cameraTargetPosition, cameraRayOrigin).normalize();
  
  raycaster.set(cameraRayOrigin, cameraRayDirection);
  
  let cameraHitDistance = distancia;
  if (escenarioModel) {
    cameraIntersections.length = 0;
    raycaster.intersectObject(escenarioModel, true, cameraIntersections);
    for (let i = 0; i < cameraIntersections.length; i++) {
      const hit = cameraIntersections[i];
      if (!hit.object.visible ||
          hit.object.name.toLowerCase().includes('boxman') ||
          hit.object.userData?.isNameTag) {
        continue;
      }

      cameraHitDistance = hit.distance;
      break;
    }
  }

  if (cameraHitDistance < distancia) {
    camera.position.copy(cameraRayDirection)
      .multiplyScalar(Math.max(cameraHitDistance - 0.1, 0.1))
      .add(cameraRayOrigin);
  } else {
    camera.position.copy(cameraTargetPosition);
  }
  cameraLookTarget.copy(model.position);
  cameraLookTarget.x += 0.4;
  cameraLookTarget.y += 1.2;
  camera.lookAt(cameraLookTarget);
}

initAnimationsSystem();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (escenarioCargado && personajeCargado) {
    checkHotspotInteraction(model, keys);
  }
  
  if (!escenarioCargado || !personajeCargado) {
    return;
  }
  
  if (mixer) mixer.update(delta);
  for (const playerId in remotePlayerMixers) {
    remotePlayerMixers[playerId].mixer.update(delta);
  }
  
  if (keys['a']) {
    cameraYaw += delta * 2;
  }

  if (keys['d']) {
    cameraYaw -= delta * 2;
  }

  const move = getDirectionVector();
  const moving = move.lengthSq() > 0;
  const soloRotando = (keys['a'] || keys['d']) && !keys['w'] && !keys['s'];
  
  if (moving && !soloRotando) {
    audioManager.playWalkingSound();
  } else {
    audioManager.stopWalkingSound();
  }
  
  const isRunning = velocidadActual === velocidadCorrer;

  if (moving && !soloRotando) {
    movementDirection.set(0, 0, -1)
      .applyAxisAngle(yAxis, cameraYaw)
      .multiplyScalar(move.z * velocidadActual);
    const currentY = playerBody.velocity.y;
    playerBody.velocity.set(movementDirection.x, currentY, movementDirection.z);

    if (model) {
      modelMoveDirection.copy(movementDirection);
      modelMoveDirection.y = 0;
      modelMoveDirection.normalize();
      if (modelMoveDirection.lengthSq() > 0.0001) {
        const targetYaw = Math.atan2(modelMoveDirection.x, modelMoveDirection.z);
        let currentYaw = model.rotation.y;
        let deltaYaw = targetYaw - currentYaw;
        if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
        if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
        model.rotation.y += deltaYaw * delta * 10;
      }
    }

    if (isRunning) {
      if (activeAction !== actions['sprint']) {
        activeAction?.fadeOut(0.2);
        activeAction = actions['sprint'];
        activeAction?.reset().fadeIn(0.2).play();
      }
    } else {
      if (activeAction !== actions['run']) {
        activeAction?.fadeOut(0.2);
        activeAction = actions['run'];
        activeAction?.reset().fadeIn(0.2).play();
      }
    }
  } else {
    playerBody.velocity.x = 0;
    playerBody.velocity.z = 0;

    if (activeAction !== actions['idle']) {
      activeAction?.fadeOut(0.2);
      activeAction = actions['idle'];
      activeAction?.reset().fadeIn(0.2).play();
    }
  }

  updatePlayerPosition();
  
  for (const id in remotePlayerModels) {
    const remoteModel = remotePlayerModels[id];
    if (remotePlayers[id]?.targetPosition) {
      remoteModel.position.lerp(remotePlayers[id].targetPosition, 0.2);
      remoteModel.rotation.y = THREE.MathUtils.lerp(
        remoteModel.rotation.y,
        remotePlayers[id].targetRotation,
        0.2
      );
    }
  }

  world.step(1 / 60, delta, 3);

  if (model) {
    model.position.set(
      playerBody.position.x,
      playerBody.position.y - 0.75,
      playerBody.position.z
    );
  }

  updateCamera();
  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

async function init() {
  await cargarEscenario();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }
});

let localCleanupStarted = false;

function cleanupLocalSession() {
  if (localCleanupStarted) return;
  localCleanupStarted = true;

  if (inactiveCleanupTimer) {
    clearInterval(inactiveCleanupTimer);
    inactiveCleanupTimer = null;
  }

  if (myPlayerId) {
    // Supabase no tiene onDisconnect() como Firebase RTDB.
    // Intentamos borrar al salir y, si el navegador corta la petición,
    // cleanupInactivePlayers() elimina el registro por heartbeat a los 30 s.
    supabaseClient
      .from(PLAYERS_TABLE)
      .delete()
      .eq('id', myPlayerId)
      .then(({ error }) => {
        if (error) console.error('Error al eliminar jugador:', error);
      });
  }

  if (playersChannel) supabaseClient.removeChannel(playersChannel);
  if (chatChannel) supabaseClient.removeChannel(chatChannel);

  Object.keys(remotePlayerModels).forEach(removeRemotePlayer);
  audioManager.dispose();
}

window.addEventListener('pagehide', cleanupLocalSession);
window.addEventListener('beforeunload', cleanupLocalSession);

init();
