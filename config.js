// ============================================
// إعدادات الاتصال بقاعدة البيانات
// ============================================

// إعدادات API الرئيسي
const API_CONFIG = {
    // اجعل هذا هو URL الخادم الخاص بك
    BASE_URL: 'http://localhost:3000/api',
    // أو استخدم Fabres API
    FABRES_API_URL: 'https://fabres.example.com/api',
    
    // إعدادات المهلات الزمنية
    TIMEOUT: 30000, // 30 seconds
    
    // مفاتيح الوصول (استبدلها بمفاتيحك الفعلية)
    API_KEY: 'your-api-key-here',
    SECRET_KEY: 'your-secret-key-here'
};

// إعدادات localStorage كنسخة احتياطية
const STORAGE_CONFIG = {
    USE_LOCAL_STORAGE_BACKUP: true,
    SYNC_INTERVAL: 5000, // كل 5 ثوانٍ
    AUTO_SYNC: true
};

// إعدادات Fabres Integration
const FABRES_CONFIG = {
    ENABLED: true,
    ENDPOINT: 'https://your-fabres-instance.com/api',
    USERNAME: 'admin@fabres.com',
    PASSWORD: 'password', // استخدم متغيرات البيئة
    SYNC_OUTGOING: true,
    SYNC_INCOMING: true,
    SYNC_DEPARTMENTS: true
};

// Endpoints
const ENDPOINTS = {
    // الكتب الصادرة
    OUTGOING: {
        LIST: '/books/outgoing',
        CREATE: '/books/outgoing',
        UPDATE: '/books/outgoing/:id',
        DELETE: '/books/outgoing/:id',
        EXPORT: '/books/outgoing/export'
    },
    
    // الكتب الواردة
    INCOMING: {
        LIST: '/books/incoming',
        CREATE: '/books/incoming',
        UPDATE: '/books/incoming/:id',
        DELETE: '/books/incoming/:id',
        EXPORT: '/books/incoming/export'
    },
    
    // الرسائل
    MESSAGES: {
        LIST: '/messages',
        CREATE: '/messages',
        UPDATE: '/messages/:id',
        DELETE: '/messages/:id'
    },
    
    // الدوائر والأقسام
    DEPARTMENTS: {
        LIST: '/departments',
        CREATE: '/departments',
        UPDATE: '/departments/:id',
        DELETE: '/departments/:id'
    },
    
    // المستخدمين
    USERS: {
        LIST: '/users',
        CREATE: '/users',
        UPDATE: '/users/:id',
        DELETE: '/users/:id',
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout'
    },
    
    // البحث والتقارير
    SEARCH: '/search',
    REPORTS: '/reports',
    STATS: '/statistics'
};