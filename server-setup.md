# 🚀 دليل إعداد الخادم وقاعدة البيانات

## 📋 المتطلبات

- **Node.js** (v14 أو أعلى)
- **npm** أو **yarn**
- **قاعدة البيانات**: MongoDB أو MySQL أو PostgreSQL
- **Fabres** (اختياري للتكامل)

---

## 🗂️ هيكل المشروع المقترح

```
arsheef-project/
├── frontend/                 # الموقع الأمامي
│   ├── index.html
│   ├── config.js
│   ├── api-service.js
│   └── ...
├── backend/                  # الخادم الخلفي
│   ├── server.js
│   ├── package.json
│   ├── .env
│   ├── routes/
│   ├── models/
│   └── controllers/
└── README.md
```

---

## 🚀 خطوات الإعداد

### 1. إنشاء مشروع Node.js

```bash
mkdir arsheef-backend && cd arsheef-backend
npm init -y
```

### 2. تثبيت المكتبات

```bash
npm install express cors dotenv mongoose axios body-parser helmet
npm install --save-dev nodemon
```

### 3. إنشاء ملف `.env`

```env
MONGODB_URI=mongodb://localhost:27017/arsheef
PORT=3000
NODE_ENV=development

FABRES_ENABLED=true
FABRES_API_URL=https://your-fabres-instance.com/api
FABRES_USERNAME=admin@fabres.com
FABRES_PASSWORD=your_password

JWT_SECRET=your_secret_key_here
```

### 4. ملف `server.js`

```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const helmet = require('helmet');

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arsheef')
    .then(() => console.log('✅ Connected to Database'))
    .catch(err => console.error('❌ Connection Error:', err));

app.use('/api/books', require('./routes/books'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/departments', require('./routes/departments'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
});
```

---

## 🔌 API Endpoints

### الكتب الصادرة
```
GET    /api/books/outgoing
POST   /api/books/outgoing
PUT    /api/books/outgoing/:id
DELETE /api/books/outgoing/:id
```

### الكتب الواردة
```
GET    /api/books/incoming
POST   /api/books/incoming
PUT    /api/books/incoming/:id
DELETE /api/books/incoming/:id
```

### المزامنة مع Fabres
```
POST   /api/sync/fabres
GET    /api/sync/status
```

---

## 📱 الاستخدام في الواجهة الأمامية

```javascript
// إنشاء كتاب جديد
const result = await apiService.createOutgoingBook({
    number: '2024/001',
    date: '2024-01-15',
    subject: 'موضوع الكتاب',
    recipient: 'جهة الاستقبال',
    priority: 'عادي'
});

// المزامنة مع Fabres
await apiService.syncWithFabres();
```

---

## 🔒 الأمان

1. استخدم HTTPS في الإنتاج
2. فعّل JWT Authentication
3. استخدم متغيرات البيئة للمفاتيح السرية
4. فعّل CORS بشكل صحيح
5. استخدم helmet للحماية