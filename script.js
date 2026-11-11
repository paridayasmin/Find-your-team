function getApiBaseUrl() {
  if (typeof window === 'undefined') return '';
  // Jika dibuka lewat file:// (klik langsung index.html) atau Live Server VS Code (port 5500 dsb)
  if (window.location.protocol === 'file:' || 
     (window.location.hostname === 'localhost' && window.location.port !== '5000') ||
     (window.location.hostname === '127.0.0.1' && window.location.port !== '5000')) {
    return 'http://localhost:5000';
  }
  return '';
}

const API_BASE = getApiBaseUrl();
const API_EVENTS_URL = `${API_BASE}/api/events`;
const API_TEAMS_URL = `${API_BASE}/api/teams`;
const DEFAULT_POSTER = "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80";

let eventsData = [];
let teamsData = [];
let currentTab = 'events';

// Format Tanggal Indonesia
function formatDate(dateString) {
  if (!dateString) return "Segera Hadir";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('id-ID', options);
}

// Format No WhatsApp Indonesia
function formatWhatsAppLink(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return `https://wa.me/${cleaned}`;
}

// --- SWITCH TAB (LOMBA VS CARI TEMAN) ---
function switchTab(tab) {
  currentTab = tab;
  const tabEventsBtn = document.getElementById('tabEventsBtn');
  const tabTeamsBtn = document.getElementById('tabTeamsBtn');
  const eventsSection = document.getElementById('eventsSection');
  const teamsSection = document.getElementById('teamsSection');
  const eventsFilterBar = document.getElementById('eventsFilterBar');
  const teamsFilterBar = document.getElementById('teamsFilterBar');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerDesc = document.getElementById('bannerDesc');

  if (tab === 'events') {
    tabEventsBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/30";
    tabTeamsBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 bg-slate-900/80 text-purple-300 hover:text-white border border-purple-800/60";
    
    eventsSection.classList.remove('hidden');
    teamsSection.classList.add('hidden');
    eventsFilterBar.classList.remove('hidden');
    eventsFilterBar.classList.add('grid');
    teamsFilterBar.classList.add('hidden');
    teamsFilterBar.classList.remove('grid');

    bannerTitle.innerText = "Eksplor Hackathon & Temukan Tim Impianmu! 🚀";
    bannerDesc.innerText = "Jelajahi kompetisi bergengsi seperti Garuda Hacks, COMPFEST UI, Arkavidia ITB, Find IT UGM, atau posting untuk mencari partner satu frekuensi.";
    filterEvents();
  } else {
    tabTeamsBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/30";
    tabEventsBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 bg-slate-900/80 text-purple-300 hover:text-white border border-purple-800/60";
    
    eventsSection.classList.add('hidden');
    teamsSection.classList.remove('hidden');
    eventsFilterBar.classList.add('hidden');
    eventsFilterBar.classList.remove('grid');
    teamsFilterBar.classList.remove('hidden');
    teamsFilterBar.classList.add('grid');

    bannerTitle.innerText = "Cari Partner & Rekan Tim Perlombaan 🤝";
    bannerDesc.innerText = "Punya ide brilian tapi kurang personil? Temukan rekan frontend, backend, UI/UX, atau data analyst yang siap berjuang bersama!";
    filterTeams();
  }
}

// 1. Ambil Data dari Backend Express.js
async function loadAllData() {
  await Promise.all([fetchEvents(), fetchTeams()]);
  updateCounts();
  populateTeamEventSelect();
}

