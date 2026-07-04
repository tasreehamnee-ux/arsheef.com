// ============================================
// خدمة API للتواصل مع قاعدة البيانات والخادم
// ============================================

class APIService {
    constructor(config = API_CONFIG) {
        this.config = config;
        this.isOnline = navigator.onLine;
        this.queue = [];
        this.syncing = false;
        
        // مراقبة الاتصال بالإنترنت
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    // ============ إدارة الاتصال بالإنترنت ============
    
    handleOnline() {
        this.isOnline = true;
        console.log('✅ متصل بالإنترنت - بدء المزامنة...');
        this.syncQueue();
    }

    handleOffline() {
        this.isOnline = false;
        console.log('❌ غير متصل بالإنترنت - الحفظ محليًا');
    }

    // ============ الطلبات الأساسية ============
    
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.config.BASE_URL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.API_KEY}`,
            ...options.headers
        };

        const config = {
            method,
            headers,
            timeout: this.config.TIMEOUT
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {
            if (this.isOnline) {
                const response = await fetch(url, config);
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }
                
                const result = await response.json();
                return { success: true, data: result };
            } else {
                throw new Error('No internet connection');
            }
        } catch (error) {
            console.error('Request failed:', error);
            
            if (method !== 'GET') {
                this.queue.push({ method, endpoint, data, timestamp: Date.now() });
                console.log('📋 تمت إضافة الطلب إلى قائمة الانتظار');
            }
            
            return { success: false, error: error.message };
        }
    }

    // ============ عمليات الكتب الصادرة ============
    
    async getOutgoingBooks(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return this.request('GET', `${ENDPOINTS.OUTGOING.LIST}?${query}`);
    }

    async createOutgoingBook(bookData) {
        return this.request('POST', ENDPOINTS.OUTGOING.CREATE, bookData);
    }

    async updateOutgoingBook(bookId, bookData) {
        const endpoint = ENDPOINTS.OUTGOING.UPDATE.replace(':id', bookId);
        return this.request('PUT', endpoint, bookData);
    }

    async deleteOutgoingBook(bookId) {
        const endpoint = ENDPOINTS.OUTGOING.DELETE.replace(':id', bookId);
        return this.request('DELETE', endpoint);
    }

    async exportOutgoingBooks(format = 'pdf') {
        return this.request('GET', `${ENDPOINTS.OUTGOING.EXPORT}?format=${format}`);
    }

    // ============ عمليات الكتب الواردة ============
    
    async getIncomingBooks(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return this.request('GET', `${ENDPOINTS.INCOMING.LIST}?${query}`);
    }

    async createIncomingBook(bookData) {
        return this.request('POST', ENDPOINTS.INCOMING.CREATE, bookData);
    }

    async updateIncomingBook(bookId, bookData) {
        const endpoint = ENDPOINTS.INCOMING.UPDATE.replace(':id', bookId);
        return this.request('PUT', endpoint, bookData);
    }

    async deleteIncomingBook(bookId) {
        const endpoint = ENDPOINTS.INCOMING.DELETE.replace(':id', bookId);
        return this.request('DELETE', endpoint);
    }

    // ============ المزامنة والمزامنة مع Fabres ============
    
    async syncQueue() {
        if (this.syncing || this.queue.length === 0) return;
        
        this.syncing = true;
        console.log(`🔄 بدء مزامنة ${this.queue.length} عنصر...`);
        
        const failedItems = [];
        
        for (const item of this.queue) {
            const result = await this.request(item.method, item.endpoint, item.data);
            
            if (!result.success) {
                failedItems.push(item);
            }
        }
        
        this.queue = failedItems;
        this.syncing = false;
        
        console.log(`✅ انتهت المزامنة. عدد العناصر المتبقية: ${this.queue.length}`);
    }

    async syncWithFabres() {
        if (!FABRES_CONFIG.ENABLED) return;
        
        console.log('🔄 مزامنة مع Fabres...');
        
        try {
            const outgoing = db.getOutgoing();
            const incoming = db.getIncoming();
            
            if (FABRES_CONFIG.SYNC_OUTGOING && outgoing.length > 0) {
                await this.request('POST', '/fabres/sync/outgoing', { books: outgoing });
            }
            
            if (FABRES_CONFIG.SYNC_INCOMING && incoming.length > 0) {
                await this.request('POST', '/fabres/sync/incoming', { books: incoming });
            }
            
            console.log('✅ تمت المزامنة مع Fabres بنجاح');
            return true;
        } catch (error) {
            console.error('❌ خطأ في مزامنة Fabres:', error);
            return false;
        }
    }

    backupToLocalStorage() {
        if (STORAGE_CONFIG.USE_LOCAL_STORAGE_BACKUP) {
            const backup = {
                outgoing: db.getOutgoing(),
                incoming: db.getIncoming(),
                messages: db.getMessages(),
                departments: db.getDepartments(),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('system_backup', JSON.stringify(backup));
        }
    }

    restoreFromLocalStorage() {
        const backup = localStorage.getItem('system_backup');
        if (backup) {
            try {
                const data = JSON.parse(backup);
                console.log('✅ تمت استعادة البيانات من النسخة الاحتياطية');
                return data;
            } catch (error) {
                console.error('❌ خطأ في استعادة النسخة الاحتياطية:', error);
                return null;
            }
        }
    }
}

const apiService = new APIService();

if (STORAGE_CONFIG.AUTO_SYNC) {
    setInterval(() => {
        apiService.syncQueue();
        apiService.backupToLocalStorage();
    }, STORAGE_CONFIG.SYNC_INTERVAL);
}

setInterval(() => {
    if (navigator.onLine) {
        apiService.syncWithFabres();
    }
}, 30 * 60 * 1000);