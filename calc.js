function recalc() {
  const grade = document.getElementById('f-grade').value;
  const cls   = document.getElementById('f-class').value;
  const gr    = RATES.grade[grade];

  // ── Areas ──────────────────────────────────────────────
  let totalSF=0, totalLF=0, totalJobMH=0;
  for (let i=0; i<10; i++) {
    const sfEl = document.getElementById(`area-sf-${i}`);
    const lfEl = document.getElementById(`area-lf-${i}`);
    const sf = parseFloat(sfEl?.value)||0;
    const lf = parseFloat(lfEl?.value)||0;
    totalSF += sf; totalLF += lf;
    const sfmhRate = sf > 0 ? getSFperMH(sf, grade) : 0;
    const mh = sf > 0 ? (sf/sfmhRate) + (lf > 0 ? lf/gr.edgeLFperMH : 0) : 0;
    totalJobMH += mh;
    const rateEl = document.getElementById(`area-rate-${i}`);
    const mhEl   = document.getElementById(`area-mh-${i}`);
    if (rateEl) {
      rateEl.textContent = sf > 0 ? sfmhRate : '—';
      rateEl.className   = 'area-calc' + (sf>0?' has-value':'');
    }
    if (mhEl) {
      mhEl.textContent = mh > 0 ? mh.toFixed(2) : '—';
      mhEl.className   = 'area-calc' + (mh>0?' has-value':'');
    }
  }
  document.getElementById('tot-sf').textContent = totalSF > 0 ? totalSF.toLocaleString() : '—';
  document.getElementById('tot-lf').textContent = totalLF > 0 ? totalLF.toLocaleString() : '—';
  document.getElementById('tot-mh').textContent = totalJobMH > 0 ? totalJobMH.toFixed(2) : '—';

  // Grade calc chips
  const sfmhDisplay = totalSF > 0 ? getSFperMH(totalSF, grade) : (getSFperMH(1000, grade));
  document.getElementById('calc-sfmh').textContent    = sfmhDisplay + ' SF/MH';
  document.getElementById('calc-lfmh').textContent    = gr.edgeLFperMH + ' LF/MH';
  const adj = RATES.classAdj[cls];
  document.getElementById('calc-classadj').textContent = (adj >= 0 ? '+' : '') + adj + ' SF/MH';

  // Update material rate labels based on current grade
  const gradeRates = {
    densifier: `${gr.densifierSFperGal} SF/gal`,
    sr2Sealer: `${gr.sr2SFperGal} SF/gal`,
    guard:     `78 SF/gal`,
    grinder:   `$${gr.grinderPerSF}/SF`,
    edging:    `$${gr.edgingPerLF}/LF`,
    genFuel:   `$${gr.fuelPerSF}/SF`,
    misc:      `$0.03/SF + $20`,
  };
  for (const [key, label] of Object.entries(gradeRates)) {
    const el = document.getElementById(`mat-rate-${key}`);
    if (el) el.textContent = label;
  }
  let matTotal = 0;
  for (const m of RATES.materials) {
    const on = document.getElementById(`mat-on-${m.key}`)?.checked;
    if (!on) { setMatCost(m.key, 0); continue; }
    let cost = 0;
    if (m.key === 'densifier')  cost = (totalSF / gr.densifierSFperGal) * RATES.matCosts.densifier;
    if (m.key === 'sr2Sealer')  cost = (totalSF / gr.sr2SFperGal)       * RATES.matCosts.sr2Sealer;
    if (m.key === 'guard')      cost = (totalSF / 78)                    * RATES.matCosts.guard;
    if (m.key === 'grinder')    cost = totalSF  * gr.grinderPerSF;
    if (m.key === 'edging')     cost = totalLF  * gr.edgingPerLF;
    if (m.key === 'genFuel')    cost = totalSF  * gr.fuelPerSF;
    if (m.key === 'misc')       cost = totalSF  * RATES.matCosts.miscSupplies + 20;
    matTotal += cost;
    setMatCost(m.key, cost);
  }
  document.getElementById('mat-total').textContent = fmt$(matTotal);

  // ── Add-ons ────────────────────────────────────────────
  let addonTotal = 0;
  for (const a of RATES.addons) {
    const on  = document.getElementById(`addon-on-${a.key}`)?.checked;
    const qty = parseFloat(document.getElementById(`addon-qty-${a.key}`)?.value)||0;
    const cost = on && qty > 0 ? qty * a.rate : 0;
    addonTotal += cost;
    const el = document.getElementById(`addon-cost-${a.key}`);
    if (el) el.textContent = on && qty>0 ? fmt$(cost) : '—';
    const row = document.getElementById(`addon-row-${a.key}`);
    if (row) row.className = 'toggle-row' + (on ? ' active-row' : '');
  }
  document.getElementById('addon-total').textContent = fmt$(addonTotal);

  // ── Travel ─────────────────────────────────────────────
  const days   = parseFloat(document.getElementById('f-days')?.value)||0;
  const men    = parseFloat(document.getElementById('f-men')?.value)||0;
  const trips  = parseFloat(document.getElementById('f-trips')?.value)||0;
  const miles  = parseFloat(document.getElementById('f-miles')?.value)||0;
  const veh    = parseFloat(document.getElementById('f-vehicles')?.value)||0;
  const hNights= parseFloat(document.getElementById('f-hotel-nights')?.value)||0;
  const rooms  = parseFloat(document.getElementById('f-rooms')?.value)||0;

  const travelMH     = (miles / RATES.travel.milesPerHr) * men * trips;
  const fuelCost     = miles * RATES.travel.fuelPerMile * veh * trips;
  const hotelCost    = hNights * rooms * RATES.travel.hotelRate;
  const perDiem      = men * days * RATES.travel.perDiemPerManDay;
  const travelTotal  = fuelCost + hotelCost + perDiem;

  document.getElementById('calc-travel-mh').textContent    = travelMH.toFixed(2);
  document.getElementById('calc-fuel').textContent         = fmt$(fuelCost);
  document.getElementById('calc-hotel').textContent        = fmt$(hotelCost);
  document.getElementById('calc-perdiem').textContent      = fmt$(perDiem);
  document.getElementById('calc-travel-total').textContent = fmt$(travelTotal);

  // ── Pricing ────────────────────────────────────────────
  const laborRate    = parseFloat(document.getElementById('f-labor-rate')?.value)||0;
  const laborMarkup  = parseFloat(document.getElementById('f-labor-markup')?.value)||0;
  const matMarkup    = parseFloat(document.getElementById('f-mat-markup')?.value)||0;

  const totalMH      = totalJobMH + travelMH;
  const laborRaw     = totalMH * laborRate;
  const subtotal     = matTotal + addonTotal + travelTotal + laborRaw;
  const laborMarked  = laborRaw * laborMarkup;
  const matMarked    = (matTotal + addonTotal + travelTotal) * matMarkup;
  const contract     = laborMarked + matMarked;

  set('ps-mh',           totalMH.toFixed(2));
  set('ps-mat',          fmt$(matTotal));
  set('ps-addons',       fmt$(addonTotal));
  set('ps-travel',       fmt$(travelTotal));
  set('ps-labor',        fmt$(laborRaw));
  set('ps-subtotal',     fmt$(subtotal));
  set('ps-labor-marked', fmt$(laborMarked));
  set('ps-mat-marked',   fmt$(matMarked));
  set('ps-contract',     fmt$(contract));

  // Sidebar summary
  set('ss-mh',    totalMH.toFixed(1));
  set('ss-mat',   fmt$(matTotal + addonTotal));
  set('ss-price', fmt$(contract));

  return { totalSF, totalLF, totalJobMH, travelMH, totalMH,
           matTotal, addonTotal, travelTotal, laborRaw,
           subtotal, laborMarked, matMarked, contract,
           fuelCost, hotelCost, perDiem, grade, cls,
           laborRate, laborMarkup, matMarkup };
}

function setMatCost(key, cost) {
  const qtyEl  = document.getElementById(`mat-qty-${key}`);
  const costEl = document.getElementById(`mat-cost-${key}`);
  if (costEl) costEl.textContent = cost > 0 ? fmt$(cost) : '—';
  // qty display
  if (qtyEl && cost > 0) {
    const grade = document.getElementById('f-grade').value;
    const gr = RATES.grade[grade];
    const totalSF = [...document.querySelectorAll('[id^="area-sf-"]')].reduce((s,e)=>s+(parseFloat(e.value)||0),0);
    const totalLF = [...document.querySelectorAll('[id^="area-lf-"]')].reduce((s,e)=>s+(parseFloat(e.value)||0),0);
    let qty = '';
    if (key==='densifier')  qty = (totalSF/gr.densifierSFperGal).toFixed(2)+' gal';
    if (key==='sr2Sealer')  qty = (totalSF/gr.sr2SFperGal).toFixed(2)+' gal';
    if (key==='guard')      qty = (totalSF/78).toFixed(2)+' gal';
    qtyEl.textContent = qty;
  } else if (qtyEl) {
    qtyEl.textContent = '—';
  }
}

function fmt$(n) { return '$' + (Math.round(n*100)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function set(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }
