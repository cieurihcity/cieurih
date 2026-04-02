const initSQL = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'desa.db');

async function initDatabase() {
  const SQL = await initSQL();
  const db = new SQL.Database();

  console.log('🔨 Creating database schema...\n');

  // === SCHEMA ===
  db.run(`
    CREATE TABLE IF NOT EXISTS profil_desa (
      id INTEGER PRIMARY KEY,
      nama TEXT NOT NULL,
      alamat TEXT,
      sejarah TEXT,
      visi TEXT,
      misi TEXT,
      telepon TEXT,
      email TEXT,
      kode_pos TEXT
    );

    CREATE TABLE IF NOT EXISTS statistik (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      nilai INTEGER NOT NULL,
      ikon TEXT,
      satuan TEXT
    );

    CREATE TABLE IF NOT EXISTS perangkat_desa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      jabatan TEXT NOT NULL,
      foto TEXT,
      periode TEXT,
      urutan INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bpd (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      jabatan TEXT NOT NULL,
      foto TEXT,
      urutan INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS kategori_berita (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS berita (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      konten TEXT,
      ringkasan TEXT,
      gambar TEXT,
      kategori_id INTEGER,
      tanggal TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (kategori_id) REFERENCES kategori_berita(id)
    );

    CREATE TABLE IF NOT EXISTS galeri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      keterangan TEXT,
      foto TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS layanan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      deskripsi TEXT,
      ikon TEXT
    );

    CREATE TABLE IF NOT EXISTS persyaratan_layanan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      layanan_id INTEGER,
      persyaratan TEXT NOT NULL,
      FOREIGN KEY (layanan_id) REFERENCES layanan(id)
    );

    CREATE TABLE IF NOT EXISTS pesan_kontak (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      email TEXT NOT NULL,
      telepon TEXT,
      subjek TEXT,
      pesan TEXT NOT NULL,
      dibaca INTEGER DEFAULT 0,
      tanggal TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nama TEXT
    );

    CREATE TABLE IF NOT EXISTS dusun (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      ketua TEXT,
      jumlah_kk INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS mata_pencaharian (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      jumlah INTEGER DEFAULT 0
    );
  `);

  console.log('✅ Schema created\n');

  // === SEED DATA ===
  console.log('🌱 Seeding data...\n');

  // Profil
  db.run(`INSERT INTO profil_desa (id, nama, alamat, sejarah, visi, misi, telepon, email, kode_pos) VALUES (
    1,
    'Kampung Cieurih Pasir',
    'Kampung Cieurih Pasir, Jawa Barat, Indonesia',
    'Kampung Cieurih Pasir merupakan sebuah wilayah yang terletak di Jawa Barat, Indonesia. Kampung ini dikelilingi oleh pemandangan alam yang asri dengan hamparan sawah dan kebun yang hijau. Masyarakat Kampung Cieurih Pasir dikenal dengan semangat gotong royong yang tinggi dan menjunjung nilai-nilai kearifan lokal.',
    'Terwujudnya Kampung Cieurih Pasir yang maju, sejahtera, berbudaya, dan berdaya saing dalam bingkai kebersamaan dan gotong royong.',
    'Meningkatkan kualitas pelayanan publik|Membangun infrastruktur kampung|Meningkatkan kesejahteraan masyarakat|Melestarikan nilai-nilai budaya|Meningkatkan kualitas SDM|Mewujudkan lingkungan yang lestari',
    '(022) 1234-5678',
    'info@kp-cipas.desa.id',
    '40553'
  )`);

  // Statistik
  db.run(`INSERT INTO statistik (label, nilai, ikon, satuan) VALUES
    ('Jumlah Penduduk', 3247, '👥', 'jiwa'),
    ('Kepala Keluarga', 876, '🏠', 'KK'),
    ('Luas Wilayah', 285, '🗺️', 'Ha'),
    ('RT/RW', 12, '🏘️', 'RT/RW')
  `);

  // Perangkat Desa
  db.run(`INSERT INTO perangkat_desa (nama, jabatan, urutan) VALUES
    ('H. Ahmad Sudrajat, S.Pd', 'Kepala Desa', 1),
    ('Asep Suhendar', 'Sekretaris Desa', 2),
    ('Dede Kurniawan', 'Kaur Keuangan', 3),
    ('Siti Nurhalimah', 'Kaur Umum', 4),
    ('Ujang Heri', 'Kasi Pemerintahan', 5),
    ('Rina Agustina', 'Kasi Kesejahteraan', 6),
    ('Yanto Mulyadi', 'Kasi Pelayanan', 7),
    ('Endah Suryani', 'Kepala Dusun I', 8),
    ('Agus Permana', 'Kepala Dusun II', 9),
    ('Nandang Suryana', 'Kepala Dusun III', 10)
  `);

  // BPD
  db.run(`INSERT INTO bpd (nama, jabatan, urutan) VALUES
    ('H. Endang Supriatna', 'Ketua BPD', 1),
    ('Cecep Solihin', 'Wakil Ketua BPD', 2),
    ('Tuti Alawiyah', 'Sekretaris BPD', 3)
  `);

  // Kategori Berita
  db.run(`INSERT INTO kategori_berita (nama) VALUES
    ('Kegiatan'), ('Pemerintahan'), ('Pertanian'), ('Kesehatan'), ('Budaya'), ('Infrastruktur')
  `);

  // Berita
  db.run(`INSERT INTO berita (judul, konten, ringkasan, gambar, kategori_id, tanggal) VALUES
    ('Gotong Royong Membersihkan Lingkungan Kampung', 'Warga Kampung Cieurih Pasir melaksanakan kegiatan gotong royong membersihkan lingkungan secara serentak di seluruh wilayah RT. Kegiatan ini diikuti oleh ratusan warga dari berbagai kalangan usia dan menunjukkan semangat kebersamaan yang kuat.', 'Warga melaksanakan gotong royong membersihkan lingkungan kampung.', 'assets/images/berita-gotong-royong.png', 1, '2026-03-28'),
    ('Musyawarah Perencanaan Pembangunan Kampung', 'Musyawarah perencanaan pembangunan kampung dihadiri oleh seluruh perangkat desa, BPD, dan perwakilan warga untuk membahas rencana pembangunan tahun anggaran 2026-2027. Berbagai usulan pembangunan dari warga dibahas secara musyawarah.', 'Musyawarah perencanaan pembangunan kampung tahun 2026-2027.', 'assets/images/berita-musyawarah.png', 2, '2026-03-25'),
    ('Panen Raya Padi di Lahan Pertanian Kampung', 'Musim panen raya padi di Kampung Cieurih Pasir menghasilkan produksi yang meningkat signifikan dibandingkan tahun lalu berkat program intensifikasi pertanian dan penggunaan bibit unggul.', 'Panen raya padi dengan hasil produksi meningkat signifikan.', 'assets/images/berita-panen.png', 3, '2026-03-20'),
    ('Pelaksanaan Posyandu Rutin Bulan Maret', 'Kegiatan Posyandu rutin melayani pemeriksaan kesehatan balita, ibu hamil, dan lansia. Tercatat 85 balita dan 30 ibu hamil yang hadir.', 'Posyandu rutin melayani 85 balita dan 30 ibu hamil.', 'assets/images/galeri-posyandu.png', 4, '2026-03-15'),
    ('Peringatan Hari Jadi Kampung Cieurih Pasir', 'Peringatan hari jadi kampung dimeriahkan dengan penampilan kesenian tradisional Sunda, perlombaan antar RT, dan acara syukuran bersama.', 'Peringatan hari jadi kampung dengan kesenian dan perlombaan.', 'assets/images/galeri-upacara.png', 5, '2026-03-10'),
    ('Pembangunan Jalan Kampung Ruas Cieurih - Pasir', 'Proyek pembangunan jalan kampung sepanjang 500 meter telah selesai. Jalan baru menghubungkan dusun Cieurih dan Pasir.', 'Pembangunan jalan kampung 500 meter telah selesai.', 'assets/images/galeri-infrastruktur.png', 6, '2026-03-05')
  `);

  // Galeri
  db.run(`INSERT INTO galeri (judul, keterangan, foto) VALUES
    ('Panorama Kampung', 'Pemandangan alam Kampung Cieurih Pasir', 'assets/images/hero-desa.png'),
    ('Gotong Royong', 'Kegiatan gotong royong warga', 'assets/images/berita-gotong-royong.png'),
    ('Musyawarah Desa', 'Musyawarah perencanaan pembangunan', 'assets/images/berita-musyawarah.png'),
    ('Panen Raya', 'Panen padi di lahan pertanian', 'assets/images/berita-panen.png'),
    ('Posyandu', 'Kegiatan posyandu kesehatan', 'assets/images/galeri-posyandu.png'),
    ('Upacara Adat', 'Kesenian dan budaya Sunda', 'assets/images/galeri-upacara.png'),
    ('Infrastruktur', 'Pembangunan jalan kampung', 'assets/images/galeri-infrastruktur.png'),
    ('Kantor Desa', 'Kantor Pemerintahan Kampung Cieurih Pasir', 'assets/images/kantor-desa.png'),
    ('Pasar Desa', 'Aktivitas jual beli di pasar kampung', 'assets/images/pasar-desa.png'),
    ('Masjid Kampung', 'Masjid utama Kampung Cieurih Pasir', 'assets/images/masjid-desa.png')
  `);

  // Layanan
  db.run(`INSERT INTO layanan (nama, deskripsi, ikon) VALUES
    ('Surat Keterangan', 'Pembuatan surat keterangan untuk berbagai keperluan administrasi.', '📄'),
    ('Surat Keterangan Domisili', 'Penerbitan surat keterangan domisili bagi warga.', '📋'),
    ('Pengurusan Kartu Keluarga', 'Pembuatan dan perubahan data Kartu Keluarga.', '👨‍👩‍👧‍👦'),
    ('Surat Pengantar Akta Kelahiran', 'Surat pengantar untuk pembuatan Akta Kelahiran.', '👶'),
    ('Surat Keterangan Usaha', 'Pembuatan surat keterangan usaha untuk pelaku UMKM.', '🏪'),
    ('Surat Keterangan Kematian', 'Pengurusan surat keterangan kematian.', '📝')
  `);

  // Persyaratan
  db.run(`INSERT INTO persyaratan_layanan (layanan_id, persyaratan) VALUES
    (1, 'Fotocopy KTP'), (1, 'Fotocopy Kartu Keluarga'), (1, 'Surat pengantar RT/RW'), (1, 'Pas foto 3x4 (2 lembar)'),
    (2, 'Fotocopy KTP'), (2, 'Fotocopy Kartu Keluarga'), (2, 'Surat pengantar RT/RW'), (2, 'Surat keterangan pindah (jika pendatang)'),
    (3, 'Surat pengantar RT/RW'), (3, 'Fotocopy KTP seluruh anggota keluarga'), (3, 'Fotocopy surat nikah'), (3, 'Fotocopy akta kelahiran'), (3, 'KK lama (untuk perubahan)'),
    (4, 'Surat keterangan lahir dari bidan/RS'), (4, 'Fotocopy KTP kedua orang tua'), (4, 'Fotocopy Kartu Keluarga'), (4, 'Fotocopy surat nikah'), (4, 'Fotocopy KTP 2 orang saksi'),
    (5, 'Fotocopy KTP'), (5, 'Fotocopy Kartu Keluarga'), (5, 'Surat pengantar RT/RW'), (5, 'Pas foto 3x4 (2 lembar)'), (5, 'Keterangan jenis usaha'),
    (6, 'Surat keterangan dari RS/dokter'), (6, 'Fotocopy KTP almarhum/ah'), (6, 'Fotocopy Kartu Keluarga'), (6, 'Fotocopy KTP pelapor'), (6, 'Surat pengantar RT/RW')
  `);

  // Dusun
  db.run(`INSERT INTO dusun (nama, ketua, jumlah_kk) VALUES
    ('Dusun Cieurih', 'Endah Suryani', 245),
    ('Dusun Pasir', 'Agus Permana', 230),
    ('Dusun Sindangsari', 'Nandang Suryana', 210),
    ('Dusun Sukamanah', 'Dadan Hermawan', 191)
  `);

  // Mata Pencaharian
  db.run(`INSERT INTO mata_pencaharian (nama, jumlah) VALUES
    ('Petani', 850),
    ('Buruh Tani', 420),
    ('Pedagang', 310),
    ('Wiraswasta', 280),
    ('PNS/TNI/Polri', 95),
    ('Karyawan Swasta', 520),
    ('Lainnya', 772)
  `);

  // Admin user
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT INTO admin_users (username, password, nama) VALUES ('admin', '${hashedPassword}', 'Administrator')`);

  // Save
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);

  console.log('✅ Database initialized with seed data');
  console.log(`📂 Saved to: ${DB_PATH}`);
  console.log('\n📋 Tables created:');
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  if (tables[0]) {
    tables[0].values.forEach(t => console.log(`   - ${t[0]}`));
  }
  console.log('\n🔐 Admin credentials: admin / admin123\n');

  db.close();
}

initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
