// Updated app.js with resilient data loading and graceful fallback when CSV fetch fails
// Hong Kong Kindergarten Ranking Application (Live CSV 2024/25) - v1.1

/* global Papa */
(() => {
  const CSV_URL = 'https://data.gov.hk/en-data/dataset/hk-edb-kgjoinkes-kg-profile/resource/cac5946b-e8d4-40c5-8f99-2f45de7214eb/download';
  const CSV_DELIMITER = '^';
  const CSV_PREVIEW_LINES = 2000;

  const rankings = Array.from({ length: 100 }).map((_, i) => ({
    rank: i + 1,
    englishName: `KINDERGARTEN ${i + 1}`.toUpperCase(),
  }));

  const state = {
    kindergartens: [],
    filtered: [],
    favorites: new Set(),
    filters: { search: '', district: '', language: '', gender: '', freeScheme: '' },
    sortBy: 'rank',
    startTime: performance.now(),
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------------- UI helpers ---------------- */
  function showLoading(show) {
    const l = $('#loading-screen');
    if (!l) return;
    if (show) l.classList.remove('hidden');
    else setTimeout(() => l.classList.add('hidden'), 200);
  }
  function showToast(msg, type = 'info') {
    const c = $('#toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ------------ Data loading with fallback ------------- */
  async function fetchCsvText() {
    try {
      const res = await fetch(CSV_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.statusText);
      return await res.text();
    } catch (e) {
      console.warn('CSV fetch failed, using empty data.', e);
      showToast('無法連接教育局伺服器，資料以預設顯示', 'warning');
      return null; // signal failure
    }
  }

  async function loadData() {
    showLoading(true);
    let csvText = await fetchCsvText();

    // default update date is today
    const todayStr = new Date().toISOString().split('T')[0];
    $('#last-updated').textContent = todayStr;

    let rows = [];
    if (csvText) {
      const { data } = Papa.parse(csvText, {
        delimiter: CSV_DELIMITER,
        header: true,
        preview: CSV_PREVIEW_LINES,
        skipEmptyLines: true,
      });
      rows = data;
    }

    const map = new Map();
    rows.forEach((r) => {
      const key = (r.school_name_en || '').trim().toUpperCase();
      if (key) map.set(key, r);
    });

    state.kindergartens = rankings.map((rk) => {
      const r = map.get(rk.englishName) || {};
      return {
        id: `kg-${rk.rank}`,
        rank: rk.rank,
        englishName: rk.englishName,
        chineseName: r.school_name_cn || '待查',
        district: r.district || '待查',
        tuition: r.fees_certificate || '待查',
        tel: r.tel || '待查',
        address: r.address || '待查',
        website: r.school_website || '',
        freeScheme: r.joining_kg_edu_scheme === 'Yes' ? '有' : r.joining_kg_edu_scheme === 'No' ? '沒有' : '待查',
        teachingLanguage: r.teaching_language || '待查',
        gender: r.sex_of_students || '待查',
        relationship: r.school_type || '待查',
      };
    });

    state.filtered = [...state.kindergartens];
    populateFilters();
    sortData();
    render();
    recordPerf();
    showLoading(false);
  }

  /* ---------------- Filters & Sorting ----------------- */
  function populateSelect(id, opts) {
    const sel = $(id);
    if (!sel) return;
    opts.forEach((val) => {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = val;
      sel.appendChild(o);
    });
  }
  function populateFilters() {
    const d = new Set();
    const l = new Set();
    const g = new Set();
    const fs = new Set();
    state.kindergartens.forEach((k) => {
      if (k.district !== '待查') d.add(k.district);
      if (k.teachingLanguage !== '待查') l.add(k.teachingLanguage);
      if (k.gender !== '待查') g.add(k.gender);
      if (k.freeScheme !== '待查') fs.add(k.freeScheme);
    });
    populateSelect('#district-filter', [...d].sort());
    populateSelect('#language-filter', [...l].sort());
    populateSelect('#gender-filter', [...g].sort());
    populateSelect('#free-scheme-filter', [...fs]);
  }

  function tuitionVal(t) {
    if (t === '免費') return 0;
    const m = t.match(/\$?([\d,]+)/);
    return m ? parseInt(m[1].replace(/,/g, '')) : Infinity;
  }
  function sortData() {
    const key = state.sortBy;
    state.filtered.sort((a, b) => {
      switch (key) {
        case 'rank':
          return a.rank - b.rank;
        case 'nameAsc':
          return a.chineseName.localeCompare(b.chineseName);
        case 'nameDesc':
          return b.chineseName.localeCompare(a.chineseName);
        case 'district':
          return a.district.localeCompare(b.district);
        case 'tuitionAsc':
          return tuitionVal(a.tuition) - tuitionVal(b.tuition);
        case 'tuitionDesc':
          return tuitionVal(b.tuition) - tuitionVal(a.tuition);
        default:
          return 0;
      }
    });
  }

  function applyFilters() {
    const f = state.filters;
    state.filtered = state.kindergartens.filter((k) => {
      const matchSearch = !f.search || k.chineseName.includes(f.search) || k.englishName.includes(f.search.toUpperCase());
      const matchDistrict = !f.district || k.district === f.district;
      const matchLang = !f.language || k.teachingLanguage === f.language;
      const matchGender = !f.gender || k.gender === f.gender;
      const matchFS = !f.freeScheme || k.freeScheme === f.freeScheme;
      return matchSearch && matchDistrict && matchLang && matchGender && matchFS;
    });
    sortData();
    render();
  }

  /* ---------------- Rendering ----------------*/
  let observer;
  function initObserver() {
    if (!('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) {
          const el = en.target;
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.1 });
  }

  function createCard(k) {
    const card = document.createElement('div');
    card.className = 'card kindergarten-card';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity .3s ease, transform .3s ease';
    const fav = state.favorites.has(k.id);
    card.innerHTML = `
      <div class="card__header">
        <div class="card__rank">#${k.rank}</div>
        <button class="bookmark-btn ${fav ? 'active' : ''}" data-id="${k.id}" aria-label="${fav ? '取消收藏' : '加入收藏'} ${k.chineseName}"><span class="bookmark-icon">${fav ? '⭐' : '☆'}</span></button>
      </div>
      <div class="card__body">
        <h3 class="card__title">${k.chineseName}</h3>
        <p class="card__subtitle">${k.englishName}</p>
        <div class="card__details">
          <p><strong>區域：</strong>${k.district}</p>
          <p><strong>學費：</strong>${k.tuition}</p>
          <p><strong>教學語言：</strong>${k.teachingLanguage}</p>
          <p><strong>性別：</strong>${k.gender}</p>
        </div>
        <div class="card__actions">
          <button class="btn btn--primary btn--sm detail-btn" data-id="${k.id}">查看詳情</button>
          ${k.website ? `<a class="btn btn--outline btn--sm" href="${k.website}" target="_blank" rel="noopener noreferrer">官網</a>` : ''}
        </div>
      </div>`;
    return card;
  }

  function render() {
    const grid = $('#kindergarten-grid');
    const skel = $('#skeleton-container');
    const nores = $('#no-results');
    skel.style.display = 'none';
    $('#results-count').textContent = `顯示 ${state.filtered.length} 間幼稚園`;
    $('#export-btn').disabled = state.filtered.length === 0;

    if (state.filtered.length === 0) {
      grid.innerHTML = '';
      nores.style.display = 'block';
      return;
    }
    nores.style.display = 'none';
    grid.innerHTML = '';
    state.filtered.forEach((k) => {
      const card = createCard(k);
      grid.appendChild(card);
      if (observer) observer.observe(card);
    });
    $('#display-count').textContent = state.filtered.length;
  }

  /* ---------------- Modal ----------------*/
  function openModal(k) {
    const modal = $('#detail-modal');
    $('#modal-title').textContent = k.chineseName;
    $('#modal-body').innerHTML = `
      <div class="modal-details">
        <h4>${k.englishName}</h4>
        <div class="detail-grid">
          <div class="detail-item"><strong>排名：</strong><span>#${k.rank}</span></div>
          <div class="detail-item"><strong>區域：</strong><span>${k.district}</span></div>
          <div class="detail-item"><strong>學費：</strong><span>${k.tuition}</span></div>
          <div class="detail-item"><strong>性別：</strong><span>${k.gender}</span></div>
          <div class="detail-item"><strong>教學語言：</strong><span>${k.teachingLanguage}</span></div>
          <div class="detail-item"><strong>免費計劃：</strong><span>${k.freeScheme}</span></div>
          <div class="detail-item"><strong>電話：</strong><span>${k.tel}</span></div>
        </div>
        <div class="address-section"><strong>地址：</strong><p>${k.address}</p></div>
        ${k.website ? `<div class="website-section"><a href="${k.website}" class="btn btn--primary" target="_blank" rel="noopener noreferrer">官方網站 🔗</a></div>` : ''}
      </div>`;
    updateBookmarkBtn($('#bookmark-btn'), k.id);
    $('#bookmark-btn').onclick = () => toggleFavorite(k.id);
    modal.classList.remove('hidden');
    setTimeout(() => $('#modal-title').focus(), 100);
  }
  function closeModal() { $('#detail-modal').classList.add('hidden'); }

  /* -------- Favorites -------- */
  function updateBookmarkBtn(btn, id) {
    const fav = state.favorites.has(id);
    btn.innerHTML = `<span class="bookmark-icon">${fav ? '⭐' : '☆'}</span> ${fav ? '已收藏' : '收藏'}`;
  }
  function toggleFavorite(id) {
    if (state.favorites.has(id)) {
      state.favorites.delete(id); showToast('已移除收藏');
    } else {
      state.favorites.add(id); showToast('已加入收藏', 'success');
    }
    render();
    updateBookmarkBtn($('#bookmark-btn'), id);
  }

  /* ------------- Event Binding ------------- */
  function bindEvents() {
    // Retry button (hidden overlay removed)
    $('#retry-btn').addEventListener('click', () => { loadData(); });

    // Search
    $('#search-input').addEventListener('input', debounce((e) => {
      state.filters.search = e.target.value.trim();
      applyFilters();
    }, 300));

    // Filter selects (apply button)
    ['district', 'language', 'gender', 'free-scheme'].forEach((k) => {
      $(`#${k}-filter`).addEventListener('change', (e) => {
        const key = k === 'free-scheme' ? 'freeScheme' : k;
        state.filters[key] = e.target.value;
      });
    });
    $('#apply-filters').addEventListener('click', () => { applyFilters(); toggleFilterPanel(false); });
    $('#clear-filters').addEventListener('click', clearFilters);

    $('#filter-toggle').addEventListener('click', () => {
      const open = toggleFilterPanel();
      $('.filter-toggle__icon').textContent = open ? '▲' : '▼';
    });

    $('#sort-select').addEventListener('change', (e) => { state.sortBy = e.target.value; sortData(); render(); });

    $('#export-btn').addEventListener('click', exportCSV);
    $('#reset-search').addEventListener('click', clearFilters);

    // cards & modal delegation
    document.addEventListener('click', (e) => {
      const favBtn = e.target.closest('.bookmark-btn');
      if (favBtn) toggleFavorite(favBtn.dataset.id);
      const dBtn = e.target.closest('.detail-btn');
      if (dBtn) {
        const kg = state.kindergartens.find((k) => k.id === dBtn.dataset.id);
        if (kg) openModal(kg);
      }
      if (e.target.dataset.closeModal !== undefined || e.target.classList.contains('modal__backdrop')) closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // Theme toggle
    $('#theme-toggle').addEventListener('click', () => {
      const root = document.documentElement;
      const now = root.getAttribute('data-color-scheme');
      const next = now === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-color-scheme', next);
      $('.theme-toggle__icon').textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }

  function toggleFilterPanel(force) {
    const panel = $('#filter-panel');
    const open = force !== undefined ? force : !panel.classList.contains('open');
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    $('#filter-toggle').setAttribute('aria-expanded', String(open));
    return open;
  }

  /* -------- CSV Export -------- */
  function exportCSV() {
    if (!state.filtered.length) return;
    const headers = ['Rank', 'ChineseName', 'EnglishName', 'District', 'Tuition', 'Tel', 'FreeScheme', 'Website', 'Address'];
    const rows = state.filtered.map((k) => [k.rank, k.chineseName, k.englishName, k.district, k.tuition, k.tel, k.freeScheme, k.website, k.address]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kindergartens_${Date.now()}.csv`;
    link.click();
  }

  /* -------------- Utils -------------- */
  function debounce(fn, wait = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; }
  function recordPerf() { $('#load-time').textContent = Math.round(performance.now() - state.startTime); }

  /* -------------- Init -------------- */
  function init() {
    bindEvents();
    initObserver();
    loadData();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
