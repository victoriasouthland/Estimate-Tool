let allProjects = [];
let currentProject = null;

// ── INIT ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  buildAreaRows();
  buildMaterialRows();
  buildAddonRows();
  loadProjectList();
  // Set today's date
  const d = document.getElementById('f-date');
  if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
});

// ── VIEWS ──────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  window.scrollTo(0,0);
}
function goList() { showView('list'); loadProjectList(); }
function navTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  event.target.classList.add('active');
}

// ── PROJECT LIST ───────────────────────────────────────────
async function loadProjectList() {
  const el = document.getElementById('project-list');
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const rows = await loadAllProjects();
    allProjects = rows.filter(r => r.id).map(rowToProject);
    renderList(allProjects);
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><h3>Connection error</h3><p>${e.message}</p><p style="margin-top:8px;font-size:12px;color:var(--text-soft)">Make sure your Google Sheet is shared as Editor with "Anyone with link"</p></div>`;
  }
}

function renderList(projects) {
  const el = document.getElementById('project-list');
  document.getElementById('list-meta').textContent = `${projects.length} project${projects.length!==1?'s':''}`;
  if (!projects.length) {
    el.innerHTML = `<div class="empty-state"><h3>No estimates yet</h3><p>Click "New Estimate" to create your first project.</p></div>`;
    return;
  }
  el.innerHTML = projects.map(p => {
    const price = parseFloat(p.contractPrice)||0;
    const sf    = (parseFloat(p.area0sf)||0) + (parseFloat(p.area1sf)||0) + (parseFloat(p.area2sf)||0) +
                  (parseFloat(p.area3sf)||0) + (parseFloat(p.area4sf)||0) + (parseFloat(p.area5sf)||0) +
                  (parseFloat(p.area6sf)||0) + (parseFloat(p.area7sf)||0) + (parseFloat(p.area8sf)||0) + (parseFloat(p.area9sf)||0);
    const dateStr = p.date ? new Date(p.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
    return `
    <div class="project-card" onclick="openProject('${p.id}')">
      <div class="pc-header">
        <div class="pc-name">${p.name||'Untitled Estimate'}</div>
        <div class="pc-date">${dateStr}</div>
      </div>
      <div class="pc-client">${p.client||'—'}</div>
      <div class="pc-stats">
        <div class="pc-stat"><div class="pc-stat-label">Grade</div><div class="pc-stat-value">${p.grade||'—'}</div></div>
        <div class="pc-stat"><div class="pc-stat-label">Total SF</div><div class="pc-stat-value">${sf>0?sf.toLocaleString():'—'}</div></div>
        <div class="pc-stat"><div class="pc-stat-label">Estimator</div><div class="pc-stat-value">${p.estimator||'—'}</div></div>
      </div>
      <div class="pc-price">${price>0?fmt$(price):'No price yet'}</div>
      <div class="pc-actions">
        <button class="pc-btn" onclick="event.stopPropagation();openProject('${p.id}')">Edit</button>
        <button class="pc-btn" onclick="event.stopPropagation();openDashboard('${p.id}')">Summary</button>
        <button class="pc-btn danger" onclick="event.stopPropagation();deleteProject('${p.id}','${(p.name||'').replace(/'/g,"\\'")}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function filterProjects() {
  const q = document.getElementById('search-input').value.toLowerCase();
  renderList(allProjects.filter(p =>
    (p.name||'').toLowerCase().includes(q) ||
    (p.client||'').toLowerCase().includes(q) ||
    (p.estimator||'').toLowerCase().includes(q)
  ));
}

// ── NEW / OPEN PROJECT ─────────────────────────────────────
function newProject() {
  currentProject = { id: 'proj_' + Date.now() };
  clearForm();
  document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('project-name-input').value = '';
  set('save-status', '');
  recalc();
  showView('form');
}

function openProject(id) {
  const p = allProjects.find(x => x.id === id);
  if (!p) return;
  currentProject = { ...p };
  populateForm(p);
  showView('form');
}

function openDashboard(id) {
  const p = allProjects.find(x => x.id === id);
  if (!p) return;
  currentProject = { ...p };
  populateForm(p);
  renderDashboard();
  showView('dashboard');
}