async function fetchEvents() {
  try {
    const res = await fetch(API_EVENTS_URL);
    const data = await res.json();
    if (data.success) {
      eventsData = data.data;
      filterEvents();
      updateCounts();
    }
  } catch (error) {
    console.error("Gagal memuat data lomba:", error);
    document.getElementById('cardsGrid').innerHTML = `
      <div class="col-span-full text-center py-10 bg-cardbg/80 border border-pink-900/50 rounded-3xl p-6 text-pink-300 max-w-lg mx-auto shadow-2xl">
        <i class="fa-solid fa-server text-4xl mb-3 text-pink-400"></i>
        <h4 class="font-bold text-lg text-white mb-1">Server Express.js Belum Aktif</h4>
        <p class="text-xs text-purple-200/80 mb-4">Aplikasi belum terhubung ke backend Express di port 5000.</p>
        <div class="bg-darkbg/90 p-3.5 rounded-2xl border border-purple-900/60 text-left text-xs font-mono text-purple-300 mb-4 space-y-1">
          <p class="text-purple-400 font-sans font-bold mb-1">Solusi Mudah:</p>
          <p>1. Buka Terminal di folder ini</p>
          <p>2. Jalankan perintah: <span class="text-emerald-400 font-bold">npm start</span></p>
          <p>3. Buka browser di: <span class="text-cyan-400 font-bold">http://localhost:5000</span></p>
        </div>
        <button onclick="loadAllData()" class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold px-5 py-2 rounded-full text-xs shadow-md transition">
          <i class="fa-solid fa-rotate mr-1"></i> Coba Hubungkan Lagi
        </button>
      </div>
    `;
  }
}

async function fetchTeams() {
  try {
    const res = await fetch(API_TEAMS_URL);
    const data = await res.json();
    if (data.success) {
      teamsData = data.data;
      filterTeams();
      updateCounts();
    }
  } catch (error) {
    console.error("Gagal memuat data cari teman:", error);
  }
}

function updateCounts() {
  const tabEventsCount = document.getElementById('tabEventsCount');
  const tabTeamsCount = document.getElementById('tabTeamsCount');
  if (tabEventsCount) tabEventsCount.innerText = eventsData.length;
  if (tabTeamsCount) tabTeamsCount.innerText = teamsData.length;
}

// Isi pilihan lomba di form cari teman
function populateTeamEventSelect(selectedId = null) {
  const select = document.getElementById('teamEventSelect');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Kompetisi / Hackathon --</option>';
  eventsData.forEach(ev => {
    const isSelected = selectedId && ev.id == selectedId ? 'selected' : '';
    select.innerHTML += `<option value="${ev.id}" data-title="${ev.title}" ${isSelected}>${ev.title} (${ev.category})</option>`;
  });
  select.innerHTML += '<option value="0" data-title="Kompetisi Terbuka / Lainnya">Lainnya / Kompetisi Terbuka</option>';
}

