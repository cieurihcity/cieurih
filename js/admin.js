/* ============================================
   ADMIN PANEL — JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const loginScreen = document.getElementById('loginScreen');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const modalOverlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');
  const pageTitle = document.getElementById('pageTitle');

  // Check auth on load
  checkAuth();

  // --- AUTH ---
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        showDashboard();
      }
    } catch (e) { /* not authenticated */ }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        showDashboard();
      } else {
        loginError.textContent = data.error || 'Login gagal';
      }
    } catch (e) {
      loginError.textContent = 'Tidak bisa terhubung ke server';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
  });

  function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'flex';
    loadDashboard();
    loadBerita();
    loadGaleri();
    loadPerangkat();
    loadPesan();
  }

  // --- SIDEBAR NAVIGATION ---
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById(link.dataset.section).classList.add('active');
      pageTitle.textContent = link.textContent.replace(/^[^\s]+\s/, '');
      // Close sidebar on mobile
      sidebar.classList.remove('active');
    });
  });

  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('active'));

  // --- MODAL ---
  function openModal(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modalOverlay.classList.add('active');
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    modalBody.innerHTML = '';
  }

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // --- DASHBOARD ---
  async function loadDashboard() {
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      document.getElementById('totalBerita').textContent = data.berita;
      document.getElementById('totalGaleri').textContent = data.galeri;
      document.getElementById('totalPerangkat').textContent = data.perangkat;
      document.getElementById('totalPesan').textContent = data.pesan;
    } catch (e) { console.error(e); }
  }

  // --- BERITA ---
  async function loadBerita() {
    try {
      const res = await fetch('/api/berita');
      const berita = await res.json();
      const tbody = document.getElementById('beritaTableBody');
      tbody.innerHTML = berita.map(b => `
        <tr>
          <td><strong>${b.judul}</strong></td>
          <td>${b.kategori_nama || '-'}</td>
          <td>${b.tanggal ? new Date(b.tanggal).toLocaleDateString('id-ID') : '-'}</td>
          <td>
            <div class="table-actions">
              <button class="btn-delete" onclick="deleteBerita(${b.id})">Hapus</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) { console.error(e); }
  }

  document.getElementById('addBeritaBtn').addEventListener('click', () => {
    openModal('Tambah Berita', `
      <form id="beritaForm" enctype="multipart/form-data">
        <div class="form-group">
          <label>Judul</label>
          <input type="text" name="judul" required>
        </div>
        <div class="form-group">
          <label>Konten</label>
          <textarea name="konten" rows="5" required></textarea>
        </div>
        <div class="form-group">
          <label>Kategori</label>
          <select name="kategori_id">
            <option value="1">Kegiatan</option>
            <option value="2">Pemerintahan</option>
            <option value="3">Pertanian</option>
            <option value="4">Kesehatan</option>
            <option value="5">Budaya</option>
            <option value="6">Infrastruktur</option>
          </select>
        </div>
        <div class="form-group">
          <label>Gambar</label>
          <input type="file" name="gambar" accept="image/*">
        </div>
        <button type="submit" class="btn-submit">Simpan</button>
      </form>
    `);

    document.getElementById('beritaForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        await fetch('/api/admin/berita', { method: 'POST', body: formData });
        closeModal();
        loadBerita();
        loadDashboard();
      } catch (err) { alert('Gagal menyimpan'); }
    });
  });

  window.deleteBerita = async (id) => {
    if (!confirm('Hapus berita ini?')) return;
    try {
      await fetch(`/api/admin/berita/${id}`, { method: 'DELETE' });
      loadBerita();
      loadDashboard();
    } catch (e) { alert('Gagal menghapus'); }
  };

  // --- GALERI ---
  async function loadGaleri() {
    try {
      const res = await fetch('/api/galeri');
      const galeri = await res.json();
      const grid = document.getElementById('galeriGrid');
      grid.innerHTML = galeri.map(g => `
        <div class="galeri-item">
          <img src="${g.foto}" alt="${g.judul}" loading="lazy">
          <div class="galeri-item-title">${g.judul}</div>
          <div class="galeri-item-actions">
            <button class="btn-delete" onclick="deleteGaleri(${g.id})" style="font-size:0.85rem;">🗑️ Hapus</button>
          </div>
        </div>
      `).join('');
    } catch (e) { console.error(e); }
  }

  document.getElementById('addGaleriBtn').addEventListener('click', () => {
    openModal('Tambah Foto', `
      <form id="galeriForm" enctype="multipart/form-data">
        <div class="form-group">
          <label>Judul</label>
          <input type="text" name="judul" required>
        </div>
        <div class="form-group">
          <label>Keterangan</label>
          <textarea name="keterangan" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>Foto</label>
          <input type="file" name="foto" accept="image/*" required>
        </div>
        <button type="submit" class="btn-submit">Upload</button>
      </form>
    `);

    document.getElementById('galeriForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        await fetch('/api/admin/galeri', { method: 'POST', body: formData });
        closeModal();
        loadGaleri();
        loadDashboard();
      } catch (err) { alert('Gagal upload'); }
    });
  });

  window.deleteGaleri = async (id) => {
    if (!confirm('Hapus foto ini?')) return;
    try {
      await fetch(`/api/admin/galeri/${id}`, { method: 'DELETE' });
      loadGaleri();
      loadDashboard();
    } catch (e) { alert('Gagal menghapus'); }
  };

  // --- PERANGKAT ---
  async function loadPerangkat() {
    try {
      const res = await fetch('/api/perangkat');
      const data = await res.json();
      const tbody = document.getElementById('perangkatTableBody');
      tbody.innerHTML = data.perangkat.map(p => `
        <tr>
          <td><strong>${p.nama}</strong></td>
          <td>${p.jabatan}</td>
          <td>
            <div class="table-actions">
              <button class="btn-delete" onclick="deletePerangkat(${p.id})">Hapus</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) { console.error(e); }
  }

  document.getElementById('addPerangkatBtn').addEventListener('click', () => {
    openModal('Tambah Perangkat', `
      <form id="perangkatForm">
        <div class="form-group">
          <label>Nama</label>
          <input type="text" name="nama" required>
        </div>
        <div class="form-group">
          <label>Jabatan</label>
          <input type="text" name="jabatan" required>
        </div>
        <div class="form-group">
          <label>Urutan</label>
          <input type="number" name="urutan" value="99">
        </div>
        <button type="submit" class="btn-submit">Simpan</button>
      </form>
    `);

    document.getElementById('perangkatForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      try {
        await fetch('/api/admin/perangkat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        closeModal();
        loadPerangkat();
        loadDashboard();
      } catch (err) { alert('Gagal menyimpan'); }
    });
  });

  window.deletePerangkat = async (id) => {
    if (!confirm('Hapus perangkat ini?')) return;
    try {
      await fetch(`/api/admin/perangkat/${id}`, { method: 'DELETE' });
      loadPerangkat();
      loadDashboard();
    } catch (e) { alert('Gagal menghapus'); }
  };

  // --- PESAN ---
  async function loadPesan() {
    try {
      const res = await fetch('/api/admin/pesan');
      const pesan = await res.json();
      const tbody = document.getElementById('pesanTableBody');
      tbody.innerHTML = pesan.map(m => `
        <tr class="${m.dibaca ? '' : 'unread'}">
          <td>${m.nama}${m.dibaca ? '' : '<span class="unread-badge"></span>'}</td>
          <td>${m.email}</td>
          <td>${m.subjek || '-'}</td>
          <td>${m.tanggal ? new Date(m.tanggal).toLocaleDateString('id-ID') : '-'}</td>
          <td>
            <div class="table-actions">
              <button class="btn-view" onclick='viewPesan(${JSON.stringify(m).replace(/'/g, "&#39;")})'>Lihat</button>
              <button class="btn-delete" onclick="deletePesan(${m.id})">Hapus</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) { console.error(e); }
  }

  window.viewPesan = async (m) => {
    if (!m.dibaca) {
      await fetch(`/api/admin/pesan/${m.id}/baca`, { method: 'PUT' });
      loadPesan();
    }
    openModal('Detail Pesan', `
      <div class="message-detail">
        <h4>Dari</h4>
        <p><strong>${m.nama}</strong> — ${m.email}</p>
        ${m.telepon ? `<h4>Telepon</h4><p>${m.telepon}</p>` : ''}
        ${m.subjek ? `<h4>Subjek</h4><p>${m.subjek}</p>` : ''}
        <h4>Pesan</h4>
        <p>${m.pesan}</p>
        <h4>Tanggal</h4>
        <p>${m.tanggal ? new Date(m.tanggal).toLocaleString('id-ID') : '-'}</p>
      </div>
    `);
  };

  window.deletePesan = async (id) => {
    if (!confirm('Hapus pesan ini?')) return;
    try {
      await fetch(`/api/admin/pesan/${id}`, { method: 'DELETE' });
      loadPesan();
      loadDashboard();
    } catch (e) { alert('Gagal menghapus'); }
  };

});
