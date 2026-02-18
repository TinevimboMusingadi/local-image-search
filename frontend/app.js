(function () {
  const API_BASE = '';

  // Theme management
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    themeToggle.querySelector('.theme-icon').textContent = theme === 'dark' ? 'Light' : 'Dark';
  }

  // Elements
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

  // Status helpers
  function setStatus(el, message, type) {
    el.textContent = message;
    el.className = 'status' + (type ? ' ' + type : '');
    el.style.display = message ? 'block' : 'none';
  }

  function setLoading(button, loading) {
    button.disabled = loading;
    const icon = button.querySelector('.btn-icon');
    const text = button.querySelector('.btn-text');
    if (loading) {
      button.dataset.originalText = text.textContent;
      text.textContent = '…';
      if (icon) icon.style.opacity = '0.5';
    } else {
      text.textContent = button.dataset.originalText || text.textContent;
      if (icon) icon.style.opacity = '1';
    }
  }

  // Load stats
  function loadStats() {
    fetch(API_BASE + '/stats')
      .then(res => res.json())
      .then(data => {
        els.indexedCount.textContent = `${data.total_images} indexed`;
      })
      .catch(() => {});
  }
  loadStats();
  setInterval(loadStats, 5000);

  // Index
  els.indexBtn.addEventListener('click', async () => {
    const folderPath = els.folderPath.value.trim() || 'test_photos';
    setStatus(els.indexStatus, 'Indexing images…', '');
    setLoading(els.indexBtn, true);
    try {
      const res = await fetch(API_BASE + '/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: folderPath, collection_name: 'images' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(els.indexStatus, data.detail || res.statusText, 'error');
        return;
      }
      setStatus(els.indexStatus, `✅ Indexed ${data.indexed} images successfully!`, 'success');
      loadStats();
    } catch (e) {
      setStatus(els.indexStatus, '❌ Error: ' + e.message, 'error');
    } finally {
      setLoading(els.indexBtn, false);
    }
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      const panelId = {
        text: 'textSearchPanel',
        image: 'imageSearchPanel',
        similar: 'similarSearchPanel',
      }[tabName];
      if (panelId) {
        document.getElementById(panelId).classList.add('active');
      }
    });
  });

  // Image upload preview
  els.queryImageFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        els.uploadPreview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    } else {
      els.uploadPreview.innerHTML = '';
    }
  });

  els.uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.uploadArea.style.borderColor = 'var(--accent)';
    els.uploadArea.style.background = 'rgba(13, 13, 13, 0.05)';
  });

  els.uploadArea.addEventListener('dragleave', () => {
    els.uploadArea.style.borderColor = '';
    els.uploadArea.style.background = '';
  });

  els.uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    els.uploadArea.style.borderColor = '';
    els.uploadArea.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      els.queryImageFile.files = e.dataTransfer.files;
      els.queryImageFile.dispatchEvent(new Event('change'));
    }
  });

  // Render results
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
      const url = API_BASE + '/files?path=' + pathEnc;
      const card = document.createElement('div');
      card.className = 'result-card';
      card.innerHTML =
        '<div class="img-wrap">' +
        '<div class="rank-badge">' + r.rank + '</div>' +
        '<img src="' + url + '" alt="Result ' + r.rank + '" loading="lazy">' +
        '</div>' +
        '<div class="meta">' +
        '<span class="score">Score: <span class="score-value">' + r.score.toFixed(3) + '</span></span>' +
        '</div>';
      const img = card.querySelector('img');
      img.addEventListener('error', function () {
        this.classList.add('fail');
        this.alt = 'Failed to load';
      });
      img.addEventListener('click', () => {
        window.open(url, '_blank');
      });
      els.resultsGrid.appendChild(card);
    });
  }

  // Text search
  els.searchTextBtn.addEventListener('click', async () => {
    const q = els.queryText.value.trim();
    if (!q) {
      setStatus(els.searchStatus, 'Enter a search query.', 'error');
      return;
    }
    setStatus(els.searchStatus, '🔍 Searching…', '');
    setLoading(els.searchTextBtn, true);
    try {
      const topK = parseInt(els.topKText.value) || 20;
      const res = await fetch(
        API_BASE + '/search?q=' + encodeURIComponent(q) + '&top_k=' + topK
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(els.searchStatus, '❌ ' + (data.detail || res.statusText), 'error');
        renderResults([]);
        return;
      }
      setStatus(els.searchStatus, `✅ Found ${data.results.length} results`, 'success');
      renderResults(data.results || []);
    } catch (e) {
      setStatus(els.searchStatus, '❌ Error: ' + e.message, 'error');
      renderResults([]);
    } finally {
      setLoading(els.searchTextBtn, false);
    }
  });

  els.queryText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      els.searchTextBtn.click();
    }
  });

  // Image search
  els.searchImageBtn.addEventListener('click', async () => {
    const file = els.queryImageFile.files[0];
    if (!file) {
      setStatus(els.searchStatus, 'Choose or drop an image file.', 'error');
      return;
    }
    setStatus(els.searchStatus, '🔍 Analyzing image and searching…', '');
    setLoading(els.searchImageBtn, true);
    try {
      const topK = parseInt(els.topKImage.value) || 20;
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(
        API_BASE + '/search/by-image?top_k=' + topK,
        { method: 'POST', body: form }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(els.searchStatus, '❌ ' + (data.detail || res.statusText), 'error');
        renderResults([]);
        return;
      }
      setStatus(els.searchStatus, `✅ Found ${data.results.length} similar images`, 'success');
      renderResults(data.results || []);
    } catch (e) {
      setStatus(els.searchStatus, '❌ Error: ' + e.message, 'error');
      renderResults([]);
    } finally {
      setLoading(els.searchImageBtn, false);
    }
  });

  // Similar search
  els.searchSimilarBtn.addEventListener('click', async () => {
    const path = els.similarPath.value.trim();
    if (!path) {
      setStatus(els.searchStatus, 'Enter a path to an indexed image.', 'error');
      return;
    }
    setStatus(els.searchStatus, '🔍 Finding similar images…', '');
    setLoading(els.searchSimilarBtn, true);
    try {
      const topK = parseInt(els.topKSimilar.value) || 10;
      const minScore = parseFloat(els.minScore.value) || 0.0;
      const pathEnc = encodeURIComponent(path);
      const res = await fetch(
        API_BASE + '/search/similar?path=' + pathEnc + '&top_k=' + topK + '&min_score=' + minScore
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(els.searchStatus, '❌ ' + (data.detail || res.statusText), 'error');
        renderResults([]);
        return;
      }
      setStatus(els.searchStatus, `✅ Found ${data.results.length} similar images`, 'success');
      renderResults(data.results || []);
    } catch (e) {
      setStatus(els.searchStatus, '❌ Error: ' + e.message, 'error');
      renderResults([]);
    } finally {
      setLoading(els.searchSimilarBtn, false);
    }
  });

  els.similarPath.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      els.searchSimilarBtn.click();
    }
  });
})();
