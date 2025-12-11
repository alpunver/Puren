const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const app = express();

// Veritabanı Bağlantısı ve Kurulumu
const db = new Database('butik.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT
  )
`);

// Ayarlar
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Admin Şifresi (Basit güvenlik)
const ADMIN_PASSWORD = "123";

// --- ROTALAR ---

// 1. Müşteri: Ana Sayfa (Liste)
app.get('/', (req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
    res.render('index', { products });
});

// 2. Müşteri: Ürün Detay (QR Hedefi)
app.get('/product/:id', (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.send('Ürün bulunamadı.');
    res.render('product', { product });
});

// 3. Admin: Panel Giriş ve Listeleme
app.get('/admin', (req, res) => {
    // Gerçek bir projede burada session/cookie kontrolü yapılır.
    // Şimdilik URL'den şifre kontrolü veya login sayfası atlıyoruz, direkt panel.
    const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
    // Tam site URL'ini al (QR için)
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    res.render('admin', { products, baseUrl, error: null });
});

// 4. Admin: Ürün Ekleme
app.post('/admin/add', (req, res) => {
    const { name, price, description, password } = req.body;
    if(password !== ADMIN_PASSWORD) return res.send("Hatalı Şifre!");

    const stmt = db.prepare('INSERT INTO products (name, price, description) VALUES (?, ?, ?)');
    stmt.run(name, price, description);
    res.redirect('/admin');
});

// 5. Admin: Ürün Silme
app.post('/admin/delete', (req, res) => {
    const { id, password } = req.body;
    if(password !== ADMIN_PASSWORD) return res.send("Hatalı Şifre!");

    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(id);
    res.redirect('/admin');
});

// Sunucuyu Başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});