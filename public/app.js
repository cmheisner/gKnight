// Minimal frontend logic to call the server endpoints and render results

const $ = id => document.getElementById(id);
const status = $('status');
const results = $('results');
const btnFind = $('btnFindCommon');
const btnClear = $('btnClear');

let currentPage = 1;
let totalPages = 1;
let lastSteamIds = '';

function setStatus(msg) { status.textContent = msg; }
function clearResults() { results.innerHTML = ''; }

btnClear.addEventListener('click', () => {
  $('steamIds').value = '';
  clearResults();
  setStatus('');
  currentPage = 1;
  totalPages = 1;
});

async function fetchAndRender(page = 1) {
  clearResults();
  const raw = $('steamIds').value.trim();
  if (!raw) { setStatus('Please enter at least one Steam ID.'); return; }
  const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (ids.length < 1) { setStatus('No valid IDs found.'); return; }

  lastSteamIds = ids.join(',');
  setStatus(`Fetching common games for ${ids.length} users (page ${page})...`);

  try {
    const idsParam = encodeURIComponent(ids.join(','));
    const commonResp = await fetch(`/api/commonGames?ids=${idsParam}&page=${page}&limit=20`);
    const commonJson = await commonResp.json();
    if (commonJson.error) throw new Error(commonJson.error);

    const commonGames = commonJson.commonGames || [];
    const pagination = commonJson.pagination || {};
    currentPage = pagination.page || 1;
    totalPages = pagination.pages || 1;

    if (commonGames.length === 0 && page === 1) {
      setStatus('No common games found.');
      return;
    }

    setStatus(`Found ${pagination.total} common games total (page ${currentPage}/${totalPages}). Fetching details...`);
    const appids = commonGames.map(g => g.appid).join(',');
    const detailsResp = await fetch(`/api/appDetails?appids=${encodeURIComponent(appids)}`);
    const detailsJson = await detailsResp.json();
    if (detailsJson.error) throw new Error(detailsJson.error);

    // Build a map of appid -> data
    const map = new Map();
    (detailsJson.results || []).forEach(r => {
      if (r.success && r.data) map.set(String(r.appid), r.data);
    });

    // Render table
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Image</th><th>Name</th><th>Short Description</th><th>Genres / Categories</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');

    commonGames.forEach(g => {
      const data = map.get(String(g.appid));
      const tr = document.createElement('tr');
      const imgCell = document.createElement('td');
      const img = document.createElement('img');
      img.className = 'cover';
      img.src = (data && data.header_image) ? data.header_image : '';
      img.alt = g.name;
      imgCell.appendChild(img);

      const nameCell = document.createElement('td');
      const link = document.createElement('a');
      link.href = `https://store.steampowered.com/app/${g.appid}`;
      link.target = '_blank';
      link.textContent = g.name;
      nameCell.appendChild(link);

      const descCell = document.createElement('td');
      descCell.textContent = (data && data.short_description) ? data.short_description : 'N/A';

      const metaCell = document.createElement('td');
      const genres = (data && data.genres) ? data.genres.map(x => x.description).join(', ') : '';
      const cats = (data && data.categories) ? data.categories.map(x => x.description).join(', ') : '';
      metaCell.textContent = `${genres}${genres && cats ? ' / ' : ''}${cats}` || 'N/A';

      tr.appendChild(imgCell);
      tr.appendChild(nameCell);
      tr.appendChild(descCell);
      tr.appendChild(metaCell);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    results.appendChild(table);

    // Add pagination controls
    if (totalPages > 1) {
      const paginationDiv = document.createElement('div');
      paginationDiv.style.marginTop = '16px';
      paginationDiv.style.textAlign = 'center';

      if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Previous';
        prevBtn.addEventListener('click', () => fetchAndRender(currentPage - 1));
        paginationDiv.appendChild(prevBtn);
      }

      const pageSpan = document.createElement('span');
      pageSpan.textContent = ` Page ${currentPage} / ${totalPages} `;
      pageSpan.style.margin = '0 12px';
      paginationDiv.appendChild(pageSpan);

      if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next →';
        nextBtn.addEventListener('click', () => fetchAndRender(currentPage + 1));
        paginationDiv.appendChild(nextBtn);
      }

      results.appendChild(paginationDiv);
    }

    setStatus('Completed.');
  } catch (err) {
    console.error(err);
    setStatus('Error: ' + err.message);
  }
}

btnFind.addEventListener('click', () => {
  currentPage = 1;
  fetchAndRender(1);
});
