const RATES = {
  grade: {
    'Grade 1': { edgeLFperMH: 25, densifierSFperGal: 500, sr2SFperGal: 1500, grinderPerSF: 0.16, edgingPerLF: 0.05, fuelPerSF: 0.03 },
    'Grade 2': { edgeLFperMH: 16, densifierSFperGal: 450, sr2SFperGal: 1500, grinderPerSF: 0.23, edgingPerLF: 0.07, fuelPerSF: 0.03 },
    'Grade 3': { edgeLFperMH:  8, densifierSFperGal: 400, sr2SFperGal: 1500, grinderPerSF: 0.30, edgingPerLF: 0.10, fuelPerSF: 0.04 },
  },
  classAdj: { 'Class 1': -750, 'Class 2': 0, 'Class 3': 750 },
  sfMH: [
    { sf:0,     g1:10, g2:10, g3:10 },
    { sf:500,   g1:20, g2:15, g3:10 },
    { sf:700,   g1:25, g2:15, g3:11 },
    { sf:900,   g1:30, g2:18, g3:11 },
    { sf:1100,  g1:35, g2:20, g3:12 },
    { sf:1300,  g1:40, g2:24, g3:14 },
    { sf:1600,  g1:45, g2:28, g3:16 },
    { sf:2000,  g1:50, g2:32, g3:18 },
    { sf:2500,  g1:55, g2:36, g3:20 },
    { sf:3500,  g1:65, g2:42, g3:22 },
    { sf:5000,  g1:70, g2:50, g3:24 },
    { sf:7000,  g1:75, g2:55, g3:26 },
    { sf:10000, g1:80, g2:60, g3:30 },
  ],
  matCosts: { densifier: 32, sr2Sealer: 155, guard: 75, miscSupplies: 0.03 },
  travel: { mhPerDay: 10, milesPerHr: 50, hotelRate: 175, perDiemPerManDay: 25, fuelPerMile: 0.40 },
  addons: [
    { key:'epoxyLight',   label:'Epoxy Removal — Light',          unit:'SF', rate:0.12 },
    { key:'epoxyHeavy',   label:'Epoxy Removal — Heavy',          unit:'SF', rate:0.20 },
    { key:'glueLight',    label:'Glue Removal — Light',           unit:'SF', rate:0.12 },
    { key:'glueHeavy',    label:'Glue Removal — Heavy',           unit:'SF', rate:0.15 },
    { key:'dye',          label:'Dye Mix',                        unit:'SF', rate:0.20 },
    { key:'jf1',          label:'Joint Filler 1/4" × 3/4"',      unit:'LF', rate:0.67 },
    { key:'jf2',          label:'Joint Filler 1/4" × 1-1/2"',    unit:'LF', rate:0.71 },
    { key:'cracks',       label:'Cracks (w/ Joint Filler)',       unit:'LF', rate:0.50 },
    { key:'patches',      label:'Patches',                        unit:'SF', rate:0.90 },
    { key:'groutCoat',    label:'Grout Coat — Quick Mender',      unit:'SF', rate:0.54 },
    { key:'floorProt',    label:'Floor Protection (Ramboard)',    unit:'SF', rate:0.26 },
    { key:'grindSeal',    label:'Grind / Clean and Seal',         unit:'SF', rate:0.08 },
  ],
  materials: [
    { key:'densifier',    label:'Densifier',         defaultOn: true  },
    { key:'sr2Sealer',    label:'SR2 Sealer',         defaultOn: true  },
    { key:'guard',        label:'Guard (2 Coats)',    defaultOn: false },
    { key:'grinder',      label:'Grinder Diamonds',  defaultOn: true  },
    { key:'edging',       label:'Edging Diamonds',   defaultOn: true  },
    { key:'genFuel',      label:'Generator Fuel',    defaultOn: true  },
    { key:'misc',         label:'Misc. Supplies',    defaultOn: true  },
  ]
};

function getSFperMH(sf, grade) {
  const col = grade === 'Grade 1' ? 'g1' : grade === 'Grade 2' ? 'g2' : 'g3';
  let rate = RATES.sfMH[0][col];
  for (const row of RATES.sfMH) {
    if (sf >= row.sf) rate = row[col]; else break;
  }
  return rate;
}
