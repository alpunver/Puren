const express = require('express');
const { Pool } = require('pg'); // PostgreSQL kütüphanesi
const app = express();

// Veritabanı Bağlantı Ayarı (Render'dan gelen URL'yi kullanır)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Render için gerekli güvenlik ayarı
  }
});

// Tabloyu Oluştur (Eğer yoksa)
pool.query(`
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT
  )
`).catch(err => console.error("Veritabanı hatası:", err));

// Ayarlar
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const ADMIN_PASSWORD = "123";

// --- ROTALAR ---

// 1. Müşteri: Ana Sayfa
app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.render('index', { products: result.rows });
    } catch (err) {
        res.send("Hata: " + err.message);
    }
});

// 2. Müşteri: Ürün Detay
app.get('/product/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.send('Ürün bulunamadı.');
        res.render('product', { product: result.rows[0] });
    } catch (err) {
        res.send("Hata: " + err.message);
    }
});

// 3. Admin: Panel
app.get('/admin', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol; // Render'da https algılamak için
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;
        
        res.render('admin', { products: result.rows, baseUrl, error: null });
    } catch (err) {
        res.send("Admin Paneli Hatası: " + err.message);
    }
});

// 4. Admin: Ekleme
app.post('/admin/add', async (req, res) => {
    const { name, price, description, password } = req.body;
    if(password !== ADMIN_PASSWORD) return res.send("Hatalı Şifre!");

    try {
        await pool.query(
            'INSERT INTO products (name, price, description) VALUES ($1, $2, $3)',
            [name, price, description]
        );
        res.redirect('/admin');
    } catch (err) {
        res.send("Ekleme Hatası: " + err.message);
    }
});

// 5. Admin: Silme
app.post('/admin/delete', async (req, res) => {
    const { id, password } = req.body;
    if(password !== ADMIN_PASSWORD) return res.send("Hatalı Şifre!");

    try {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.redirect('/admin');
    } catch (err) {
        res.send("Silme Hatası: " + err.message);
    }
});

// Sunucuyu Başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor port: ${PORT}`);
});