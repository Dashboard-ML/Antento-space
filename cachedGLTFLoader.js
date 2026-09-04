// cachedGLTFLoader.js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { IndexedDBManager } from './indexedDBManager.js';

export class CachedGLTFLoader {
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
          console.log(`Cargando modelo desde caché: ${url}`);
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
    console.log(`Cargando modelo desde red: ${url}`);
    const loader = new FileLoader();
    loader.setResponseType('arraybuffer');
    
    loader.load(url, async (arrayBuffer) => {
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
    return this.dbManager.clearOldModels(0); // Eliminar todos
  }

  async getCacheInfo() {
    return this.dbManager.getStorageInfo();
  }
}