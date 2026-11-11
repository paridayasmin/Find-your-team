require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const {
  supabase,
  toEventClient,
  toEventDB,
  toTeamClient,
  toTeamDB
} = require('./supabase');

const app = express();
const PORT = process.env.PORT || 5000;
const EVENTS_FILE = path.join(__dirname, 'events.json');
const TEAMS_FILE = path.join(__dirname, 'teams.json');

// Middleware
app.use(cors());
app.use(express.json());

// Menampilkan file statis frontend (index.html, style.css, script.js, dsb.)
app.use(express.static(__dirname));

// --- HELPER DATABASE LOKAL (FALLBACK JIKA SUPABASE BELUM DIISI) ---
function getLocalEvents() {
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Gagal membaca events.json:', err.message);
  }
  return [];
}

function saveLocalEvents(data) {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menyimpan events.json:', err.message);
  }
}

function getLocalTeams() {
  try {
    if (fs.existsSync(TEAMS_FILE)) {
      return JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Gagal membaca teams.json:', err.message);
  }
  return [];
}

function saveLocalTeams(data) {
  try {
    fs.writeFileSync(TEAMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menyimpan teams.json:', err.message);
  }
}

let localEvents = getLocalEvents();
let localTeams = getLocalTeams();

// Status Database
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    mode: supabase ? 'supabase' : 'local_json',
    message: supabase
      ? 'Terhubung ke Supabase Database Cloud 🚀'
      : 'Berjalan dengan Local JSON Fallback (Isi .env untuk mengaktifkan Supabase)'
  });
});

// ==========================================
// --- API ROUTES: LOMBA / COMPETITIONS ---
// ==========================================

// 1. Ambil Semua Data Lomba
app.get('/api/events', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data) {
        return res.json({ success: true, data: data.map(toEventClient) });
      }
      console.warn('⚠️ Query Supabase events error, fallback ke local JSON:', error?.message);
    } catch (e) {
      console.error('Supabase query error:', e.message);
    }
  }

  // Fallback lokal
  res.json({ success: true, data: localEvents });
});

// 2. Ambil Detail Satu Lomba
app.get('/api/events/:id', async (req, res) => {
  const id = req.params.id;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return res.json({ success: true, data: toEventClient(data) });
      }
    } catch (e) {
      console.error('Supabase get event error:', e.message);
    }
  }

  // Fallback lokal
  const found = localEvents.find(ev => ev.id == id);
  if (found) {
    res.json({ success: true, data: found });
  } else {
    res.status(404).json({ success: false, message: 'Lomba tidak ditemukan' });
  }
});

// 3. Tambah Lomba Baru
app.post('/api/events', async (req, res) => {
  if (supabase) {
    try {
      const dbPayload = toEventDB(req.body);
      const { data, error } = await supabase
        .from('events')
        .insert([dbPayload])
        .select();

      if (!error && data && data.length > 0) {
        return res.status(201).json({ success: true, data: toEventClient(data[0]) });
      }
      console.warn('⚠️ Gagal insert ke Supabase events:', error?.message);
    } catch (e) {
      console.error('Supabase insert event error:', e.message);
    }
  }

  // Fallback lokal
  const newEvent = {
    id: Date.now(),
    title: req.body.title || 'Untitled Competition',
    organizer: req.body.organizer || 'Penyelenggara Lomba',
    category: req.body.category || 'Lainnya',
    level: req.body.level || 'Umum',
    fee: req.body.fee || 'Gratis',
    prize: req.body.prize || 'Sertifikat & Hadiah',
    deadline: req.body.deadline || '',
    location: req.body.location || 'Online',
    contact: req.body.contact || '',
    status: req.body.status || 'Pendaftaran Buka',
    regLink: req.body.regLink || '',
    imageUrl: req.body.imageUrl || '',
    description: req.body.description || ''
  };

  localEvents.unshift(newEvent);
  saveLocalEvents(localEvents);
  res.status(201).json({ success: true, data: newEvent });
});

// 4. Update / Edit Lomba
app.put('/api/events/:id', async (req, res) => {
  const id = req.params.id;
  if (supabase) {
    try {
      const dbPayload = toEventDB(req.body);
      const { data, error } = await supabase
        .from('events')
        .update(dbPayload)
        .eq('id', id)
        .select();

      if (!error && data && data.length > 0) {
        return res.json({ success: true, data: toEventClient(data[0]) });
      }
      console.warn('⚠️ Gagal update ke Supabase events:', error?.message);
    } catch (e) {
      console.error('Supabase update event error:', e.message);
    }
  }

  // Fallback lokal
  const index = localEvents.findIndex(ev => ev.id == id);
  if (index !== -1) {
    localEvents[index] = {
      ...localEvents[index],
      ...req.body,
      id: parseInt(id)
    };
    saveLocalEvents(localEvents);
    res.json({ success: true, data: localEvents[index] });
  } else {
    res.status(404).json({ success: false, message: 'Data lomba tidak ditemukan' });
  }
});

