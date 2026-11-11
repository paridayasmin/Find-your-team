require('dotenv').config();
const { supabase, isConfigured, toEventDB, toTeamDB } = require('./supabase');
const fs = require('fs');
const path = require('path');

async function seedSupabase() {
  if (!isConfigured || !supabase) {
    console.error('❌ Kredensial Supabase belum diisi di file .env!');
    console.error('   Silakan buka file .env dan isi SUPABASE_URL serta SUPABASE_KEY terlebih dahulu.');
    process.exit(1);
  }

  console.log('🔄 Memulai sinkronisasi data ke Supabase...');

  try {
    // 1. Sinkronisasi Data Lomba (Events)
    const eventsPath = path.join(__dirname, 'events.json');
    if (fs.existsSync(eventsPath)) {
      const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
      console.log(`📦 Memasukkan ${events.length} data lomba ke Supabase...`);

      for (const ev of events) {
        const payload = toEventDB(ev);
        const { error } = await supabase.from('events').insert([payload]);
        if (error) {
          console.error(`   ⚠️ Gagal memasukkan lomba "${ev.title}":`, error.message);
        } else {
          console.log(`   ✅ Berhasil: "${ev.title}"`);
        }
      }
    }

    // 2. Sinkronisasi Data Cari Teman (Teams)
    const teamsPath = path.join(__dirname, 'teams.json');
    if (fs.existsSync(teamsPath)) {
      const teams = JSON.parse(fs.readFileSync(teamsPath, 'utf-8'));
      console.log(`👥 Memasukkan ${teams.length} postingan cari teman ke Supabase...`);

      for (const t of teams) {
        const payload = toTeamDB(t);
        const { error } = await supabase.from('teams').insert([payload]);
        if (error) {
          console.error(`   ⚠️ Gagal memasukkan teman "${t.name}":`, error.message);
        } else {
          console.log(`   ✅ Berhasil: "${t.name}" (${t.myRole})`);
        }
      }
    }

    console.log('\n🎉 Selesai! Semua data berhasil di-seed ke Supabase Database.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat seeding:', err.message);
    process.exit(1);
  }
}

seedSupabase();

