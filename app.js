const STORAGE_KEY = 'inventory_clicker_v7_pro';
const DEFAULT_DATA = {
  settings: {
    gsWebAppUrl: '',
    gsSheetUrl: ''
  },
  master: {
    bars: ['Bar 1', 'Bar 2', 'VIP'],
    bartenders: ['B1', 'B2', 'B3', 'B4'],
    items: ['Water', 'Red Bull', 'Beer', 'Grey Goose', 'Finlandia', 'Gordon Gin', 'Tequila', 'Casamigos', 'Henny', 'Jameson', 'Jagermeister']
  },
  currentNight: {
    label: '',
    date: '',
    active: false
  },
  events: []
};

let DB = loadDB();

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return {
      settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
      master: {
        bars: normalizeLines(parsed.master?.bars || DEFAULT_DATA.master.bars),
        bartenders: normalizeLines(parsed.master?.bartenders || DEFAULT_DATA.master.bartenders),
        items: normalizeLines(parsed.master?.items || DEFAULT_DATA.master.items)
      },
      currentNight: { ...DEFAULT_DATA.currentNight, ...(parsed.currentNight || {}) },
      events: Array.isArray(parsed.events) ? parsed.events : []
    };
  } catch (e) {
    return structuredClone(DEFAULT_DATA);
  }
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
}

function normalizeLines(input) {
  if (Array.isArray(input)) return input.map(v => String(v).trim()).filter(Boolean);
  return String(input || '')
    .split(/\n+/)
    .map(v => v.trim())
    .filter(Boolean);
}

function qs(id) { return document.getElementById(id); }

function setPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  qs(pageId).classList.add('active');
  document.querySelector(`.tab[data-page="${pageId}"]`).classList.add('active');
  if (pageId === 'reportsPage') renderReportsPage();
}

function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => setPage(btn.dataset.page));
  });
}

function renderMasterInputs() {
  qs('barsInput').value = DB.master.bars.join('\n');
  qs('bartendersInput').value = DB.master.bartenders.join('\n');
  qs('itemsInput').value = DB.master.items.join('\n');
}

function fillSelect(selectId, values, placeholder = '') {
  const el = qs(selectId);
  const current = el.value;
  el.innerHTML = '';
  if (placeholder) {
    const op = document.createElement('option');
    op.value = '';
    op.textContent = placeholder;
    el.appendChild(op);
  }
  values.forEach(v => {
    const op = document.createElement('option');
    op.value = v;
    op.textContent = v;
    el.appendChild(op);
  });
  if (values.includes(current)) el.value = current;
}

function renderSelectors() {
  fillSelect('barSelect', DB.master.bars);
  fillSelect('bartenderSelect', DB.master.bartenders);
  fillSelect('liveBarSelect', DB.master.bars);
  fillSelect('liveBartenderSelect', DB.master.bartenders);
  fillSelect('overviewBartender', unique(DB.events.map(e => e.bartender)).sort(), 'Select bartender');
}

function unique(arr) { return [...new Set(arr.filter(Boolean))]; }

function renderNightBadge() {
  const n = DB.currentNight;
  qs('nightBadge').textContent = n.active && n.label
    ? `${n.label} · ${n.date || 'No date'}`
    : 'No active night';
}

function renderInventory() {
  const container = qs('itemsContainer');
  const search = qs('itemSearch').value.trim().toLowerCase();
  container.innerHTML = '';

  if (!DB.currentNight.active) {
    container.innerHTML = `<div class="card"><p class="muted">Start a night first in Setup.</p></div>`;
    return;
  }

  DB.master.items
    .filter(item => item.toLowerCase().includes(search))
    .forEach(item => {
      const summary = summarizeItem(item);
      const div = document.createElement('div');
      div.className = 'item-card';
      div.innerHTML = `
        <div class="item-head">
          <div>
            <div class="item-name">${escapeHtml(item)}</div>
            <div class="item-net">Net: ${summary.net}</div>
          </div>
        </div>

        <div class="pills">
          <span class="pill taken">Taken: ${summary.taken}</span>
          <span class="pill returned">Returned: ${summary.returned}</span>
          <span class="pill comp">Complimentary: ${summary.comp}</span>
          <span class="pill shot">Shots: ${summary.shot}</span>
        </div>

        <div class="controls">
          <button class="btn primary" data-action="TAKEN" data-qty="1" data-item="${escapeAttr(item)}">+1 Taken</button>
          <button class="btn primary" data-action="TAKEN" data-qty="5" data-item="${escapeAttr(item)}">+5 Taken</button>
          <button class="btn" data-action="RETURN" data-qty="1" data-item="${escapeAttr(item)}">Return</button>
          <button class="btn" data-action="COMP" data-qty="1" data-item="${escapeAttr(item)}">Complimentary</button>
          <button class="btn" data-action="SHOT" data-qty="1" data-item="${escapeAttr(item)}">Free Shot</button>
          <button class="btn" data-action="SHOT" data-qty="2" data-item="${escapeAttr(item)}">2 Shots</button>
        </div>
      `;
      container.appendChild(div);
    });

  container.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      addEvent(btn.dataset.item, btn.dataset.action, Number(btn.dataset.qty || 1));
    });
  });
}