// ── FORM POPULATION ────────────────────────────────────────
function clearForm() {
  ['project-name-input','f-client','f-estimator','f-notes'].forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
  const headerName = document.getElementById('header-project-name');
  if (headerName) headerName.textContent = 'New Estimate';
  document.getElementById('f-grade').value = 'Grade 2';
  document.getElementById('f-class').value = 'Class 1';
  document.getElementById('f-days').value = '';
  document.getElementById('f-men').value = '';
  document.getElementById('f-trips').value = '';
  document.getElementById('f-miles').value = '';
  document.getElementById('f-vehicles').value = '';
  document.getElementById('f-hotel-nights').value = '';
  document.getElementById('f-rooms').value = '';
  document.getElementById('f-labor-rate').value = 37.97;
  document.getElementById('f-labor-markup').value = 2.5;
  document.getElementById('f-mat-markup').value = 1.2;
  for (let i=0;i<10;i++) {
    const sf=document.getElementById(`area-sf-${i}`);
    const lf=document.getElementById(`area-lf-${i}`);
    const nt=document.getElementById(`area-notes-${i}`);
    if(sf) sf.value=''; if(lf) lf.value=''; if(nt) nt.value='';
  }
  for (const m of RATES.materials) {
    const el=document.getElementById(`mat-on-${m.key}`);
    if(el) el.checked = false;
  }
  for (const a of RATES.addons) {
    const onEl=document.getElementById(`addon-on-${a.key}`);
    const qEl=document.getElementById(`addon-qty-${a.key}`);
    if(onEl) onEl.checked=false;
    if(qEl) qEl.value='';
  }
}

function populateForm(p) {
  setVal('project-name-input', p.name);
  const headerName = document.getElementById('header-project-name');
  if (headerName) headerName.textContent = p.name || 'New Estimate';
  setVal('f-client', p.client);
  setVal('f-estimator', p.estimator);
  setVal('f-notes', p.notes);
  setVal('f-date', p.date);
  setVal('f-grade', p.grade||'Grade 2');
  setVal('f-class', p.class||'Class 1');
  for (let i=0;i<10;i++) {
    setVal(`area-sf-${i}`,   p[`area${i}sf`]||'');
    setVal(`area-lf-${i}`,   p[`area${i}lf`]||'');
    setVal(`area-notes-${i}`,p[`area${i}notes`]||'');
  }
  for (const m of RATES.materials) {
    const el=document.getElementById(`mat-on-${m.key}`);
    if(el) el.checked = p[`mat_${m.key}`] !== undefined ? !!p[`mat_${m.key}`] : m.defaultOn;
  }
  for (const a of RATES.addons) {
    const onEl=document.getElementById(`addon-on-${a.key}`);
    const qEl=document.getElementById(`addon-qty-${a.key}`);
    if(onEl) onEl.checked = !!p[`addon_${a.key}_on`];
    if(qEl) qEl.value = p[`addon_${a.key}_qty`]||'';
  }
  setVal('f-days',         p.days||3);
  setVal('f-men',          p.men||3);
  setVal('f-trips',        p.trips||1);
  setVal('f-miles',        p.miles||0);
  setVal('f-vehicles',     p.vehicles||1);
  setVal('f-hotel-nights', p.hotelNights||0);
  setVal('f-rooms',        p.rooms||1);
  setVal('f-labor-rate',   p.laborRate||37.97);
  setVal('f-labor-markup', p.laborMarkup||2.5);
  setVal('f-mat-markup',   p.matMarkup||1.2);
  recalc();
}

function setVal(id, val) { const e=document.getElementById(id); if(e&&val!==undefined) e.value=val; }