// ==========================================
// 2. RENDER DAFTAR LOMBA
// ==========================================
function renderEvents(data) {
  const grid = document.getElementById('cardsGrid');
  const countBadge = document.getElementById('eventCount');
  countBadge.innerText = `${data.length} Lomba & Hackathon Tersedia`;
  grid.innerHTML = '';

  if (data.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-16 bg-cardbg/50 border border-purple-900/40 rounded-3xl p-8">
        <div class="w-16 h-16 bg-purple-950/80 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-800 text-2xl">
          <i class="fa-solid fa-search"></i>
        </div>
        <h4 class="text-lg font-bold text-white mb-1">Tidak Ada Lomba Ditemukan</h4>
        <p class="text-xs text-purple-300/70 mb-5 max-w-sm mx-auto">Coba gunakan kata kunci lain atau ubah kategori & filter biaya.</p>
        <button onclick="resetFilters()" class="text-xs bg-purple-900/60 hover:bg-purple-800 text-purple-200 px-4 py-2 rounded-full border border-purple-700 transition">
          <i class="fa-solid fa-rotate-left mr-1"></i> Reset Pencarian
        </button>
      </div>
    `;
    return;
  }

  data.forEach(ev => {
    const poster = ev.imageUrl && ev.imageUrl.trim() !== "" ? ev.imageUrl : DEFAULT_POSTER;
    const isFree = (ev.fee || '').toLowerCase().includes('gratis') || (ev.fee || '').toLowerCase().includes('free');
    
    // Hitung berapa orang yang cari tim di lomba ini
    const teammatesCount = teamsData.filter(t => t.eventId == ev.id).length;

    // Badge Biaya
    const feeBadge = isFree
      ? `<span class="text-[10px] font-bold bg-emerald-950/90 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-700/80"><i class="fa-solid fa-tag text-[9px] mr-1"></i>GRATIS</span>`
      : `<span class="text-[10px] font-bold bg-amber-950/90 text-amber-300 px-2.5 py-1 rounded-full border border-amber-700/80"><i class="fa-solid fa-coins text-[9px] mr-1"></i>${ev.fee || 'Berbayar'}</span>`;

    // Badge Status
    let badgeStatus = "bg-purple-900/80 text-purple-200 border-purple-700";
    if (ev.status === "Segera Ditutup") {
      badgeStatus = "bg-pink-900/80 text-pink-200 border-pink-700 animate-pulse";
    } else if (ev.status === "Pendaftaran Tutup") {
      badgeStatus = "bg-slate-800 text-slate-400 border-slate-600";
    }

    const waLink = formatWhatsAppLink(ev.contact);

    grid.innerHTML += `
      <div class="bg-cardbg border border-purple-800/50 rounded-3xl overflow-hidden hover:-translate-y-2 hover:border-purple-600/80 transition duration-300 shadow-xl hover:shadow-purple-900/20 flex flex-col group">
        <!-- Thumbnail Poster -->
        <div class="h-48 w-full relative overflow-hidden bg-slate-950 cursor-pointer" onclick="viewDetail(${ev.id})">
          <img src="${poster}" alt="${ev.title}" class="w-full h-full object-cover opacity-85 group-hover:scale-105 transition duration-500" onerror="this.src='${DEFAULT_POSTER}'">
          <div class="absolute inset-0 bg-gradient-to-t from-cardbg via-cardbg/20 to-transparent"></div>
          
          <div class="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            <span class="text-[10px] font-bold bg-darkbg/90 text-purple-300 px-2.5 py-1 rounded-full border border-purple-700 uppercase tracking-wide">
              ${ev.category || 'Kompetisi'}
            </span>
            ${feeBadge}
          </div>
          <div class="absolute top-3 right-3 z-10">
            <span class="text-[10px] font-bold px-2.5 py-1 rounded-full border ${badgeStatus}">
              ${ev.status || 'Buka'}
            </span>
          </div>
        </div>

        <!-- Konten Card -->
        <div class="p-5 flex-grow flex flex-col">
          <div class="flex items-center justify-between gap-2 mb-1">
            <p class="text-xs font-semibold text-purple-400 flex items-center gap-1.5 truncate">
              <i class="fa-solid fa-building-columns text-purple-400"></i> ${ev.organizer || 'Penyelenggara Lomba'}
            </p>
            ${teammatesCount > 0 ? `
              <span class="text-[10px] bg-pink-950/80 text-pink-300 border border-pink-700/80 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                <i class="fa-solid fa-users text-[9px]"></i> ${teammatesCount} cari tim
              </span>
            ` : ''}
          </div>

          <h4 class="font-bold text-white text-base sm:text-lg mb-2 line-clamp-2 leading-snug group-hover:text-purple-300 transition cursor-pointer" onclick="viewDetail(${ev.id})">
            ${ev.title}
          </h4>
          <p class="text-xs text-purple-200/70 mb-4 line-clamp-2 leading-relaxed flex-grow">
            ${ev.description || 'Klik tombol detail untuk membaca persyaratan lengkap perlombaan ini.'}
          </p>

          <!-- List Spesifikasi Ringkas -->
          <div class="space-y-2 bg-darkbg/60 p-3.5 rounded-2xl border border-purple-900/50 text-xs mt-auto">
            <div class="flex items-center justify-between">
              <span class="text-purple-300/80 flex items-center gap-1.5"><i class="fa-solid fa-trophy text-amber-400 w-4"></i> Hadiah:</span>
              <span class="font-bold text-amber-300 truncate max-w-[150px]">${ev.prize || 'Sertifikat & Trophy'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-purple-300/80 flex items-center gap-1.5"><i class="fa-solid fa-graduation-cap text-cyan-400 w-4"></i> Tingkat:</span>
              <span class="text-white font-medium truncate max-w-[150px]">${ev.level || 'Mahasiswa / Umum'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-purple-300/80 flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-pink-500 w-4"></i> Lokasi:</span>
              <span class="text-white font-medium truncate max-w-[150px]">${ev.location || 'Online'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-purple-300/80 flex items-center gap-1.5"><i class="fa-solid fa-clock text-rose-400 w-4"></i> Deadline:</span>
              <span class="font-bold text-pink-300">${formatDate(ev.deadline)}</span>
            </div>
          </div>
        </div>

        <!-- Tombol Aksi Bawah -->
        <div class="px-5 pb-5 pt-3 border-t border-purple-900/50 flex justify-between items-center gap-2">
          <div class="flex items-center gap-1.5">
            <button onclick="viewDetail(${ev.id})" class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-bold transition shadow-md shadow-purple-600/20 flex items-center gap-1">
              <i class="fa-solid fa-circle-info"></i> Detail
            </button>
            <button onclick="openTeamModal(${ev.id})" title="Cari rekan tim untuk lomba ini" class="bg-pink-950/80 hover:bg-pink-900 text-pink-300 hover:text-white border border-pink-700/60 px-2.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1">
              <i class="fa-solid fa-user-plus text-[11px]"></i> Cari Tim
            </button>
            ${waLink ? `
              <a href="${waLink}" target="_blank" title="Narahubung Panitia WA" class="bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 hover:text-white border border-emerald-700/60 px-2.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1">
                <i class="fa-brands fa-whatsapp text-sm"></i> WA
              </a>
            ` : ''}
          </div>

          <div class="flex gap-1.5">
            <button onclick="openEditModal(${ev.id})" title="Edit Lomba" class="w-8 h-8 rounded-full bg-purple-950/80 hover:bg-purple-800 text-amber-300 border border-purple-800/80 flex items-center justify-center transition">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="deleteEvent(${ev.id})" title="Hapus Lomba" class="w-8 h-8 rounded-full bg-purple-950/80 hover:bg-pink-900 text-pink-400 border border-purple-800/80 flex items-center justify-center transition">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });
}

// ==========================================
// 3. RENDER CARI TEMAN LOMBA (SEDERHANA)
// ==========================================
function renderTeams(data) {
  const grid = document.getElementById('teamsGrid');
  grid.innerHTML = '';

  if (data.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-16 bg-cardbg/50 border border-purple-900/40 rounded-3xl p-8">
        <div class="w-16 h-16 bg-purple-950/80 text-pink-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-800 text-2xl">
          <i class="fa-solid fa-users"></i>
        </div>
        <h4 class="text-lg font-bold text-white mb-1">Belum Ada Postingan Cari Teman</h4>
        <p class="text-xs text-purple-300/70 mb-5 max-w-sm mx-auto">Jadilah yang pertama membuat postingan cari teman untuk hackathon incaranmu!</p>
        <button onclick="openTeamModal()" class="text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold px-5 py-2.5 rounded-full shadow-lg transition">
          <i class="fa-solid fa-plus mr-1"></i> Buat Postingan Sekarang
        </button>
      </div>
    `;
    return;
  }

  data.forEach(item => {
    const waLink = formatWhatsAppLink(item.contact);

    grid.innerHTML += `
      <div class="bg-cardbg border border-purple-800/50 rounded-3xl p-5 hover:-translate-y-2 hover:border-purple-600/80 transition duration-300 shadow-xl flex flex-col justify-between group">
        <div>
          <!-- Header Card Teman -->
          <div class="flex items-start justify-between gap-2 mb-3">
            <span class="text-[10px] font-bold bg-darkbg/90 text-purple-300 px-2.5 py-1 rounded-full border border-purple-700 uppercase tracking-wide truncate max-w-[210px] block" title="${item.eventTitle}">
              <i class="fa-solid fa-trophy text-amber-400 mr-1"></i> ${item.eventTitle}
            </span>
            <span class="text-[10px] text-purple-400/80 shrink-0">
              <i class="fa-regular fa-clock mr-0.5"></i> ${formatDate(item.createdAt)}
            </span>
          </div>

          <!-- Nama & Role -->
          <div class="mb-3">
            <h4 class="font-bold text-white text-base flex items-center gap-2">
              <span class="w-7 h-7 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center text-xs font-extrabold">
                ${item.name.charAt(0).toUpperCase()}
              </span>
              ${item.name}
            </h4>
          </div>

          <!-- Role Kamu vs Dicari -->
          <div class="space-y-2 bg-darkbg/60 p-3.5 rounded-2xl border border-purple-900/50 text-xs mb-3">
            <div>
              <span class="text-purple-300/80 font-medium block mb-0.5"><i class="fa-solid fa-id-badge text-cyan-400 w-4"></i> Keahlian Dia:</span>
              <span class="text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/50 inline-block">${item.myRole}</span>
            </div>
            <div>
              <span class="text-purple-300/80 font-medium block mb-0.5"><i class="fa-solid fa-user-plus text-pink-400 w-4"></i> Butuh Rekan:</span>
              <span class="text-pink-300 font-bold bg-pink-950/60 px-2 py-0.5 rounded-md border border-pink-800/50 inline-block">${item.neededRole}</span>
            </div>
          </div>

          <!-- Pesan -->
          <p class="text-xs text-purple-200/80 leading-relaxed bg-purple-950/20 p-3 rounded-xl border border-purple-900/40 italic">
            "${item.message || 'Yuk gabung dan berjuang bareng di hackathon ini!'}"
          </p>
        </div>

        <!-- Tombol Aksi -->
        <div class="pt-4 mt-4 border-t border-purple-900/50 flex justify-between items-center gap-2">
          ${waLink ? `
            <a href="${waLink}" target="_blank" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition">
              <i class="fa-brands fa-whatsapp text-sm"></i> Chat WhatsApp
            </a>
          ` : `
            <span class="text-xs text-slate-500">Tidak ada WA</span>
          `}
          
          <button onclick="deleteTeamPost(${item.id})" title="Hapus Postingan" class="w-8 h-8 rounded-full bg-purple-950/80 hover:bg-pink-900 text-pink-400 border border-purple-800/80 flex items-center justify-center transition">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </div>
      </div>
    `;
  });
}

// ==========================================
// 4. MODAL DETAIL LOMBA
// ==========================================
function viewDetail(id) {
  const ev = eventsData.find(e => e.id === id);
  if (!ev) return;

  const poster = ev.imageUrl && ev.imageUrl.trim() !== "" ? ev.imageUrl : DEFAULT_POSTER;
  const isFree = (ev.fee || '').toLowerCase().includes('gratis') || (ev.fee || '').toLowerCase().includes('free');

  document.getElementById('detailPoster').src = poster;
  document.getElementById('detailCategory').innerText = ev.category || 'Kompetisi';
  
  const feeBadge = document.getElementById('detailFeeBadge');
  if (isFree) {
    feeBadge.className = "text-xs font-bold bg-emerald-950/90 text-emerald-300 px-3 py-1 rounded-full border border-emerald-700";
    feeBadge.innerText = "GRATIS";
  } else {
    feeBadge.className = "text-xs font-bold bg-amber-950/90 text-amber-300 px-3 py-1 rounded-full border border-amber-700";
    feeBadge.innerText = ev.fee || "Berbayar";
  }

  const statusBadge = document.getElementById('detailStatus');
  statusBadge.innerText = ev.status || "Pendaftaran Buka";
  if (ev.status === "Segera Ditutup") {
    statusBadge.className = "text-xs font-bold bg-pink-950/90 text-pink-300 px-3 py-1 rounded-full border border-pink-700";
  } else if (ev.status === "Pendaftaran Tutup") {
    statusBadge.className = "text-xs font-bold bg-slate-900 text-slate-400 px-3 py-1 rounded-full border border-slate-700";
  } else {
    statusBadge.className = "text-xs font-bold bg-purple-950/90 text-purple-300 px-3 py-1 rounded-full border border-purple-700";
  }

  document.getElementById('detailTitle').innerText = ev.title;
  document.getElementById('detailOrganizer').innerHTML = `<i class="fa-solid fa-building-columns text-purple-400"></i> Diselenggarakan oleh: <span class="text-white font-semibold">${ev.organizer || 'Panitia Kompetisi'}</span>`;
  document.getElementById('detailPrize').innerText = ev.prize || 'Sertifikat & Hadiah';
  document.getElementById('detailLevel').innerText = ev.level || 'Umum';
  document.getElementById('detailLocation').innerText = ev.location || 'Online';
  document.getElementById('detailDeadline').innerText = formatDate(ev.deadline);
  document.getElementById('detailDescription').innerText = ev.description || 'Tidak ada deskripsi tambahan.';

  // Render daftar teman yang cari tim untuk lomba ini
  const relatedTeams = teamsData.filter(t => t.eventId == ev.id);
  const detailTeamsList = document.getElementById('detailTeamsList');
  if (relatedTeams.length === 0) {
    detailTeamsList.innerHTML = `
      <p class="text-purple-300/60 italic text-center py-2">Belum ada rekan yang memposting cari tim untuk lomba ini. Jadilah yang pertama!</p>
    `;
  } else {
    detailTeamsList.innerHTML = relatedTeams.map(t => {
      const waLink = formatWhatsAppLink(t.contact);
      return `
        <div class="flex items-center justify-between gap-3 bg-purple-950/40 p-2.5 rounded-xl border border-purple-900/40">
          <div>
            <span class="font-bold text-white">${t.name}</span>
            <span class="text-cyan-300 ml-1.5 font-medium">(${t.myRole})</span>
            <p class="text-[11px] text-pink-300">Butuh: ${t.neededRole}</p>
          </div>
          ${waLink ? `
            <a href="${waLink}" target="_blank" class="bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition shrink-0 flex items-center gap-1">
              <i class="fa-brands fa-whatsapp"></i> Chat WA
            </a>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // Tombol aksi di mini list untuk posting tim untuk lomba ini
  const detailFindTeamBtn = document.getElementById('detailFindTeamBtn');
  detailFindTeamBtn.onclick = () => {
    closeDetailModal();
    openTeamModal(ev.id);
  };

  // Tombol Pendaftaran
  const regBtn = document.getElementById('detailRegBtn');
  if (ev.regLink && ev.regLink.trim() !== "") {
    regBtn.href = ev.regLink.startsWith('http') ? ev.regLink : `https://${ev.regLink}`;
    regBtn.classList.remove('hidden');
  } else {
    regBtn.classList.add('hidden');
  }

  // Tombol WA Panitia
  const waBtn = document.getElementById('detailWaBtn');
  const waLink = formatWhatsAppLink(ev.contact);
  if (waLink) {
    waBtn.href = waLink;
    waBtn.classList.remove('hidden');
  } else {
    waBtn.classList.add('hidden');
  }

  document.getElementById('detailModal').classList.replace('hidden', 'flex');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.replace('flex', 'hidden');
}

// ==========================================
// 5. POSTING CARI TEMAN LOMBA (SEDERHANA)
// ==========================================
function openTeamModal(selectedEventId = null) {
  document.getElementById('teamForm').reset();
  populateTeamEventSelect(selectedEventId);
  document.getElementById('teamModal').classList.replace('hidden', 'flex');
}

function closeTeamModal() {
  document.getElementById('teamModal').classList.replace('flex', 'hidden');
}

async function handleTeamSubmit(e) {
  e.preventDefault();
  const select = document.getElementById('teamEventSelect');
  const selectedOption = select.options[select.selectedIndex];
  const eventId = select.value ? parseInt(select.value) : null;
  const eventTitle = selectedOption ? (selectedOption.getAttribute('data-title') || selectedOption.text) : 'Kompetisi Terbuka';

  const payload = {
    eventId: eventId,
    eventTitle: eventTitle,
    name: document.getElementById('teamName').value.trim(),
    myRole: document.getElementById('teamMyRole').value.trim(),
    neededRole: document.getElementById('teamNeededRole').value.trim(),
    contact: document.getElementById('teamContact').value.trim(),
    message: document.getElementById('teamMessage').value.trim()
  };

  try {
    const res = await fetch(API_TEAMS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `Server merespon dengan status ${res.status}`);
    }

    const result = await res.json();
    if (result.success) {
      closeTeamModal();
      Swal.fire({
        title: 'Postingan Terbit! 🤝',
        text: 'Postingan cari teman lomba berhasil ditayangkan. Calon rekan tim bisa langsung menghubungimu via WhatsApp!',
        icon: 'success',
        background: '#15112a',
        color: '#fff',
        confirmButtonColor: '#8b5cf6'
      });
      await fetchTeams();
      switchTab('teams');
    }
  } catch (err) {
    console.error("Gagal posting tim:", err);
    Swal.fire({
      title: 'Terjadi Kesalahan',
      text: err.message || 'Gagal mengirim postingan cari teman. Pastikan server express berjalan.',
      icon: 'error',
      background: '#15112a',
      color: '#fff',
      confirmButtonColor: '#ec4899'
    });
  }
}

function deleteTeamPost(id) {
  Swal.fire({
    title: 'Hapus Postingan Cari Teman?',
    text: 'Apakah Anda ingin menghapus postingan pencarian tim ini?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal',
    background: '#15112a',
    color: '#fff',
    confirmButtonColor: '#ec4899',
    cancelButtonColor: '#475569'
  }).then(async (res) => {
    if (res.isConfirmed) {
      try {
        await fetch(`${API_TEAMS_URL}/${id}`, { method: 'DELETE' });
        Swal.fire({
          title: 'Terhapus!',
          text: 'Postingan berhasil dihapus.',
          icon: 'success',
          background: '#15112a',
          color: '#fff',
          confirmButtonColor: '#8b5cf6',
          timer: 1500,
          showConfirmButton: false
        });
        await fetchTeams();
      } catch (err) {
        console.error("Gagal menghapus:", err);
      }
    }
  });
}

// ==========================================
// 6. FORM TAMBAH / EDIT LOMBA (CRUD)
// ==========================================
function openModal() {
  document.getElementById('eventForm').reset();
  document.getElementById('eventId').value = '';
  document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-trophy text-amber-400 mr-2"></i> Post Info Lomba';
  document.getElementById('eventModal').classList.replace('hidden', 'flex');
}

function closeModal() {
  document.getElementById('eventModal').classList.replace('flex', 'hidden');
}

function openEditModal(id) {
  const ev = eventsData.find(e => e.id === id);
  if (!ev) return;

  document.getElementById('eventId').value = ev.id;
  document.getElementById('title').value = ev.title || '';
  document.getElementById('organizer').value = ev.organizer || '';
  document.getElementById('category').value = ev.category || 'Web Development';
  document.getElementById('level').value = ev.level || 'Mahasiswa';
  document.getElementById('fee').value = ev.fee || 'Gratis';
  document.getElementById('prize').value = ev.prize || '';
  document.getElementById('location').value = ev.location || '';
  document.getElementById('deadline').value = ev.deadline || '';
  document.getElementById('status').value = ev.status || 'Pendaftaran Buka';
  document.getElementById('contact').value = ev.contact || '';
  document.getElementById('regLink').value = ev.regLink || '';
  document.getElementById('imageUrl').value = ev.imageUrl || '';
  document.getElementById('description').value = ev.description || '';

  document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-edit text-amber-400 mr-2"></i> Edit Info Lomba';
  document.getElementById('eventModal').classList.replace('hidden', 'flex');
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('eventId').value;
  const payload = {
    title: document.getElementById('title').value.trim(),
    organizer: document.getElementById('organizer').value.trim(),
    category: document.getElementById('category').value,
    level: document.getElementById('level').value.trim(),
    fee: document.getElementById('fee').value.trim(),
    prize: document.getElementById('prize').value.trim(),
    location: document.getElementById('location').value.trim(),
    deadline: document.getElementById('deadline').value,
    status: document.getElementById('status').value,
    contact: document.getElementById('contact').value.trim(),
    regLink: document.getElementById('regLink').value.trim(),
    imageUrl: document.getElementById('imageUrl').value.trim(),
    description: document.getElementById('description').value.trim()
  };

  try {
    let res;
    if (id) {
      res = await fetch(`${API_EVENTS_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(API_EVENTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `Server merespon dengan status ${res.status}`);
    }

    Swal.fire({
      title: id ? 'Berhasil Diperbarui!' : 'Berhasil Dipublikasikan!',
      text: id ? 'Data informasi lomba telah tersimpan.' : 'Lomba baru sekarang sudah tampil di portal.',
      icon: 'success',
      background: '#15112a',
      color: '#fff',
      confirmButtonColor: '#8b5cf6'
    });

    closeModal();
    await fetchEvents();
    populateTeamEventSelect();
  } catch (error) {
    console.error("Gagal menyimpan lomba:", error);
    Swal.fire({
      title: 'Terjadi Kesalahan',
      text: error.message || 'Gagal menghubungi server. Pastikan server express berjalan di port 5000.',
      icon: 'error',
      background: '#15112a',
      color: '#fff',
      confirmButtonColor: '#ec4899'
    });
  }
}

function deleteEvent(id) {
  const ev = eventsData.find(e => e.id === id);
  const title = ev ? ev.title : "lomba ini";

  Swal.fire({
    title: 'Hapus Info Lomba?',
    text: `Apakah Anda yakin ingin menghapus "${title}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal',
    background: '#15112a',
    color: '#fff',
    confirmButtonColor: '#ec4899',
    cancelButtonColor: '#475569'
  }).then(async (res) => {
    if (res.isConfirmed) {
      try {
        await fetch(`${API_EVENTS_URL}/${id}`, { method: 'DELETE' });
        Swal.fire({
          title: 'Terhapus!',
          text: 'Data lomba berhasil dihapus.',
          icon: 'success',
          background: '#15112a',
          color: '#fff',
          confirmButtonColor: '#8b5cf6',
          timer: 1500,
          showConfirmButton: false
        });
        await fetchEvents();
        populateTeamEventSelect();
      } catch (err) {
        console.error("Gagal menghapus:", err);
      }
    }
  });
}

// ==========================================
// 7. FILTER & SEARCH
// ==========================================
function filterEvents() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const cat = document.getElementById('categoryFilter').value;
  const feeOption = document.getElementById('feeFilter').value;

  const filtered = eventsData.filter(ev => {
    const matchQuery = !query || 
      (ev.title && ev.title.toLowerCase().includes(query)) ||
      (ev.organizer && ev.organizer.toLowerCase().includes(query)) ||
      (ev.location && ev.location.toLowerCase().includes(query)) ||
      (ev.description && ev.description.toLowerCase().includes(query));

    const matchCat = (cat === 'ALL' || ev.category === cat);

    let matchFee = true;
    if (feeOption === 'Gratis') {
      matchFee = (ev.fee || '').toLowerCase().includes('gratis') || (ev.fee || '').toLowerCase().includes('free');
    } else if (feeOption === 'Berbayar') {
      matchFee = !((ev.fee || '').toLowerCase().includes('gratis') || (ev.fee || '').toLowerCase().includes('free'));
    }

    return matchQuery && matchCat && matchFee;
  });

  renderEvents(filtered);
}

function filterTeams() {
  const query = document.getElementById('searchTeamInput').value.toLowerCase().trim();
  const filtered = teamsData.filter(t => {
    return !query ||
      (t.eventTitle && t.eventTitle.toLowerCase().includes(query)) ||
      (t.name && t.name.toLowerCase().includes(query)) ||
      (t.myRole && t.myRole.toLowerCase().includes(query)) ||
      (t.neededRole && t.neededRole.toLowerCase().includes(query)) ||
      (t.message && t.message.toLowerCase().includes(query));
  });
  renderTeams(filtered);
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('categoryFilter').value = 'ALL';
  document.getElementById('feeFilter').value = 'ALL';
  filterEvents();
}

// Tutup modal ketika klik di area luar modal (backdrop)
window.addEventListener('click', (e) => {
  const formModal = document.getElementById('eventModal');
  const teamModal = document.getElementById('teamModal');
  const detailModal = document.getElementById('detailModal');
  if (e.target === formModal) closeModal();
  if (e.target === teamModal) closeTeamModal();
  if (e.target === detailModal) closeDetailModal();
});

// Jalankan otomatis saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', loadAllData);
