require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

// Periksa apakah kredensial Supabase sudah diisi valid oleh pengguna
const isConfigured = supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseKey.includes('your-anon');

if (isConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('⚡ [Supabase] Menggunakan Supabase Database Cloud:', supabaseUrl);
  } catch (err) {
    console.error('❌ [Supabase] Inisialisasi client gagal:', err.message);
    supabase = null;
  }
} else {
  console.log('💡 [Info] Kredensial Supabase di .env belum diisi.');
  console.log('   Server berjalan dalam mode Fallback JSON (events.json & teams.json).');
  console.log('   Isi SUPABASE_URL dan SUPABASE_KEY di file .env untuk menghubungkan ke Supabase Cloud.');
}

// Helper Mapping Database snake_case <-> Frontend camelCase
function toEventClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    organizer: row.organizer,
    category: row.category,
    level: row.level,
    fee: row.fee,
    prize: row.prize,
    deadline: row.deadline,
    location: row.location,
    contact: row.contact,
    status: row.status,
    regLink: row.reg_link || row.regLink || '',
    imageUrl: row.image_url || row.imageUrl || '',
    description: row.description
  };
}

function toEventDB(data) {
  return {
    title: data.title,
    organizer: data.organizer,
    category: data.category,
    level: data.level,
    fee: data.fee,
    prize: data.prize,
    deadline: data.deadline,
    location: data.location,
    contact: data.contact,
    status: data.status,
    reg_link: data.regLink || data.reg_link || '',
    image_url: data.imageUrl || data.image_url || '',
    description: data.description
  };
}

function toTeamClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id || row.eventId,
    eventTitle: row.event_title || row.eventTitle,
    name: row.name,
    myRole: row.my_role || row.myRole,
    neededRole: row.needed_role || row.neededRole,
    contact: row.contact,
    message: row.message,
    createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : (row.createdAt || '')
  };
}

function toTeamDB(data) {
  const rawId = data.eventId ?? data.event_id;
  const parsedId = rawId && parseInt(rawId) > 0 ? parseInt(rawId) : null;
  return {
    event_id: parsedId,
    event_title: data.eventTitle || data.event_title || 'Kompetisi Terbuka',
    name: data.name,
    my_role: data.myRole || data.my_role,
    needed_role: data.neededRole || data.needed_role,
    contact: data.contact,
    message: data.message
  };
}

module.exports = {
  supabase,
  isConfigured,
  toEventClient,
  toEventDB,
  toTeamClient,
  toTeamDB
};

