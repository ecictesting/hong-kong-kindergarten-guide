/* app.js: 靜態 JSON 讀取與 UI 互動 */

const SPINNER = document.getElementById('spinner');
const ERROR_BANNER = document.getElementById('error-banner');
const LIST = document.getElementById('card-list');
const RESULT_COUNTER = document.getElementById('result-counter');

const FILTERS = {
  association: document.getElementById('association-filter'),
  gender: document.getElementById('gender-filter'),
  language: document.getElementById('lang-filter'),
  free: document.getElementById('free-filter'),
  districts: document.getElementById('district-filter'),
};

const BTN_APPLY = document.getElementById('apply-btn');
const BTN_CLEAR = document.getElementById('clear-btn');

let data = []; // 全部
let filtered = []; // 目前結果

/* ---------- 工具 ---------- */
const showSpinner = (show) => {
  if (show) SPINNER.classList.remove('hidden');
  else SPINNER.classList.add('hidden');
};
const showError = (show) => {
  if (show) ERROR_BANNER.classList.remove('hidden');
  else ERROR_BANNER.classList.add('hidden');
};

/* ---------- 初始化 ---------- */
(async function init() {
  bindEvents();
  await loadJSON();
})();

/* ---------- 讀取 JSON ---------- */
async function loadJSON() {
  showSpinner(true);
  try {
    const res = await fetch('merged.json');
    if (!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    data = json;
    initFilters();
    applyFilter();
  } catch (err) {
    console.error(err);
    showError(true);
  } finally {
    showSpinner(false);
  }
}

/* ---------- 建立篩選選項 ---------- */
function unique(arr) { return [...new Set(arr)].filter(Boolean).sort(); }
function fillSelect(select, list, includeAll = true) {
  if (includeAll) select.innerHTML = '<option value="">全部</option>';
  list.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}
function initFilters() {
  fillSelect(FILTERS.association, unique(data.map((d) => d.association)));
  fillSelect(FILTERS.gender, unique(data.map((d) => d.gender)));
  fillSelect(FILTERS.language, unique(data.map((d) => d.language)));
  // free 已固定 有/沒有
  fillSelect(
    FILTERS.districts,
    unique(data.map((d) => d.district)),
    false
  );
}

/* ---------- 篩選邏輯 ---------- */
function applyFilter() {
  const sel = {
    association: FILTERS.association.value,
    gender: FILTERS.gender.value,
    language: FILTERS.language.value,
    free: FILTERS.free.value,
    districts: Array.from(FILTERS.districts.selectedOptions).map((o) => o.value),
  };
  filtered = data.filter((k) => {
    return (
      (!sel.association || k.association === sel.association) &&
      (!sel.gender || k.gender === sel.gender) &&
      (!sel.language || k.language === sel.language) &&
      (!sel.free || k.freeScheme === sel.free) &&
      (!sel.districts.length || sel.districts.includes(k.district))
    );
  });
  renderCards();
}

/* ---------- 渲染 ---------- */
function renderCards() {
  RESULT_COUNTER.textContent = `共 ${filtered.length} 間幼稚園顯示`;
  LIST.innerHTML = '';
  filtered.forEach((k) => LIST.appendChild(createCard(k)));
}

function createCard(k) {
  const card = document.createElement('article');
  card.className = 'card-item';
  if (k.rank === 1) card.classList.add('card-highlight');

  card.innerHTML = `
    <div class="card-header" role="button" tabindex="0">
      <span class="card-title">#${k.rank} ${k.chineseName}</span>
      <span class="card-sub">${k.englishName}</span>
    </div>
    <div class="card-body">
      <p><strong>地區：</strong>${k.district}</p>
      <p><strong>辦學團體：</strong>${k.association}</p>
      <p><strong>教學語言：</strong>${k.language}</p>
      <p><strong>性別：</strong>${k.gender}</p>
      <p><strong>免費計劃：</strong>${k.freeScheme}</p>
      <a class="btn btn--outline btn--sm card-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        k.address
      )}" target="_blank" rel="noopener noreferrer">在 Google 地圖開啟</a>
    </div>
  `;

  const header = card.querySelector('.card-header');
  const body = card.querySelector('.card-body');
  const toggle = () => {
    body.classList.toggle('open');
  };
  header.addEventListener('click', toggle);
  header.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });

  // Kentville Kindergarten 預設展開 (假設中文名含「根德園」)
  if (k.chineseName.includes('根德園')) body.classList.add('open');

  return card;
}

/* ---------- 事件 ---------- */
function bindEvents() {
  BTN_APPLY.addEventListener('click', applyFilter);
  BTN_CLEAR.addEventListener('click', () => {
    Object.values(FILTERS).forEach((el) => {
      if (el.multiple) {
        Array.from(el.options).forEach((o) => (o.selected = false));
      } else {
        el.value = '';
      }
    });
    applyFilter();
  });
  // 顏色主題
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.getAttribute('data-color-scheme');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-color-scheme', next);
    document.getElementById('theme-icon').textContent = next === 'dark' ? '☀️' : '🌙';
  });
}
