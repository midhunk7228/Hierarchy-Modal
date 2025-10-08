export interface Dashboard {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: number;
}

export interface DashboardLayout {
  id: string;
  dashboardId: string;
  navigationPath: string;
  layout: ReactGridLayout.Layout[];
  timestamp: number;
}

class DashboardStorage {
  private dbName = 'DashboardDB';
  private dbVersion = 1;
  private dashboardsStore = 'dashboards';
  private layoutsStore = 'layouts';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.dashboardsStore)) {
          db.createObjectStore(this.dashboardsStore, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(this.layoutsStore)) {
          const store = db.createObjectStore(this.layoutsStore, { keyPath: 'id' });
          store.createIndex('dashboardId', 'dashboardId', { unique: false });
          store.createIndex('dashboardPath', ['dashboardId', 'navigationPath'], { unique: true });
        }
      };
    });
  }

  async getAllDashboards(): Promise<Dashboard[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.dashboardsStore], 'readonly');
      const store = transaction.objectStore(this.dashboardsStore);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const dashboards = request.result as Dashboard[];
        if (dashboards.length === 0) {
          resolve([]);
        } else {
          resolve(dashboards);
        }
      };
    });
  }

  async createDashboard(name: string, isDefault: boolean = false): Promise<Dashboard> {
    if (!this.db) await this.init();

    const dashboard: Dashboard = {
      id: crypto.randomUUID(),
      name,
      isDefault,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.dashboardsStore], 'readwrite');
      const store = transaction.objectStore(this.dashboardsStore);
      const request = store.add(dashboard);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(dashboard);
    });
  }

  async updateDashboard(dashboard: Dashboard): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.dashboardsStore], 'readwrite');
      const store = transaction.objectStore(this.dashboardsStore);
      const request = store.put(dashboard);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteDashboard(dashboardId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.dashboardsStore, this.layoutsStore], 'readwrite');

      const dashboardStore = transaction.objectStore(this.dashboardsStore);
      dashboardStore.delete(dashboardId);

      const layoutStore = transaction.objectStore(this.layoutsStore);
      const index = layoutStore.index('dashboardId');
      const cursorRequest = index.openCursor(IDBKeyRange.only(dashboardId));

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async saveLayout(dashboardId: string, navigationPath: string, layout: ReactGridLayout.Layout[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.layoutsStore], 'readwrite');
      const store = transaction.objectStore(this.layoutsStore);
      const index = store.index('dashboardPath');
      const searchRequest = index.get([dashboardId, navigationPath]);

      searchRequest.onsuccess = () => {
        const existing = searchRequest.result as DashboardLayout | undefined;

        const layoutData: DashboardLayout = {
          id: existing?.id || crypto.randomUUID(),
          dashboardId,
          navigationPath,
          layout,
          timestamp: Date.now()
        };

        const putRequest = store.put(layoutData);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };

      searchRequest.onerror = () => reject(searchRequest.error);
    });
  }

  async getLayout(dashboardId: string, navigationPath: string): Promise<ReactGridLayout.Layout[] | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.layoutsStore], 'readonly');
      const store = transaction.objectStore(this.layoutsStore);
      const index = store.index('dashboardPath');
      const request = index.get([dashboardId, navigationPath]);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as DashboardLayout | undefined;
        resolve(result ? result.layout : null);
      };
    });
  }

  async getAllLayoutsForDashboard(dashboardId: string): Promise<DashboardLayout[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.layoutsStore], 'readonly');
      const store = transaction.objectStore(this.layoutsStore);
      const index = store.index('dashboardId');
      const request = index.getAll(dashboardId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async initializeDefaultDashboard(): Promise<Dashboard> {
    const dashboards = await this.getAllDashboards();

    if (dashboards.length === 0) {
      return await this.createDashboard('My Dashboard', true);
    }

    return dashboards.find(d => d.isDefault) || dashboards[0];
  }
}

export const dashboardStorage = new DashboardStorage();
