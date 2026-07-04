# 📚 دليل التكامل مع قاعدة البيانات و Fabres

## 🎯 نظرة عامة

يوفر هذا النظام تكاملاً كاملاً مع:
- **قاعدة بيانات محلية** (MongoDB/MySQL)
- **نظام Fabres** للمراسلات الحكومية
- **المزامنة التلقائية** بين الأنظمة
- **النسخ الاحتياطية** المحلية

---

## 🔄 آلية المزامنة

### عند الاتصال بالإنترنت:
```
البيانات المحلية → API الخادم → قاعدة البيانات
                  ↓
            Fabres API (اختياري)
```

### عند قطع الاتصال:
```
البيانات المحلية → قائمة الانتظار → LocalStorage
            ↓
        عند الاتصال → المزامنة التلقائية
```

---

## 📝 خطوات التكامل

### 1. إضافة مكتبات الواجهة الأمامية

أضف هذه السطور في `<head>` من `index.html`:

```html
<script src="config.js"></script>
<script src="api-service.js"></script>
```

### 2. تحديث دوال الحفظ

**قبل:**
```javascript
function saveOutgoingBook() {
    const book = { /* ... */ };
    db.addOutgoing(book);
}
```

**بعد:**
```javascript
async function saveOutgoingBook() {
    const book = { /* ... */ };
    const result = await apiService.createOutgoingBook(book);
    
    if (result.success) {
        alert('✅ تم الحفظ بنجاح');
        refreshOutgoingList();
    } else {
        alert('⚠️ سيتم الحفظ محليًا وسيتم المزامنة عند الاتصال');
        db.addOutgoing(book);
    }
}
```

### 3. إضافة مراقبة الاتصال

```javascript
window.addEventListener('online', () => {
    console.log('✅ تم استعادة الاتصال');
    apiService.syncQueue();
});

window.addEventListener('offline', () => {
    console.log('❌ تم قطع الاتصال');
});
```

---

## 🧪 الاختبار

### اختبار محلي:

```bash
# بدء الخادم
cd backend
node server.js

# في المتصفح
http://localhost:3000
```

### اختبار المزامنة:

```javascript
// في console المتصفح
await apiService.syncWithFabres();
console.log('Queue:', apiService.queue);
```

---

## ⚙️ تكوين Fabres

### الحصول على بيانات الاعتماد:

1. تسجيل الدخول إلى Fabres Admin
2. توليد API Key
3. تحديث ملف `.env`:

```env
FABRES_USERNAME=your_username
FABRES_PASSWORD=your_password
FABRES_API_KEY=your_api_key
```

### مثال على المزامنة:

```javascript
const fabresService = {
    async syncDocuments() {
        const books = db.getOutgoing();
        
        for (const book of books) {
            if (!book.syncedWithFabres) {
                await apiService.request('POST', '/fabres/sync', {
                    document: book,
                    type: 'outgoing'
                });
                
                book.syncedWithFabres = true;
                db.updateOutgoing(book);
            }
        }
    }
};
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: البيانات لم تُحفظ
**الحل:** تحقق من console للأخطاء
```javascript
console.log(apiService.queue); // عرض قائمة الانتظار
```

### المشكلة: المزامنة لا تعمل
**الحل:** تحقق من الاتصال
```javascript
console.log('Online:', navigator.onLine);
console.log('API URL:', API_CONFIG.BASE_URL);
```

### المشكلة: خطأ في Fabres
**الحل:** تحقق من بيانات الاعتماد
```javascript
await apiService.syncWithFabres();
// عرض الأخطاء
```

---

## 📊 مراقبة الأداء

```javascript
// عرض إحصائيات
function showStats() {
    console.log({
        outgoing: db.getOutgoing().length,
        incoming: db.getIncoming().length,
        messages: db.getMessages().length,
        queueSize: apiService.queue.length,
        isOnline: navigator.onLine,
        syncStatus: apiService.syncing ? 'جاري' : 'متوقف'
    });
}

// استدعاء كل 5 دقائق
setInterval(showStats, 5 * 60 * 1000);
```

---

## 📞 الدعم الفني

للمساعدة:
- تحقق من السجلات (Logs)
- اتصل بفريق Support
- شارك screenshots من الأخطاء