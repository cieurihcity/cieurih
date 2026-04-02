const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const initSQL = require('sql.js');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 8080;
const DB_PATH = path.join(__dirname, 'database', 'desa.db');

let db;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: 'kp-cipas-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// --- Multer (file upload) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Helper: save DB to disk
function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// === PUBLIC API ===

// Profil desa
app.get('/api/profil', (req, res) => {
  try {
    const profil = db.exec('SELECT * FROM profil_desa LIMIT 1');
    const dusun = db.exec('SELECT * FROM dusun ORDER BY nama');
    const pekerjaan = db.exec('SELECT * FROM mata_pencaharian ORDER BY jumlah DESC');
    res.json({
      profil: profil[0]?.values?.[0] ? zipRow(profil[0]) : null,
      dusun: dusun[0] ? zipRows(dusun[0]) : [],
      pekerjaan: pekerjaan[0] ? zipRows(pekerjaan[0]) : []
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Statistik
app.get('/api/statistik', (req, res) => {
  try {
    const result = db.exec('SELECT * FROM statistik');
    res.json(result[0] ? zipRows(result[0]) : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Berita
app.get('/api/berita', (req, res) => {
  try {
    const { kategori } = req.query;
    let sql = 'SELECT b.*, k.nama as kategori_nama FROM berita b LEFT JOIN kategori_berita k ON b.kategori_id = k.id';
    if (kategori) sql += ` WHERE k.nama = '${kategori}'`;
    sql += ' ORDER BY b.tanggal DESC';
    const result = db.exec(sql);
    res.json(result[0] ? zipRows(result[0]) : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/berita/:id', (req, res) => {
  try {
    const result = db.exec(`SELECT b.*, k.nama as kategori_nama FROM berita b LEFT JOIN kategori_berita k ON b.kategori_id = k.id WHERE b.id = ${req.params.id}`);
    res.json(result[0] ? zipRow(result[0]) : null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Galeri
app.get('/api/galeri', (req, res) => {
  try {
    const result = db.exec('SELECT * FROM galeri ORDER BY id DESC');
    res.json(result[0] ? zipRows(result[0]) : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Layanan
app.get('/api/layanan', (req, res) => {
  try {
    const layanan = db.exec('SELECT * FROM layanan ORDER BY id');
    const persyaratan = db.exec('SELECT * FROM persyaratan_layanan ORDER BY layanan_id, id');
    const layananData = layanan[0] ? zipRows(layanan[0]) : [];
    const persyaratanData = persyaratan[0] ? zipRows(persyaratan[0]) : [];
    layananData.forEach(l => {
      l.persyaratan = persyaratanData.filter(p => p.layanan_id === l.id);
    });
    res.json(layananData);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Perangkat
app.get('/api/perangkat', (req, res) => {
  try {
    const perangkat = db.exec('SELECT * FROM perangkat_desa ORDER BY urutan');
    const bpd = db.exec('SELECT * FROM bpd ORDER BY urutan');
    res.json({
      perangkat: perangkat[0] ? zipRows(perangkat[0]) : [],
      bpd: bpd[0] ? zipRows(bpd[0]) : []
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Kontak
app.post('/api/kontak', (req, res) => {
  try {
    const { nama, email, telepon, subjek, pesan } = req.body;
    if (!nama || !email || !pesan) return res.status(400).json({ error: 'Field wajib belum lengkap' });
    db.run('INSERT INTO pesan_kontak (nama, email, telepon, subjek, pesan) VALUES (?, ?, ?, ?, ?)',
      [nama, email, telepon || '', subjek || '', pesan]);
    saveDB();
    res.json({ success: true, message: 'Pesan berhasil dikirim' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === AUTH ===
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const result = db.exec(`SELECT * FROM admin_users WHERE username = '${username}'`);
    if (!result[0]) return res.status(401).json({ error: 'Username tidak ditemukan' });
    const user = zipRow(result[0]);
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Password salah' });
    req.session.admin = { id: user.id, username: user.username };
    res.json({ success: true, username: user.username });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.admin) });
});

// === ADMIN API ===

// Dashboard stats
app.get('/api/admin/dashboard', requireAuth, (req, res) => {
  try {
    const berita = db.exec('SELECT COUNT(*) as c FROM berita')[0]?.values[0][0] || 0;
    const galeri = db.exec('SELECT COUNT(*) as c FROM galeri')[0]?.values[0][0] || 0;
    const perangkat = db.exec('SELECT COUNT(*) as c FROM perangkat_desa')[0]?.values[0][0] || 0;
    const pesan = db.exec('SELECT COUNT(*) as c FROM pesan_kontak')[0]?.values[0][0] || 0;
    const pesanBaru = db.exec("SELECT COUNT(*) as c FROM pesan_kontak WHERE dibaca = 0")[0]?.values[0][0] || 0;
    res.json({ berita, galeri, perangkat, pesan, pesanBaru });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CRUD Berita
app.post('/api/admin/berita', requireAuth, upload.single('gambar'), (req, res) => {
  try {
    const { judul, konten, kategori_id } = req.body;
    const gambar = req.file ? '/uploads/' + req.file.filename : '';
    db.run('INSERT INTO berita (judul, konten, gambar, kategori_id, tanggal) VALUES (?, ?, ?, ?, datetime("now"))',
      [judul, konten, gambar, kategori_id || 1]);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/berita/:id', requireAuth, (req, res) => {
  try {
    const { judul, konten, kategori_id } = req.body;
    db.run('UPDATE berita SET judul = ?, konten = ?, kategori_id = ? WHERE id = ?',
      [judul, konten, kategori_id, req.params.id]);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/berita/:id', requireAuth, (req, res) => {
  try {
    db.run(`DELETE FROM berita WHERE id = ${req.params.id}`);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CRUD Galeri
app.post('/api/admin/galeri', requireAuth, upload.single('foto'), (req, res) => {
  try {
    const { judul, keterangan } = req.body;
    const foto = req.file ? '/uploads/' + req.file.filename : '';
    db.run('INSERT INTO galeri (judul, keterangan, foto) VALUES (?, ?, ?)', [judul, keterangan || '', foto]);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/galeri/:id', requireAuth, (req, res) => {
  try {
    db.run(`DELETE FROM galeri WHERE id = ${req.params.id}`);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CRUD Perangkat
app.post('/api/admin/perangkat', requireAuth, (req, res) => {
  try {
    const { nama, jabatan, urutan } = req.body;
    db.run('INSERT INTO perangkat_desa (nama, jabatan, urutan) VALUES (?, ?, ?)', [nama, jabatan, urutan || 99]);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/perangkat/:id', requireAuth, (req, res) => {
  try {
    const { nama, jabatan, urutan } = req.body;
    db.run('UPDATE perangkat_desa SET nama = ?, jabatan = ?, urutan = ? WHERE id = ?',
      [nama, jabatan, urutan, req.params.id]);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/perangkat/:id', requireAuth, (req, res) => {
  try {
    db.run(`DELETE FROM perangkat_desa WHERE id = ${req.params.id}`);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update Statistik
app.put('/api/admin/statistik/:id', requireAuth, (req, res) => {
  try {
    const { nilai } = req.body;
    db.run('UPDATE statistik SET nilai = ? WHERE id = ?', [nilai, req.params.id]);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update Profil
app.put('/api/admin/profil', requireAuth, (req, res) => {
  try {
    const { nama, alamat, sejarah, visi, misi } = req.body;
    db.run('UPDATE profil_desa SET nama = ?, alamat = ?, sejarah = ?, visi = ?, misi = ? WHERE id = 1',
      [nama, alamat, sejarah, visi, misi]);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pesan Kontak
app.get('/api/admin/pesan', requireAuth, (req, res) => {
  try {
    const result = db.exec('SELECT * FROM pesan_kontak ORDER BY id DESC');
    res.json(result[0] ? zipRows(result[0]) : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/pesan/:id/baca', requireAuth, (req, res) => {
  try {
    db.run(`UPDATE pesan_kontak SET dibaca = 1 WHERE id = ${req.params.id}`);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/pesan/:id', requireAuth, (req, res) => {
  try {
    db.run(`DELETE FROM pesan_kontak WHERE id = ${req.params.id}`);
    saveDB();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === HELPER: zip sql.js result to objects ===
function zipRow(result) {
  const cols = result.columns;
  const vals = result.values[0];
  const obj = {};
  cols.forEach((c, i) => obj[c] = vals[i]);
  return obj;
}

function zipRows(result) {
  const cols = result.columns;
  return result.values.map(vals => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = vals[i]);
    return obj;
  });
}

// === INIT DB & START ===
async function start() {
  const SQL = await initSQL();

  // Load or create DB
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('📂 Database loaded from', DB_PATH);
  } else {
    console.log('⚠️  Database not found. Run: npm run init-db');
    db = new SQL.Database();
  }

  // 404 catch-all
  app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
  });

  app.listen(PORT, () => {
    console.log(`\n🌐 Website: http://localhost:${PORT}`);
    console.log(`🔧 Admin:   http://localhost:${PORT}/admin.html`);
    console.log(`📡 API:     http://localhost:${PORT}/api/\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
