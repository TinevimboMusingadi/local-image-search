import { API_BASE } from './config.js';

const html = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);

const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  themeToggle.querySelector('.theme-label').textContent =
    newTheme === 'dark' ? 'Light' : 'Dark';
});
themeToggle.querySelector('.theme-label').textContent =
  savedTheme === 'dark' ? 'Light' : 'Dark';

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

function updateFullscreenButton() {
  const btn = document.getElementById('fullscreenBtn');
  const enter = btn?.querySelector('.fullscreen-icon');
  const exit = btn?.querySelector('.fullscreen-exit-icon');
  if (!btn || !enter || !exit) return;
  if (document.fullscreenElement) {
    enter.style.display = 'none';
    exit.style.display = 'block';
  } else {
    enter.style.display = 'block';
    exit.style.display = 'none';
  }
}

document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenButton);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    toggleFullscreen();
  }
});

const els = {
  folderPath: document.getElementById('folderPath'),
  indexBtn: document.getElementById('indexBtn'),
  indexStatus: document.getElementById('indexStatus'),
  indexedCount: document.getElementById('indexedCount'),
  queryText: document.getElementById('queryText'),
  searchTextBtn: document.getElementById('searchTextBtn'),
  queryImageFile: document.getElementById('queryImageFile'),
  uploadArea: document.getElementById('uploadArea'),
  uploadPreview: document.getElementById('uploadPreview'),
  searchImageBtn: document.getElementById('searchImageBtn'),
  similarPath: document.getElementById('similarPath'),
  searchSimilarBtn: document.getElementById('searchSimilarBtn'),
  searchStatus: document.getElementById('searchStatus'),
  resultsGrid: document.getElementById('resultsGrid'),
  resultCount: document.getElementById('resultCount'),
  topKText: document.getElementById('topKText'),
  topKImage: document.getElementById('topKImage'),
  topKSimilar: document.getElementById('topKSimilar'),
  minScore: document.getElementById('minScore'),
};

function setStatus(el, message, type) {
  el.textContent = message;
  el.className = 'status' + (type ? ' ' + type : '');
  el.style.display = message ? 'block' : 'none';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  const textEl = btn.querySelector('.btn-text') || btn;
  const text = textEl.textContent;
  if (loading) {
    btn.dataset.originalText = text;
    textEl.textContent = '...';
  } else {
    textEl.textContent = btn.dataset.originalText || text;
  }
}

function loadStats() {
  fetch((API_BASE || '') + '/stats')
    .then((res) => res.json())
    .then((data) => {
      els.indexedCount.textContent = data.total_images + ' indexed';
    })
    .catch(() => {
      els.indexedCount.textContent = 'Offline';
    });
}
loadStats();
setInterval(loadStats, 5000);

els.indexBtn.addEventListener('click', async () => {
  const folderPath = els.folderPath.value.trim() || 'test_photos';
  setStatus(els.indexStatus, 'Indexing images...', '');
  setLoading(els.indexBtn, true);
  try {
    const res = await fetch((API_BASE || '') + '/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_path: folderPath, collection_name: 'images' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(els.indexStatus, data.detail || res.statusText, 'error');
      return;
    }
    setStatus(els.indexStatus, 'Indexed ' + data.indexed + ' images successfully!', 'success');
    loadStats();
  } catch (e) {
    setStatus(els.indexStatus, 'Error: ' + e.message, 'error');
  } finally {
    setLoading(els.indexBtn, false);
  }
});

document.querySelectorAll('.tab-btn').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    const tabName = tab.dataset.tab;
    const panelId =
      { text: 'textSearchPanel', image: 'imageSearchPanel', similar: 'similarSearchPanel' }[
        tabName
      ];
    if (panelId) document.getElementById(panelId).classList.add('active');
  });
});

els.queryImageFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      els.uploadPreview.innerHTML = '<img src="' + ev.target.result + '" alt="Preview">';
    };
    reader.readAsDataURL(file);
  } else {
    els.uploadPreview.innerHTML = '';
  }
});

els.uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  els.uploadArea.classList.add('drag-over');
});
els.uploadArea.addEventListener('dragleave', () => els.uploadArea.classList.remove('drag-over'));
els.uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  els.uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    els.queryImageFile.files = e.dataTransfer.files;
    els.queryImageFile.dispatchEvent(new Event('change'));
  }
});

