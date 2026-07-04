# دليل إعداد الخادم وقاعدة البيانات

## 📋 المتطلبات

- **Node.js** (v14 أو أعلى)
- **npm** أو **yarn**
- **قاعدة البيانات**: MongoDB أو MySQL أو PostgreSQL
- **Fabres** (اختياري للتكامل)

---

## 🗂️ هيكل المشروع المقترح

```
arsheef-project/
├── frontend/                 # الموقع الأمامي (HTML/CSS/JS الحالي)
│   ├── index.html
│   ├── config.js
│   ├── api-service.js
│   └── ...
├── backend/                  # الخادم الخلفي
│   ├── server.js
│   ├── package.json
│   ├── config/
│   │   ├── database.js
│   │   └── fabres.js
│   ├── routes/
│   │   ├── books.js
│   │   ├── messages.js
│   │   ├── departments.js
│   │   └── sync.js
│   ├── models/
│   │   ├── Book.js
│   │   ├── Message.js
│   │   └── Department.js
│   ├── controllers/
│   │   ├── bookController.js
│   │   ├── messageController.js
│   │   └── departmentController.js
│   └── middleware/
│       ├── auth.js
│       └── errorHandler.js
└── README.md
```

---

## 🚀 خطوات الإعداد

### 1. إنشاء مشروع Node.js جديد

```bash
mkdir arsheef-backend
cd arsheef-backend
npm init -y
```

### 2. تثبيت المكتبات المطلوبة

```bash
npm install express cors dotenv mongoose
npm install axios body-parser helmet
npm install --save-dev nodemon
```

### 3. ملف `package.json`

```json
{
  "name": "arsheef-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "mongoose": "^7.0.0",
    "axios": "^1.3.0",
    "body-parser": "^1.20.2",
    "helmet": "^7.0.0"
  }
}
```

### 4. ملف `.env`

```
# قاعدة البيانات
MONGODB_URI=mongodb://localhost:27017/arsheef
# أو
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=arsheef

# الخادم
PORT=3000
NODE_ENV=development

# Fabres Integration
FABRES_ENABLED=true
FABRES_API_URL=https://your-fabres-instance.com/api
FABRES_USERNAME=admin@fabres.com
FABRES_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key_here
```

### 5. ملف `server.js`

```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const helmet = require('helmet');

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arsheef', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ متصل بقاعدة البيانات'))
.catch(err => console.error('❌ خطأ في الاتصال:', err));

// Routes
app.use('/api/books', require('./routes/books'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/sync', require('./routes/sync'));

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: err.message 
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على: http://localhost:${PORT}`);
});
```

---

## 🗄️ نماذج قاعدة البيانات (MongoDB)

### Book Model

```javascript
// models/Book.js
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    number: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    subject: { type: String, required: true },
    content: String,
    priority: { type: String, enum: ['عادي', 'عاجل', 'سري'], default: 'عادي' },
    type: { type: String, enum: ['outgoing', 'incoming'], required: true },
    
    // للكتب الصادرة
    recipient: String,
    
    // للكتب الواردة
    sender: String,
    receivedDate: Date,
    
    // المرفقات
    attachment: {
        name: String,
        url: String,
        type: String,
        size: Number
    },
    
    // البيانات الوصفية
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    syncedWithFabres: { type: Boolean, default: false }
});

module.exports = mongoose.model('Book', bookSchema);
```

---

## 🔗 التكامل مع Fabres

### في `config/fabres.js`

```javascript
const axios = require('axios');

class FabresService {
    constructor() {
        this.baseURL = process.env.FABRES_API_URL;
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000
        });
    }

    async authenticate() {
        try {
            const response = await this.client.post('/auth/login', {
                username: process.env.FABRES_USERNAME,
                password: process.env.FABRES_PASSWORD
            });
            return response.data.token;
        } catch (error) {
            console.error('❌ خطأ في المصادقة مع Fabres:', error);
            return null;
        }
    }

    async syncOutgoing(books, token) {
        try {
            const response = await this.client.post('/documents/outgoing/sync', 
                { books },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return response.data;
        } catch (error) {
            console.error('❌ خطأ في مزامنة الكتب الصادرة:', error);
            return null;
        }
    }

    async syncIncoming(books, token) {
        try {
            const response = await this.client.post('/documents/incoming/sync',
                { books },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return response.data;
        } catch (error) {
            console.error('❌ خطأ في مزامنة الكتب الواردة:', error);
            return null;
        }
    }
}

module.exports = new FabresService();
```

---

## 🔌 API Endpoints

### الكتب الصادرة

```
GET    /api/books/outgoing              - قائمة الكتب
POST   /api/books/outgoing              - إنشاء كتاب جديد
GET    /api/books/outgoing/:id          - تفاصيل كتاب
PUT    /api/books/outgoing/:id          - تحديث كتاب
DELETE /api/books/outgoing/:id          - حذف كتاب
GET    /api/books/outgoing/export       - تصدير الكتب
```

### الكتب الواردة

```
GET    /api/books/incoming              - قائمة الكتب
POST   /api/books/incoming              - إنشاء كتاب جديد
GET    /api/books/incoming/:id          - تفاصيل كتاب
PUT    /api/books/incoming/:id          - تحديث كتاب
DELETE /api/books/incoming/:id          - حذف كتاب
```

### المزامنة

```
POST   /api/sync/fabres                 - مزامنة مع Fabres
POST   /api/sync/backup                 - نسخة احتياطية
GET    /api/sync/status                 - حالة المزامنة
```

---

## 📱 استخدام في الواجهة الأمامية

### تحديث `config.js`

```javascript
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api',
    API_KEY: 'your-api-key',
    TIMEOUT: 30000
};
```

### استخدام API Service

```javascript
// إنشاء كتاب جديد
const newBook = await apiService.createOutgoingBook({
    number: '2024/001',
    date: '2024-01-15',
    subject: 'موضوع الكتاب',
    recipient: 'جهة الاستقبال',
    priority: 'عادي'
});

// الحصول على قائمة الكتب
const books = await apiService.getOutgoingBooks();

// مزامنة مع Fabres
await apiService.syncWithFabres();
```

---

## 🔒 الأمان

1. استخدم HTTPS في الإنتاج
2. قم بتفعيل JWT Authentication
3. استخدم متغيرات البيئة للمفاتيح السرية
4. قم بتفعيل CORS بشكل صحيح
5. استخدم helmet للحماية من الهجمات

---

## 🚀 النشر

### على Heroku

```bash
heroku login
heroku create your-app-name
git push heroku main
```

### على خادم VPS

```bash
ssh user@your-server.com
cd /var/www/arsheef
npm install
npm start
```

---

## 📞 الدعم والمساعدة

للمزيد من المعلومات، راجع:
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)
- [Fabres API Docs](https://fabres.example.com/docs)