// ── COLLECT FORM DATA ──────────────────────────────────────
function collectProject() {
  const p = { ...currentProject };
  p.name        = document.getElementById('project-name-input').value.trim();
  p.client      = document.getElementById('f-client').value;
  p.estimator   = document.getElementById('f-estimator').value;
  p.notes       = document.getElementById('f-notes').value;
  p.date        = document.getElementById('f-date').value;
  p.grade       = document.getElementById('f-grade').value;
  p.class       = document.getElementById('f-class').value;
  // Sync header display
  const headerName = document.getElementById('header-project-name');
  if (headerName) headerName.textContent = p.name || 'New Estimate';
  for (let i=0;i<10;i++) {
    p[`area${i}sf`]    = document.getElementById(`area-sf-${i}`)?.value||'';
    p[`area${i}lf`]    = document.getElementById(`area-lf-${i}`)?.value||'';
    p[`area${i}notes`] = document.getElementById(`area-notes-${i}`)?.value||'';
  }
  for (const m of RATES.materials) {
    p[`mat_${m.key}`] = document.getElementById(`mat-on-${m.key}`)?.checked ? true : false;
  }
  for (const a of RATES.addons) {
    p[`addon_${a.key}_on`]  = document.getElementById(`addon-on-${a.key}`)?.checked ? true : false;
    p[`addon_${a.key}_qty`] = document.getElementById(`addon-qty-${a.key}`)?.value||'';
  }
  p.days        = document.getElementById('f-days').value;
  p.men         = document.getElementById('f-men').value;
  p.trips       = document.getElementById('f-trips').value;
  p.miles       = document.getElementById('f-miles').value;
  p.vehicles    = document.getElementById('f-vehicles').value;
  p.hotelNights = document.getElementById('f-hotel-nights').value;
  p.rooms       = document.getElementById('f-rooms').value;
  p.laborRate   = document.getElementById('f-labor-rate').value;
  p.laborMarkup = document.getElementById('f-labor-markup').value;
  p.matMarkup   = document.getElementById('f-mat-markup').value;
  const calc = recalc();
  p.contractPrice = calc.contract.toFixed(2);
  return p;
}

// ── SAVE ───────────────────────────────────────────────────
async function saveProject() {
  const p = collectProject();
  if (!p.name) { toast('Please enter a project name', 'error'); return; }
  currentProject = p;
  set('save-status', 'Saving...');
  try {
    await saveProjectToSheet(p);
    set('save-status', '✓ Saved');
    toast('Project saved to Google Sheets', 'success');
    setTimeout(()=>set('save-status',''), 3000);
  } catch(e) {
    set('save-status', 'Save failed');
    toast('Save failed: ' + e.message, 'error');
  }
}

// ── DELETE ─────────────────────────────────────────────────
async function deleteProject(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await deleteProjectFromSheet(id);
    toast('Project deleted', 'success');
    loadProjectList();
  } catch(e) {
    toast('Delete failed: ' + e.message, 'error');
  }
}

// ── DASHBOARD ──────────────────────────────────────────────
function viewDashboard() {
  const p = collectProject();
  currentProject = p;
  renderDashboard();
  showView('dashboard');
}

