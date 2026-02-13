(function () {
  const API_BASE = '';

  const els = {
    folderPath: document.getElementById('folderPath'),
    indexBtn: document.getElementById('indexBtn'),
    indexStatus: document.getElementById('indexStatus'),
    queryText: document.getElementById('queryText'),
    searchTextBtn: document.getElementById('searchTextBtn'),
    queryImageFile: document.getElementById('queryImageFile'),
    searchImageBtn: document.getElementById('searchImageBtn'),
    searchStatus: document.getElementById('searchStatus'),
    resultsGrid: document.getElementById('resultsGrid'),
    resultCount: document.getElementById('resultCount'),
  };

  function setStatus(el, message, type) {
    el.textContent = message;
    el.className = 'status' + (type ? ' ' + type : '');
  }

  function setLoading(button, loading) {
    button.disabled = loading;
    button.textContent = loading ? '…' : button.dataset.label || button.textContent;
  }

  // Index
  els.indexBtn.dataset.label = 'Index images';
  els.indexBtn.addEventListener('click', async () => {
    const folderPath = els.folderPath.value.trim() || 'test_photos';
    setStatus(els.indexStatus, 'Indexing…');
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
      setStatus(els.indexStatus, `Indexed ${data.indexed} images.`, 'success');
    } catch (e) {
      setStatus(els.indexStatus, 'Error: ' + e.message, 'error');
    } finally {
      setLoading(els.indexBtn, false);
    }
  });

  // Search tabs
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      const panelId = tab.dataset.tab === 'text' ? 'textSearchPanel' : 'imageSearchPanel';
      document.getElementById(panelId).classList.add('active');
    });
  });

  function renderResults(results) {
    els.resultCount.textContent = results.length ? `(${results.length})` : '';
    els.resultsGrid.innerHTML = '';
    results.forEach((r) => {
      const pathEnc = encodeURIComponent(r.path);
      const url = API_BASE + '/files?path=' + pathEnc;
      const card = document.createElement('div');
      card.className = 'result-card';
      card.innerHTML =
        '<div class="img-wrap">' +
        '<img src="' + url + '" alt="Result ' + r.rank + '" loading="lazy">' +
        '</div>' +
        '<div class="meta">' +
        '<span class="rank">#' + r.rank + '</span>' +
        '<div class="score">Score: ' + r.score + '</div>' +
        '</div>';
      card.querySelector('img').addEventListener('error', function () {
        this.classList.add('fail');
      });
      els.resultsGrid.appendChild(card);
    });
  }

  // Text search
  els.searchTextBtn.dataset.label = 'Search';
  els.searchTextBtn.addEventListener('click', async () => {
    const q = els.queryText.value.trim();
    if (!q) {
      setStatus(els.searchStatus, 'Enter a search query.', 'error');
      return;
    }
    setStatus(els.searchStatus, 'Searching…');
    setLoading(els.searchTextBtn, true);
    try {
      const res = await fetch(
        API_BASE + '/search?q=' + encodeURIComponent(q) + '&top_k=20'
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(els.searchStatus, data.detail || res.statusText, 'error');
        renderResults([]);
        return;
      }
      setStatus(els.searchStatus, '');
      renderResults(data.results || []);
    } catch (e) {
      setStatus(els.searchStatus, 'Error: ' + e.message, 'error');
      renderResults([]);
    } finally {
      setLoading(els.searchTextBtn, false);
    }
  });

  // Search by image (upload)
  els.searchImageBtn.dataset.label = 'Search by image';
  els.searchImageBtn.addEventListener('click', async () => {
    const file = els.queryImageFile.files[0];
    if (!file) {
      setStatus(els.searchStatus, 'Choose an image file.', 'error');
      return;
    }
    setStatus(els.searchStatus, 'Searching…');
    setLoading(els.searchImageBtn, true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(
        API_BASE + '/search/by-image?top_k=20',
        { method: 'POST', body: form }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(els.searchStatus, data.detail || res.statusText, 'error');
        renderResults([]);
        return;
      }
      setStatus(els.searchStatus, '');
      renderResults(data.results || []);
    } catch (e) {
      setStatus(els.searchStatus, 'Error: ' + e.message, 'error');
      renderResults([]);
    } finally {
      setLoading(els.searchImageBtn, false);
    }
  });
})();