function summarizeItem(item) {
  const rows = DB.events.filter(e => e.nightLabel === DB.currentNight.label && e.item === item);
  const totals = { taken: 0, returned: 0, comp: 0, shot: 0, net: 0 };
  rows.forEach(e => {
    if (e.action === 'TAKEN') totals.taken += e.qty;
    if (e.action === 'RETURN') totals.returned += e.qty;
    if (e.action === 'COMP') totals.comp += e.qty;
    if (e.action === 'SHOT') totals.shot += e.qty;
  });
  totals.net = totals.taken + totals.comp + totals.shot - totals.returned;
  return totals;
}

function addEvent(item, action, qty) {
  const bar = qs('liveBarSelect').value || qs('barSelect').value;
  const bartender = qs('liveBartenderSelect').value || qs('bartenderSelect').value;
  const ticketCode = qs('ticketCode').value.trim();

  if (!DB.currentNight.active) return alert('Start a night first.');
  if (!bar || !bartender) return alert('Select bar and bartender.');

  DB.events.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    ts: new Date().toISOString(),
    nightLabel: DB.currentNight.label,
    nightDate: DB.currentNight.date,
    bar,
    bartender,
    item,
    action,
    qty,
    ticketCode: ['COMP', 'SHOT'].includes(action) ? ticketCode : '',
    note: ''
  });

  saveDB();
  renderSelectors();
  renderInventory();
  renderNightBadge();
  renderReportsPage();
}

function setupNight() {
  const label = qs('nightLabel').value.trim();
  const date = qs('nightDate').value;
  const bar = qs('barSelect').value;
  const bartender = qs('bartenderSelect').value;

  if (!label) return alert('Please enter a night label.');
  if (!date) return alert('Please choose a date.');
  if (!bar || !bartender) return alert('Please choose bar and bartender.');

  DB.currentNight = { label, date, active: true };
  saveDB();
  renderNightBadge();
  renderInventory();
  syncLiveSelectors();
  alert('Night ready.');
  setPage('inventoryPage');
}

function syncLiveSelectors() {
  qs('liveBarSelect').value = qs('barSelect').value;
  qs('liveBartenderSelect').value = qs('bartenderSelect').value;
}

function saveMasterData() {
  const bars = normalizeLines(qs('barsInput').value);
  const bartenders = normalizeLines(qs('bartendersInput').value);
  const items = normalizeLines(qs('itemsInput').value);
  if (!bars.length || !bartenders.length || !items.length) {
    return alert('Bars, bartenders, and items cannot be empty.');
  }
  DB.master = { bars, bartenders, items };
  saveDB();
  renderSelectors();
  renderInventory();
  alert('Master data saved.');
}

function openOverview() {
  renderOverview();
  qs('overviewModal').classList.remove('hidden');
}

function closeOverview() {
  qs('overviewModal').classList.add('hidden');
}

function renderOverview() {
  const nightEvents = getCurrentNightEvents();
  const byBar = {};
  nightEvents.forEach(e => {
    if (!byBar[e.bar]) {
      byBar[e.bar] = { qty: 0, events: 0, comp: 0, shot: 0, returned: 0 };
    }
    byBar[e.bar].qty += e.qty;
    byBar[e.bar].events += 1;
    if (e.action === 'COMP') byBar[e.bar].comp += e.qty;
    if (e.action === 'SHOT') byBar[e.bar].shot += e.qty;
    if (e.action === 'RETURN') byBar[e.bar].returned += e.qty;
  });

  const barsOverview = Object.keys(byBar).length
    ? Object.entries(byBar).map(([bar, s]) => `
      <div class="overview-row">
        <div><b>${escapeHtml(bar)}</b></div>
        <div class="mono">Qty ${s.qty} · Events ${s.events} · Comp ${s.comp} · Shots ${s.shot} · Returned ${s.returned}</div>
      </div>
    `).join('')
    : `<p class="muted">No activity yet.</p>`;

  qs('barsOverview').innerHTML = `<div class="overview-box">${barsOverview}</div>`;
  fillSelect('overviewBartender', unique(nightEvents.map(e => e.bartender)).sort(), 'Select bartender');
  renderBartenderOverview();
}

