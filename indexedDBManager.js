// indexedDBManager.js
export class IndexedDBManager {
  constructor() {
    this.dbName = 'ModelCacheDB';
    this.version = 1;
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

  async clearOldModels(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 días por defecto
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