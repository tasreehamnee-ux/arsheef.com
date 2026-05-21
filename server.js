const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'mosyr-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(200),
            phone VARCHAR(50),
            head VARCHAR(200),
            username VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(200) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            from_dept INTEGER REFERENCES departments(id),
            to_dept INTEGER REFERENCES departments(id),
            subject VARCHAR(300),
            body TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS outgoing_books (
            id SERIAL PRIMARY KEY,
            dept_id INTEGER REFERENCES departments(id),
            number VARCHAR(100) NOT NULL,
            date DATE,
            subject VARCHAR(500),
            recipient VARCHAR(300),
            content TEXT,
            priority VARCHAR(50) DEFAULT 'عادي',
            status VARCHAR(100) DEFAULT 'مرسل',
            attachment_name VARCHAR(300),
            attachment_type VARCHAR(100),
            attachment_data TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS incoming_books (
            id SERIAL PRIMARY KEY,
            dept_id INTEGER REFERENCES departments(id),
            number VARCHAR(100) NOT NULL,
            date DATE,
            received_date DATE,
            subject VARCHAR(500),
            sender VARCHAR(300),
            content TEXT,
            priority VARCHAR(50) DEFAULT 'عادي',
            status VARCHAR(100) DEFAULT 'جديد',
            attachment_name VARCHAR(300),
            attachment_type VARCHAR(100),
            attachment_data TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    const existing = await pool.query('SELECT COUNT(*) FROM departments');
    if (parseInt(existing.rows[0].count) === 0) {
        const hash = async (pw) => await bcrypt.hash(pw, 10);
        await pool.query(`
            INSERT INTO departments (name, email, phone, head, username, password) VALUES
            ($1,$2,$3,$4,$5,$6),($7,$8,$9,$10,$11,$12),($13,$14,$15,$16,$17,$18),($19,$20,$21,$22,$23,$24),($25,$26,$27,$28,$29,$30)
        `, [
            'قسم التصاريح الأمنية','permits@mosyr.gov','1234','أحمد محمد','permits', await hash('1234'),
            'الشؤون الإدارية','admin@mosyr.gov','1235','خالد علي','admin_dept', await hash('1234'),
            'التخطيط والمتابعة','planning@mosyr.gov','1236','سارة أحمد','planning', await hash('1234'),
            'العلاقات العامة','pr@mosyr.gov','1237','محمد عبدالله','pr', await hash('1234'),
            'مدير النظام','director@mosyr.gov','1000','مدير النظام','admin', await hash('admin123')
        ]);
        console.log('Default departments created');
    }
}

function requireAuth(req, res, next) {
    if (!req.session.deptId) {
        return res.status(401).json({ error: 'غير مسجل دخول' });
    }
    next();
}

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM departments WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        const dept = result.rows[0];
        const valid = await bcrypt.compare(password, dept.password);
        if (!valid) return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        req.session.deptId = dept.id;
        req.session.deptName = dept.name;
        res.json({ success: true, dept: { id: dept.id, name: dept.name, head: dept.head } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/me', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, phone, head, username FROM departments WHERE id = $1', [req.session.deptId]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/departments', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, phone, head FROM departments WHERE id != $1 ORDER BY id', [req.session.deptId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/departments/all', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, phone, head FROM departments ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/messages/:deptId', requireAuth, async (req, res) => {
    try {
        const otherId = parseInt(req.params.deptId);
        const myId = req.session.deptId;
        const result = await pool.query(`
            SELECT m.*, d1.name as from_name, d2.name as to_name
            FROM messages m
            JOIN departments d1 ON m.from_dept = d1.id
            JOIN departments d2 ON m.to_dept = d2.id
            WHERE (m.from_dept = $1 AND m.to_dept = $2) OR (m.from_dept = $2 AND m.to_dept = $1)
            ORDER BY m.created_at ASC
        `, [myId, otherId]);

        await pool.query('UPDATE messages SET is_read = TRUE WHERE to_dept = $1 AND from_dept = $2', [myId, otherId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/messages', requireAuth, async (req, res) => {
    const { to_dept, subject, body } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO messages (from_dept, to_dept, subject, body) VALUES ($1,$2,$3,$4) RETURNING *',
            [req.session.deptId, to_dept, subject || 'رسالة', body]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/messages/unread/count', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM messages WHERE to_dept = $1 AND is_read = FALSE', [req.session.deptId]);
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/books/outgoing', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM outgoing_books WHERE dept_id = $1 ORDER BY created_at DESC', [req.session.deptId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/books/outgoing', requireAuth, async (req, res) => {
    const { number, date, subject, recipient, content, priority, status, attachment } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO outgoing_books (dept_id, number, date, subject, recipient, content, priority, status, attachment_name, attachment_type, attachment_data)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
            [req.session.deptId, number, date, subject, recipient, content, priority || 'عادي', status || 'مرسل',
             attachment ? attachment.name : null, attachment ? attachment.type : null, attachment ? attachment.data : null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/books/outgoing/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM outgoing_books WHERE id = $1 AND dept_id = $2', [req.params.id, req.session.deptId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/books/incoming', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM incoming_books WHERE dept_id = $1 ORDER BY created_at DESC', [req.session.deptId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/books/incoming', requireAuth, async (req, res) => {
    const { number, date, received_date, subject, sender, content, priority, attachment } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO incoming_books (dept_id, number, date, received_date, subject, sender, content, priority, attachment_name, attachment_type, attachment_data)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
            [req.session.deptId, number, date, received_date, subject, sender, content, priority || 'عادي',
             attachment ? attachment.name : null, attachment ? attachment.type : null, attachment ? attachment.data : null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/books/incoming/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM incoming_books WHERE id = $1 AND dept_id = $2', [req.params.id, req.session.deptId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
        const myId = req.session.deptId;
        const out = await pool.query('SELECT COUNT(*) FROM outgoing_books WHERE dept_id = $1', [myId]);
        const inc = await pool.query('SELECT COUNT(*) FROM incoming_books WHERE dept_id = $1', [myId]);
        const msgs = await pool.query('SELECT COUNT(*) FROM messages WHERE to_dept = $1 AND is_read = FALSE', [myId]);

        const recent_out = await pool.query('SELECT *, \'صادر\' as type FROM outgoing_books WHERE dept_id = $1 ORDER BY created_at DESC LIMIT 3', [myId]);
        const recent_in = await pool.query('SELECT *, \'وارد\' as type FROM incoming_books WHERE dept_id = $1 ORDER BY created_at DESC LIMIT 3', [myId]);

        const priorities_out = await pool.query('SELECT priority, COUNT(*) as count FROM outgoing_books WHERE dept_id = $1 GROUP BY priority', [myId]);
        const priorities_in = await pool.query('SELECT priority, COUNT(*) as count FROM incoming_books WHERE dept_id = $1 GROUP BY priority', [myId]);

        const priorities = {};
        [...priorities_out.rows, ...priorities_in.rows].forEach(r => {
            priorities[r.priority] = (priorities[r.priority] || 0) + parseInt(r.count);
        });

        res.json({
            total_outgoing: parseInt(out.rows[0].count),
            total_incoming: parseInt(inc.rows[0].count),
            unread_messages: parseInt(msgs.rows[0].count),
            recent: [...recent_out.rows, ...recent_in.rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
            priorities
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/search', requireAuth, async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ out: [], incoming: [] });
    try {
        const like = `%${q}%`;
        const out = await pool.query(
            'SELECT * FROM outgoing_books WHERE dept_id = $1 AND (number ILIKE $2 OR subject ILIKE $2 OR recipient ILIKE $2)',
            [req.session.deptId, like]
        );
        const inc = await pool.query(
            'SELECT * FROM incoming_books WHERE dept_id = $1 AND (number ILIKE $2 OR subject ILIKE $2 OR sender ILIKE $2)',
            [req.session.deptId, like]
        );
        res.json({ out: out.rows, incoming: inc.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
    app.listen(5000, '0.0.0.0', () => console.log('Server running on port 5000'));
}).catch(err => {
    console.error('DB init error:', err);
    process.exit(1);
});