// 5. Hapus Lomba
app.delete('/api/events/:id', async (req, res) => {
  const id = req.params.id;
  if (supabase) {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (!error) {
        return res.json({ success: true, message: 'Lomba berhasil dihapus dari Supabase' });
      }
      console.warn('⚠️ Gagal delete di Supabase events:', error?.message);
    } catch (e) {
      console.error('Supabase delete event error:', e.message);
    }
  }

  // Fallback lokal
  const beforeCount = localEvents.length;
  localEvents = localEvents.filter(ev => ev.id != id);
  if (localEvents.length !== beforeCount) {
    saveLocalEvents(localEvents);
    res.json({ success: true, message: 'Lomba berhasil dihapus' });
  } else {
    res.status(404).json({ success: false, message: 'Data lomba tidak ditemukan' });
  }
});

// ==========================================
// --- API ROUTES: CARI TEMAN TIM LOMBA ---
// ==========================================

// 1. Ambil Semua Postingan Cari Teman Lomba
app.get('/api/teams', async (req, res) => {
  const eventId = req.query.eventId;

  if (supabase) {
    try {
      let query = supabase.from('teams').select('*').order('id', { ascending: false });
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return res.json({ success: true, data: data.map(toTeamClient) });
      }
      console.warn('⚠️ Query Supabase teams error, fallback ke local JSON:', error?.message);
    } catch (e) {
      console.error('Supabase query teams error:', e.message);
    }
  }

  // Fallback lokal
  if (eventId) {
    const filtered = localTeams.filter(t => t.eventId == eventId);
    return res.json({ success: true, data: filtered });
  }
  res.json({ success: true, data: localTeams });
});

// 2. Tambah Postingan Cari Teman Lomba Baru
app.post('/api/teams', async (req, res) => {
  if (supabase) {
    try {
      const dbPayload = toTeamDB(req.body);
      let { data, error } = await supabase
        .from('teams')
        .insert([dbPayload])
        .select();

      if (error && error.code === '23503') {
        // Jika eventId tidak ditemukan di tabel events, masukkan dengan event_id = null
        dbPayload.event_id = null;
        const retry = await supabase.from('teams').insert([dbPayload]).select();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data && data.length > 0) {
        return res.status(201).json({ success: true, data: toTeamClient(data[0]) });
      }
      console.warn('⚠️ Gagal insert ke Supabase teams:', error?.message);
    } catch (e) {
      console.error('Supabase insert team error:', e.message);
    }
  }

  // Fallback lokal
  const newTeamPost = {
    id: Date.now(),
    eventId: req.body.eventId ? parseInt(req.body.eventId) : null,
    eventTitle: req.body.eventTitle || 'Kompetisi Terbuka',
    name: req.body.name || 'Anonim',
    myRole: req.body.myRole || 'Anggota Tim',
    neededRole: req.body.neededRole || 'Semua Role',
    contact: req.body.contact || '',
    message: req.body.message || '',
    createdAt: new Date().toISOString().split('T')[0]
  };

  localTeams.unshift(newTeamPost);
  saveLocalTeams(localTeams);
  res.status(201).json({ success: true, data: newTeamPost });
});

// 3. Hapus Postingan Cari Teman Lomba
app.delete('/api/teams/:id', async (req, res) => {
  const id = req.params.id;
  if (supabase) {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);

      if (!error) {
        return res.json({ success: true, message: 'Postingan berhasil dihapus dari Supabase' });
      }
      console.warn('⚠️ Gagal delete di Supabase teams:', error?.message);
    } catch (e) {
      console.error('Supabase delete team error:', e.message);
    }
  }

  // Fallback lokal
  const beforeCount = localTeams.length;
  localTeams = localTeams.filter(t => t.id != id);
  if (localTeams.length !== beforeCount) {
    saveLocalTeams(localTeams);
    res.json({ success: true, message: 'Postingan cari teman berhasil dihapus' });
  } else {
    res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
  }
});

// Jalankan Server jika file ini dieksekusi langsung (bukan di-import/require)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ BERHASIL! Website Cari Lomba aktif: http://localhost:${PORT}`);
    console.log(`📡 Mode Database: ${supabase ? 'Supabase Database Cloud 🚀' : 'Local JSON Fallback'}`);
  });
}

module.exports = app;