function renderBartenderOverview() {
  const name = qs('overviewBartender').value;
  const target = qs('bartenderOverview');
  const nightEvents = getCurrentNightEvents();

  if (!name) {
    target.innerHTML = `<p class="muted">Select a bartender to see a quick breakdown.</p>`;
    return;
  }

  const rows = nightEvents.filter(e => e.bartender === name);
  const totals = { taken: 0, returned: 0, comp: 0, shot: 0 };
  const byItem = {};

  rows.forEach(e => {
    if (!byItem[e.item]) byItem[e.item] = { taken: 0, returned: 0, comp: 0, shot: 0 };
    if (e.action === 'TAKEN') { totals.taken += e.qty; byItem[e.item].taken += e.qty; }
    if (e.action === 'RETURN') { totals.returned += e.qty; byItem[e.item].returned += e.qty; }
    if (e.action === 'COMP') { totals.comp += e.qty; byItem[e.item].comp += e.qty; }
    if (e.action === 'SHOT') { totals.shot += e.qty; byItem[e.item].shot += e.qty; }
  });

  const stats = `
    <div class="stats">
      ${statCard(totals.taken, 'Taken')}
      ${statCard(totals.returned, 'Returned')}
      ${statCard(totals.comp, 'Complimentary')}
      ${statCard(totals.shot, 'Shots')}
    </div>
  `;

  const itemRows = Object.keys(byItem).length
    ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Taken</th><th>Returned</th><th>Comp</th><th>Shots</th></tr></thead>
          <tbody>
            ${Object.entries(byItem).map(([item, s]) => `
              <tr>
                <td>${escapeHtml(item)}</td>
                <td>${s.taken}</td>
                <td>${s.returned}</td>
                <td>${s.comp}</td>
                <td>${s.shot}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`
    : `<p class="muted">No activity.</p>`;

  target.innerHTML = stats + itemRows;
}

function statCard(value, label) {
  return `<div class="stat"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
}

function getCurrentNightEvents() {
  if (!DB.currentNight.label) return [];
  return DB.events.filter(e => e.nightLabel === DB.currentNight.label);
}

function buildReportData() {
  const rows = getCurrentNightEvents();
  const summary = {
    totalEvents: rows.length,
    totalQty: rows.reduce((a, b) => a + Number(b.qty || 0), 0),
    complimentaryQty: rows.filter(r => r.action === 'COMP').reduce((a, b) => a + b.qty, 0),
    shotsQty: rows.filter(r => r.action === 'SHOT').reduce((a, b) => a + b.qty, 0)
  };

  const barMap = {};
  rows.forEach(r => {
    const key = `${r.bar}|||${r.item}|||${r.action}`;
    if (!barMap[key]) {
      barMap[key] = { bar: r.bar, item: r.item, action: r.action, totalQty: 0 };
    }
    barMap[key].totalQty += r.qty;
  });

  return { rows, summary, barSummary: Object.values(barMap) };
}

function renderReportsPage() {
  const { rows, summary, barSummary } = buildReportData();

  qs('reportStats').innerHTML = `
    ${statCard(summary.totalEvents, 'Events')}
    ${statCard(summary.totalQty, 'Total Qty')}
    ${statCard(summary.complimentaryQty, 'Complimentary')}
    ${statCard(summary.shotsQty, 'Shots')}
  `;

  if (!rows.length) {
    qs('liveSummary').innerHTML = `<p class="muted">No events yet for this night.</p>`;
    return;
  }

  qs('liveSummary').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Bar</th><th>Item</th><th>Action</th><th>Total Qty</th>
          </tr>
        </thead>
        <tbody>
          ${barSummary.map(r => `
            <tr>
              <td>${escapeHtml(r.bar)}</td>
              <td>${escapeHtml(r.item)}</td>
              <td>${escapeHtml(r.action)}</td>
              <td>${r.totalQty}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function openSettings() {
  qs('gsWebAppUrl').value = DB.settings.gsWebAppUrl || '';
  qs('gsSheetUrl').value = DB.settings.gsSheetUrl || '';
  qs('settingsModal').classList.remove('hidden');
}

function closeSettings() {
  qs('settingsModal').classList.add('hidden');
}

function saveSettings() {
  DB.settings.gsWebAppUrl = qs('gsWebAppUrl').value.trim();
  DB.settings.gsSheetUrl = qs('gsSheetUrl').value.trim();
  saveDB();
  alert('Settings saved.');
  closeSettings();
}

function getSpreadsheetIdFromUrl(url) {
  const m = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : '';
}

async function sendToGoogleSheet() {
  const { rows, summary, barSummary } = buildReportData();
  if (!rows.length) return alert('No data to send.');
  if (!DB.settings.gsWebAppUrl || !DB.settings.gsSheetUrl) {
    return alert('Please configure Google Apps Script URL and Google Sheet URL in Settings.');
  }

  const spreadsheetId = getSpreadsheetIdFromUrl(DB.settings.gsSheetUrl);
  if (!spreadsheetId) return alert('Google Sheet URL is not valid.');

  const payload = {
    spreadsheetId,
    night: DB.currentNight.label,
    rows,
    summary,
    barSummary
  };

  const res = await fetch(DB.settings.gsWebAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'Google Sheet request failed');
  }
  alert('Current night sent to Google Sheet.');
}

function openGoogleSheet() {
  if (!DB.settings.gsSheetUrl) return alert('Google Sheet URL is not configured.');
  window.open(DB.settings.gsSheetUrl, '_blank');
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `inventory-clicker-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.master || !parsed.settings || !Array.isArray(parsed.events)) {
        throw new Error('Invalid backup structure');
      }
      DB = {
        settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
        master: {
          bars: normalizeLines(parsed.master.bars),
          bartenders: normalizeLines(parsed.master.bartenders),
          items: normalizeLines(parsed.master.items)
        },
        currentNight: { ...DEFAULT_DATA.currentNight, ...(parsed.currentNight || {}) },
        events: parsed.events || []
      };
      saveDB();
      bootUI();
      alert('Backup restored.');
    } catch (e) {
      alert('Restore failed: ' + e.message);
    }
  };
  reader.readAsText(file);
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function wireEvents() {
  qs('btnStartNight').addEventListener('click', setupNight);
  qs('btnSaveMasterData').addEventListener('click', saveMasterData);
  qs('itemSearch').addEventListener('input', renderInventory);

  qs('btnQuickOverview').addEventListener('click', openOverview);
  qs('btnCloseOverview').addEventListener('click', closeOverview);
  qs('overviewBartender').addEventListener('change', renderBartenderOverview);

  qs('btnOpenSettings').addEventListener('click', openSettings);
  qs('btnCloseSettings').addEventListener('click', closeSettings);
  qs('btnSaveSettings').addEventListener('click', saveSettings);

  qs('btnSendToGoogle').addEventListener('click', async () => {
    try {
      await sendToGoogleSheet();
    } catch (e) {
      alert(e.message);
    }
  });

  qs('btnOpenGoogleSheet').addEventListener('click', openGoogleSheet);
  qs('btnBackup').addEventListener('click', downloadBackup);
  qs('restoreFile').addEventListener('change', e => {
    if (e.target.files?.[0]) restoreBackup(e.target.files[0]);
  });

  qs('liveBarSelect').addEventListener('change', () => { qs('barSelect').value = qs('liveBarSelect').value; });
  qs('liveBartenderSelect').addEventListener('change', () => { qs('bartenderSelect').value = qs('liveBartenderSelect').value; });
}

function bootUI() {
  renderMasterInputs();
  renderSelectors();
  renderNightBadge();

  qs('nightLabel').value = DB.currentNight.label || '';
  qs('nightDate').value = DB.currentNight.date || '';

  if (DB.master.bars[0]) {
    qs('barSelect').value = qs('barSelect').value || DB.master.bars[0];
    qs('liveBarSelect').value = qs('liveBarSelect').value || DB.master.bars[0];
  }
  if (DB.master.bartenders[0]) {
    qs('bartenderSelect').value = qs('bartenderSelect').value || DB.master.bartenders[0];
    qs('liveBartenderSelect').value = qs('liveBartenderSelect').value || DB.master.bartenders[0];
  }

  renderInventory();
  renderReportsPage();
}

function updateOfflineBanner() {
  qs('offlineBanner').classList.toggle('hidden', navigator.onLine);
}

window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  wireEvents();
  bootUI();
  updateOfflineBanner();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