function renderDashboard() {
  const p = currentProject;
  document.getElementById('dash-title').textContent = p.name || 'Estimate Summary';
  const calc = recalc();

  const totalSF = [0,1,2,3,4,5,6,7,8,9].reduce((s,i)=>s+(parseFloat(p[`area${i}sf`])||0),0);
  const totalLF = [0,1,2,3,4,5,6,7,8,9].reduce((s,i)=>s+(parseFloat(p[`area${i}lf`])||0),0);

  // Active addons
  const activeAddons = RATES.addons.filter(a => p[`addon_${a.key}_on`] && parseFloat(p[`addon_${a.key}_qty`]||0)>0);
  const activeMats   = RATES.materials.filter(m => p[`mat_${m.key}`]);

  document.getElementById('dash-body').innerHTML = `
  <div class="dash-contract">
    <div class="dc-left">
      <div class="dc-label">${p.client||'Project'} — ${p.date||''}</div>
      <div class="dc-price">${fmt$(calc.contract)}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px">Estimator: ${p.estimator||'—'} &nbsp;·&nbsp; ${p.grade||'—'} / ${p.class||'—'}</div>
    </div>
    <div class="dc-right">
      <div class="dc-sub">Subtotal (before markup)</div>
      <div class="dc-val">${fmt$(calc.subtotal)}</div>
      <div class="dc-sub" style="margin-top:8px">Labor markup ${p.laborMarkup}× &nbsp;·&nbsp; Material markup ${p.matMarkup}×</div>
    </div>
  </div>

  <div class="dash-metrics">
    <div class="dash-metric">
      <div class="dm-label">Total SF</div>
      <div class="dm-value">${totalSF.toLocaleString()}</div>
      <div class="dm-sub">${totalLF.toLocaleString()} LF edging</div>
    </div>
    <div class="dash-metric">
      <div class="dm-label">Total Man-Hours</div>
      <div class="dm-value blue">${calc.totalMH.toFixed(1)}</div>
      <div class="dm-sub">Job: ${calc.totalJobMH.toFixed(1)} · Travel: ${calc.travelMH.toFixed(1)}</div>
    </div>
    <div class="dash-metric">
      <div class="dm-label">Materials + Add-ons</div>
      <div class="dm-value">${fmt$(calc.matTotal + calc.addonTotal)}</div>
      <div class="dm-sub">Travel & lodging: ${fmt$(calc.travelTotal)}</div>
    </div>
    <div class="dash-metric">
      <div class="dm-label">Contract Price</div>
      <div class="dm-value green">${fmt$(calc.contract)}</div>
      <div class="dm-sub">Labor raw: ${fmt$(calc.laborRaw)}</div>
    </div>
  </div>

  <div class="dash-grid">
    <div class="dash-card">
      <div class="dash-card-header">Areas / Rooms <span>${totalSF.toLocaleString()} SF</span></div>
      <div class="dash-card-body">
        ${[0,1,2,3,4,5,6,7,8,9].map(i => {
          const sf = parseFloat(p[`area${i}sf`])||0;
          const lf = parseFloat(p[`area${i}lf`])||0;
          if (!sf && !lf) return '';
          const rate = getSFperMH(sf, p.grade||'Grade 2');
          const gr = RATES.grade[p.grade||'Grade 2'];
          const mh = sf/rate + (lf>0?lf/gr.edgeLFperMH:0);
          return `<div class="dash-row">
            <span>Area ${i+1}${p[`area${i}notes`]?' — '+p[`area${i}notes`]:''}</span>
            <span>${sf.toLocaleString()} SF / ${lf.toLocaleString()} LF → ${mh.toFixed(1)} MH</span>
          </div>`;
        }).filter(Boolean).join('')||'<div class="dash-row dim"><span>No areas entered</span><span>—</span></div>'}
      </div>
    </div>

    <div class="dash-card">
      <div class="dash-card-header">Standard Materials <span>${fmt$(calc.matTotal)}</span></div>
      <div class="dash-card-body">
        ${RATES.materials.map(m => {
          const on = !!p[`mat_${m.key}`];
          return `<div class="dash-row${!on?' dim':''}">
            <span>${m.label}</span>
            <span><span class="pill ${on?'pill-on':'pill-off'}">${on?'Include':'N/A'}</span></span>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="dash-card">
      <div class="dash-card-header">Add-On Services <span>${fmt$(calc.addonTotal)}</span></div>
      <div class="dash-card-body">
        ${activeAddons.length ? activeAddons.map(a => {
          const qty = parseFloat(p[`addon_${a.key}_qty`])||0;
          const cost = qty * a.rate;
          return `<div class="dash-row">
            <span>${a.label}</span>
            <span>${qty.toLocaleString()} ${a.unit} → ${fmt$(cost)}</span>
          </div>`;
        }).join('') : '<div class="dash-row dim"><span>No add-ons selected</span><span>—</span></div>'}
      </div>
    </div>

    <div class="dash-card">
      <div class="dash-card-header">Travel & Lodging <span>${fmt$(calc.travelTotal)}</span></div>
      <div class="dash-card-body">
        <div class="dash-row"><span>${p.men||0} men · ${p.days||0} days</span><span>Per diem: ${fmt$(calc.perDiem)}</span></div>
        <div class="dash-row"><span>${p.miles||0} miles · ${p.vehicles||0} vehicle(s)</span><span>Fuel: ${fmt$(calc.fuelCost)}</span></div>
        <div class="dash-row"><span>${p.hotelNights||0} nights · ${p.rooms||0} room(s)</span><span>Hotel: ${fmt$(calc.hotelCost)}</span></div>
        <div class="dash-row"><span>Travel man-hours</span><span>${calc.travelMH.toFixed(2)} MH</span></div>
      </div>
    </div>
  </div>

  <div class="dash-card" style="margin-bottom:20px">
    <div class="dash-card-header">Full Pricing Breakdown</div>
    <div class="dash-card-body">
      <div class="dash-row"><span>Total man-hours</span><span>${calc.totalMH.toFixed(2)} MH</span></div>
      <div class="dash-row"><span>Labor cost (${fmt$(parseFloat(p.laborRate)||0)}/MH raw)</span><span>${fmt$(calc.laborRaw)}</span></div>
      <div class="dash-row"><span>Materials cost</span><span>${fmt$(calc.matTotal)}</span></div>
      <div class="dash-row"><span>Add-ons cost</span><span>${fmt$(calc.addonTotal)}</span></div>
      <div class="dash-row"><span>Travel & lodging</span><span>${fmt$(calc.travelTotal)}</span></div>
      <div class="dash-row" style="background:var(--ice);font-weight:600"><span>Subtotal (before markup)</span><span>${fmt$(calc.subtotal)}</span></div>
      <div class="dash-row"><span>Labor with ${p.laborMarkup}× markup</span><span>${fmt$(calc.laborMarked)}</span></div>
      <div class="dash-row"><span>Materials with ${p.matMarkup}× markup</span><span>${fmt$(calc.matMarked)}</span></div>
      <div class="dash-row" style="background:var(--navy);color:white;font-weight:700;font-size:15px">
        <span>CONTRACT PRICE</span><span style="color:#7dd3b0;font-size:20px;font-family:'DM Mono',monospace">${fmt$(calc.contract)}</span>
      </div>
    </div>
  </div>`;
}

// ── EXCEL DOWNLOAD ─────────────────────────────────────────
function downloadExcel() {
  const p = currentProject;
  const calc = recalc();

  // Build CSV that opens cleanly in Excel
  const rows = [
    ['CONCRETE POLISHING — PROJECT ESTIMATE'],
    [],
    ['Project Name', p.name||''], ['Client / Location', p.client||''],
    ['Estimator', p.estimator||''], ['Date', p.date||''], ['Notes', p.notes||''],
    [],
    ['GRADE & CLASS'],
    ['Grade', p.grade||''], ['Class of Shine', p.class||''],
    [],
    ['AREAS / ROOMS'],
    ['Area', 'SF', 'LF (Edging)', 'MH Calculated'],
    ...[0,1,2,3,4,5,6,7,8,9].map(i => {
      const sf = parseFloat(p[`area${i}sf`])||0;
      const lf = parseFloat(p[`area${i}lf`])||0;
      if (!sf && !lf) return null;
      const gr = RATES.grade[p.grade||'Grade 2'];
      const rate = getSFperMH(sf, p.grade||'Grade 2');
      const mh = sf/rate + (lf>0?lf/gr.edgeLFperMH:0);
      return [`Area ${i+1}`, sf, lf, mh.toFixed(2)];
    }).filter(Boolean),
    ['TOTALS',
      [0,1,2,3,4,5,6,7,8,9].reduce((s,i)=>s+(parseFloat(p[`area${i}sf`])||0),0),
      [0,1,2,3,4,5,6,7,8,9].reduce((s,i)=>s+(parseFloat(p[`area${i}lf`])||0),0),
      calc.totalJobMH.toFixed(2)],
    [],
    ['STANDARD MATERIALS'],
    ['Material', 'Include?', 'Cost'],
    ...RATES.materials.map(m => [m.label, p[`mat_${m.key}`]?'Include':'N/A', '']),
    ['Materials Total', '', calc.matTotal.toFixed(2)],
    [],
    ['ADD-ON SERVICES'],
    ['Service', 'Qty', 'Unit', 'Cost'],
    ...RATES.addons.filter(a=>p[`addon_${a.key}_on`]).map(a=>{
      const qty=parseFloat(p[`addon_${a.key}_qty`])||0;
      return [a.label, qty, a.unit, (qty*a.rate).toFixed(2)];
    }),
    ['Add-ons Total','','',calc.addonTotal.toFixed(2)],
    [],
    ['TRAVEL & LODGING'],
    ['Days', p.days||0], ['Men', p.men||0], ['Miles', p.miles||0],
    ['Fuel Cost', calc.fuelCost.toFixed(2)],
    ['Hotel Cost', calc.hotelCost.toFixed(2)],
    ['Per Diem', calc.perDiem.toFixed(2)],
    ['Travel MH', calc.travelMH.toFixed(2)],
    ['Travel Total', calc.travelTotal.toFixed(2)],
    [],
    ['ESTIMATE SUMMARY'],
    ['Total Man-Hours', calc.totalMH.toFixed(2)],
    ['Labor Cost (raw)', calc.laborRaw.toFixed(2)],
    ['Materials Cost', calc.matTotal.toFixed(2)],
    ['Add-ons Cost', calc.addonTotal.toFixed(2)],
    ['Travel & Lodging', calc.travelTotal.toFixed(2)],
    ['Subtotal (before markup)', calc.subtotal.toFixed(2)],
    ['Labor Markup', p.laborMarkup||2.5],
    ['Material Markup', p.matMarkup||1.2],
    ['Labor (with markup)', calc.laborMarked.toFixed(2)],
    ['Materials (with markup)', calc.matMarked.toFixed(2)],
    ['CONTRACT PRICE', calc.contract.toFixed(2)],
  ];

  const csv = rows.map(r => (r||[]).map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${(p.name||'estimate').replace(/[^a-z0-9]/gi,'_')}_estimate.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Downloaded! Open in Excel or Google Sheets.', 'success');
}

// ── BUILD ROWS ─────────────────────────────────────────────
function buildAreaRows() {
  const tbody = document.getElementById('areas-tbody');
  tbody.innerHTML = Array.from({length:10},(_,i)=>`
    <tr>
      <td><input type="text" id="area-notes-${i}" placeholder="Area ${i+1}" oninput="recalc()" style="width:90px"></td>
      <td><input type="number" id="area-sf-${i}" placeholder="0" min="0" oninput="recalc()"></td>
      <td><input type="number" id="area-lf-${i}" placeholder="0" min="0" oninput="recalc()"></td>
      <td><span class="area-calc" id="area-rate-${i}">—</span></td>
      <td><span class="area-calc" id="area-mh-${i}">—</span></td>
      <td><input type="text" id="area-desc-${i}" placeholder="Notes" style="width:120px" oninput="recalc()"></td>
    </tr>`).join('');
}

function buildMaterialRows() {
  const matRateLabels = {
    densifier:  'SF/gal by grade',
    sr2Sealer:  'SF/gal by grade',
    guard:      '78 SF/gal',
    grinder:    '$/SF by grade',
    edging:     '$/LF by grade',
    genFuel:    '$/SF by grade',
    misc:       '$0.03/SF + $20',
  };
  document.getElementById('materials-rows').innerHTML = RATES.materials.map(m => `
    <div class="toggle-row" id="mat-row-${m.key}">
      <span>${m.label}</span>
      <label class="toggle-switch">
        <input type="checkbox" id="mat-on-${m.key}" onchange="recalc()">
        <span class="toggle-slider"></span>
      </label>
      <span class="rate-label" id="mat-rate-${m.key}">${matRateLabels[m.key]||''}</span>
      <span class="cost-val" id="mat-qty-${m.key}">—</span>
      <span class="cost-val" id="mat-cost-${m.key}">—</span>
    </div>`).join('');
}

function buildAddonRows() {
  document.getElementById('addons-rows').innerHTML = RATES.addons.map(a => `
    <div class="toggle-row" id="addon-row-${a.key}">
      <span>${a.label}</span>
      <label class="toggle-switch">
        <input type="checkbox" id="addon-on-${a.key}" onchange="recalc()">
        <span class="toggle-slider"></span>
      </label>
      <span class="rate-label">$${a.rate}/${a.unit}</span>
      <input type="number" class="qty-input" id="addon-qty-${a.key}" placeholder="${a.unit}" min="0" oninput="recalc()">
      <span class="cost-val" id="addon-cost-${a.key}">—</span>
    </div>`).join('');
}

// ── TOAST ──────────────────────────────────────────────────
function toast(msg, type='') {
  let el = document.getElementById('toast');
  if (!el) { el=document.createElement('div'); el.id='toast'; el.className='toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = `toast ${type}`;
  setTimeout(()=>el.classList.add('show'),10);
  setTimeout(()=>el.classList.remove('show'), 3500);
}