function renderResults(results) {
  els.resultCount.textContent = results.length;
  els.resultsGrid.innerHTML = '';
  const emptyState = document.getElementById('emptyState');
  if (results.length === 0) {
    emptyState.style.display = 'block';
    els.resultsGrid.style.display = 'none';
    return;
  }
  emptyState.style.display = 'none';
  els.resultsGrid.style.display = 'grid';
  results.forEach((r) => {
    const pathEnc = encodeURIComponent(r.path);
    const url = (API_BASE || '') + '/files?path=' + pathEnc;
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML =
      '<div class="img-wrap">' +
      '<div class="rank-badge">' + r.rank + '</div>' +
      '<img src="' + url + '" alt="Result ' + r.rank + '" loading="lazy">' +
      '</div>' +
      '<div class="meta">Score: <span class="score-value">' + r.score.toFixed(3) + '</span></div>';
    const img = card.querySelector('img');
    img.addEventListener('error', function () {
      this.classList.add('fail');
      this.alt = 'Failed to load';
    });
    img.addEventListener('click', () => window.open(url, '_blank'));
    els.resultsGrid.appendChild(card);
  });
}

els.searchTextBtn.addEventListener('click', async () => {
  const q = els.queryText.value.trim();
  if (!q) {
    setStatus(els.searchStatus, 'Enter a search query.', 'error');
    return;
  }
  setStatus(els.searchStatus, 'Searching...', '');
  setLoading(els.searchTextBtn, true);
  try {
    const topK = parseInt(els.topKText.value) || 20;
    const res = await fetch(
      (API_BASE || '') + '/search?q=' + encodeURIComponent(q) + '&top_k=' + topK
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(els.searchStatus, data.detail || res.statusText, 'error');
      renderResults([]);
      return;
    }
    setStatus(els.searchStatus, 'Found ' + (data.results?.length || 0) + ' results', 'success');
    renderResults(data.results || []);
  } catch (e) {
    setStatus(els.searchStatus, 'Error: ' + e.message, 'error');
    renderResults([]);
  } finally {
    setLoading(els.searchTextBtn, false);
  }
});

els.queryText.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') els.searchTextBtn.click();
});

els.searchImageBtn.addEventListener('click', async () => {
  const file = els.queryImageFile.files[0];
  if (!file) {
    setStatus(els.searchStatus, 'Choose or drop an image file.', 'error');
    return;
  }
  setStatus(els.searchStatus, 'Analyzing image and searching...', '');
  setLoading(els.searchImageBtn, true);
  try {
    const topK = parseInt(els.topKImage.value) || 20;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch((API_BASE || '') + '/search/by-image?top_k=' + topK, {
      method: 'POST',
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(els.searchStatus, data.detail || res.statusText, 'error');
      renderResults([]);
      return;
    }
    setStatus(els.searchStatus, 'Found ' + (data.results?.length || 0) + ' similar images', 'success');
    renderResults(data.results || []);
  } catch (e) {
    setStatus(els.searchStatus, 'Error: ' + e.message, 'error');
    renderResults([]);
  } finally {
    setLoading(els.searchImageBtn, false);
  }
});

els.searchSimilarBtn.addEventListener('click', async () => {
  const path = els.similarPath.value.trim();
  if (!path) {
    setStatus(els.searchStatus, 'Enter a path to an indexed image.', 'error');
    return;
  }
  setStatus(els.searchStatus, 'Finding similar images...', '');
  setLoading(els.searchSimilarBtn, true);
  try {
    const topK = parseInt(els.topKSimilar.value) || 10;
    const minScore = parseFloat(els.minScore.value) || 0;
    const res = await fetch(
      (API_BASE || '') +
        '/search/similar?path=' +
        encodeURIComponent(path) +
        '&top_k=' +
        topK +
        '&min_score=' +
        minScore
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(els.searchStatus, data.detail || res.statusText, 'error');
      renderResults([]);
      return;
    }
    setStatus(els.searchStatus, 'Found ' + (data.results?.length || 0) + ' similar images', 'success');
    renderResults(data.results || []);
  } catch (e) {
    setStatus(els.searchStatus, 'Error: ' + e.message, 'error');
    renderResults([]);
  } finally {
    setLoading(els.searchSimilarBtn, false);
  }
});

els.similarPath.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') els.searchSimilarBtn.click();
});
