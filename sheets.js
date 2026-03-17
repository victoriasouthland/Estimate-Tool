const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyUf5f5TDckorfTKxZTBuoElnitLS91Uahz4DAp3IgsNAXKQcpsZcq9fw5D4HEVCHxckQ/exec';

const COLS = [
  'id','name','client','estimator','date','notes',
  'grade','class',
  'area0sf','area0lf','area0notes',
  'area1sf','area1lf','area1notes',
  'area2sf','area2lf','area2notes',
  'area3sf','area3lf','area3notes',
  'area4sf','area4lf','area4notes',
  'area5sf','area5lf','area5notes',
  'area6sf','area6lf','area6notes',
  'area7sf','area7lf','area7notes',
  'area8sf','area8lf','area8notes',
  'area9sf','area9lf','area9notes',
  'mat_densifier','mat_sr2Sealer','mat_guard','mat_grinder','mat_edging','mat_genFuel','mat_misc',
  'addon_epoxyLight_on','addon_epoxyLight_qty',
  'addon_epoxyHeavy_on','addon_epoxyHeavy_qty',
  'addon_glueLight_on','addon_glueLight_qty',
  'addon_glueHeavy_on','addon_glueHeavy_qty',
  'addon_dye_on','addon_dye_qty',
  'addon_jf1_on','addon_jf1_qty',
  'addon_jf2_on','addon_jf2_qty',
  'addon_cracks_on','addon_cracks_qty',
  'addon_patches_on','addon_patches_qty',
  'addon_groutCoat_on','addon_groutCoat_qty',
  'addon_floorProt_on','addon_floorProt_qty',
  'addon_grindSeal_on','addon_grindSeal_qty',
  'days','men','trips','miles','vehicles','hotelNights','rooms',
  'laborRate','laborMarkup','matMarkup',
  'contractPrice','updatedAt'
];

// ── READ all projects via GET ──────────────────────────────
async function loadAllProjects() {
  const res = await fetch(APPS_SCRIPT_URL);
  if (!res.ok) throw new Error(`Read failed: ${res.status}`);
  const raw = await res.json();
  if (!raw || raw.length < 2) return [];
  const headers = raw[0];
  if (headers[0] !== 'id') return [];
  return raw.slice(1)
    .filter(r => r[0])
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i] !== undefined ? String(r[i]) : '');
      return obj;
    });
}

// ── WRITE a project via POST ───────────────────────────────
async function saveProjectToSheet(project) {
  project.updatedAt = new Date().toISOString();

  // On very first save, write header row first
  const check = await fetch(APPS_SCRIPT_URL);
  const raw = await check.json().catch(() => []);
  if (!raw || raw.length === 0 || raw[0][0] !== 'id') {
    await scriptPost({ action: 'save', row: COLS });
  }

  await scriptPost({ action: 'save', row: projectToRow(project) });
}

// ── DELETE a project via POST ──────────────────────────────
async function deleteProjectFromSheet(id) {
  await scriptPost({ action: 'delete', id });
}

// ── POST helper — uses text/plain to avoid CORS preflight ─
async function scriptPost(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return res.json().catch(() => ({}));
}

// ── Serialize project → flat row array ────────────────────
function projectToRow(p) {
  return COLS.map(k => {
    const v = p[k];
    if (v === true)  return '1';
    if (v === false) return '0';
    return v !== undefined && v !== null ? String(v) : '';
  });
}

// ── Deserialize row object → typed project ────────────────
function rowToProject(obj) {
  const p = { ...obj };
  for (const m of RATES.materials) p[`mat_${m.key}`]      = p[`mat_${m.key}`] === '1';
  for (const a of RATES.addons)    p[`addon_${a.key}_on`] = p[`addon_${a.key}_on`] === '1';
  const numFields = [
    'area0sf','area0lf','area1sf','area1lf','area2sf','area2lf',
    'area3sf','area3lf','area4sf','area4lf','area5sf','area5lf',
    'area6sf','area6lf','area7sf','area7lf','area8sf','area8lf','area9sf','area9lf',
    ...RATES.addons.map(a => `addon_${a.key}_qty`),
    'days','men','trips','miles','vehicles','hotelNights','rooms',
    'laborRate','laborMarkup','matMarkup','contractPrice'
  ];
  for (const f of numFields) if (p[f] !== '' && p[f] !== undefined) p[f] = parseFloat(p[f]) || 0;
  return p;
}
