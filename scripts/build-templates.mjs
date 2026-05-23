// Generate the two coach plan templates as easy-to-fill .xlsx workbooks.
//
// Layout (single sheet, "flat" — one row per exercise):
//
//   Title row
//   How-it-works note
//   blank
//   META block          label in col A, value in col B
//     Title / Author / Mode / Start Date / [Competition Date] / Description
//   blank
//   TABLE
//     Header: Phase | Phase Type | Week | Focus | Intensity | Sess/wk |
//             Week Notes | Day | Session | Mode | Session Type | Exercise
//     Example rows (fill-down: blank cells inherit the row above)
//   blank
//   REFERENCE / glossary (free text)
//
// The app's xlsx importer (src/lib/planSharing/xlsxCodec.ts) finds the
// header row by scanning for a row containing both "Phase" and "Exercise",
// reads the meta block above it, then rebuilds the phase → week → session
// → exercise tree by value-change grouping. The coach fills phase/week/
// session once and adds exercise rows below, leaving those columns blank.
//
// Dropdowns (data validation) are added to the categorical columns:
//   META Mode; Phase Type; Intensity; Day; (session) Mode; Session Type.
// Applied to the example rows + a buffer of blank rows so coaches still
// get dropdowns when they add their own rows.
//
// Run: npm run build-templates

import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, '..', 'templates');

// ── Reference value lists (kept in sync with src/lib/models/types.ts) ──
const PLAN_MODES = ['depth', 'pool', 'dry', 'general'];
const SESSION_MODES = ['depth', 'pool', 'dry', 'general'];
const INTENSITIES = ['recovery', 'low', 'medium', 'high', 'max'];
const PHASE_TYPES = ['base', 'build', 'specific', 'taper', 'competition', 'transition'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SESSION_TYPES_ALL = [
  // depth
  'EQ', 'DA', 'TE', 'FE', 'MAX', 'RC',
  // pool (TE / MAX / RC overlap with depth)
  'VOL', 'CO2', 'O2', 'SP', 'FUN',
  // dry
  'co2_table', 'o2_table', 'comfy', 'pb_attempt', 'recovery',
];

// Flat table columns, in display order. `header` matches the importer's
// header aliases; `width` tunes the column.
const COLUMNS = [
  { header: 'Phase', width: 16 },
  { header: 'Phase Type', width: 13 },
  { header: 'Week', width: 8 },
  { header: 'Focus', width: 26 },
  { header: 'Intensity', width: 12 },
  { header: 'Sess/wk', width: 9 },
  { header: 'Week Notes', width: 24 },
  { header: 'Day', width: 8 },
  { header: 'Session', width: 22 },
  { header: 'Mode', width: 10 },
  { header: 'Session Type', width: 14 },
  { header: 'Exercise', width: 42 },
];
// 1-based column indices for dropdown targeting.
const COL = {
  phaseType: 2,
  intensity: 5,
  day: 8,
  mode: 10,
  sessionType: 11,
};

// ── Helpers ────────────────────────────────────────────────────────────
function listFormula(values) {
  return [`"${values.join(',')}"`];
}

function titleStyle(cell) {
  cell.font = { bold: true, size: 14, color: { argb: 'FFC8272D' } };
}
function noteStyle(cell) {
  cell.font = { italic: true, color: { argb: 'FF666666' } };
}
function metaLabelStyle(cell) {
  cell.font = { bold: true, color: { argb: 'FF333333' } };
}
function editableStyle(cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8DC' } };
}
function headerStyle(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A2724' } };
    cell.alignment = { vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF999999' } } };
  });
}
function refTitleStyle(cell) {
  cell.font = { bold: true, color: { argb: 'FFC8272D' } };
}
function mutedStyle(cell) {
  cell.font = { color: { argb: 'FF666666' } };
}

function addDropdown(cell, values) {
  cell.dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: listFormula(values),
    showErrorMessage: true,
    errorStyle: 'warning',
    errorTitle: 'Unexpected value',
    error: `Pick one of: ${values.join(', ')}`,
  };
}

// ── Workbook builder ─────────────────────────────────────────────────────
function buildWorkbook(kind /* 'training' | 'season' */) {
  const isSeason = kind === 'season';
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ELEMENT | 08';
  wb.created = new Date();
  const ws = wb.addWorksheet(isSeason ? 'Season Plan' : 'Training Plan');

  COLUMNS.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
  });

  // ── Title + note ──
  const title = ws.addRow([
    isSeason ? 'ELEMENT | 08 Season Plan' : 'ELEMENT | 08 Training Plan',
  ]);
  titleStyle(title.getCell(1));
  const note = ws.addRow([
    'Fill the cream cells. Add exercise rows below a session, leaving Phase / Week / Session blank to keep them in that session. Send the .xlsx to your student; they import it directly in ELEMENT | 08.',
  ]);
  noteStyle(note.getCell(1));
  ws.mergeCells(note.number, 1, note.number, 12);
  ws.addRow([]);

  // ── META block ──
  const metaRows = [
    ['Title', isSeason ? '8-Week Depth Build' : 'Pre-trip CO2 ramp'],
    ['Author', 'Coach Maya'],
    ['Mode', isSeason ? 'depth' : 'pool'],
    ['Start Date', '2026-06-01'],
    ...(isSeason ? [['Competition Date', '2026-08-15']] : []),
    [
      'Description',
      isSeason
        ? 'Two-phase build toward a depth PB. Base then specific.'
        : '2-week pool block to sharpen CO2 tolerance before a trip.',
    ],
  ];
  for (const [label, value] of metaRows) {
    const r = ws.addRow([label, value]);
    metaLabelStyle(r.getCell(1));
    editableStyle(r.getCell(2));
    if (label === 'Mode') addDropdown(r.getCell(2), PLAN_MODES);
  }
  ws.addRow([]);

  // ── Table header ──
  const headerRow = ws.addRow(COLUMNS.map((c) => c.header));
  headerStyle(headerRow);
  const headerRowNum = headerRow.number;

  // ── Example data rows ──
  const examples = isSeason
    ? [
        ['Base', 'base', '1', 'Aerobic base + relaxation', 'low', '4', 'Build comfort', 'Mon', 'Long pool aerobic', 'pool', 'VOL', '800m easy DYN, long glides'],
        ['', '', '', '', '', '', '', 'Wed', 'CO2 table', 'dry', 'co2_table', '8 holds, 15s SI decrement'],
        ['', '', '', '', '', '', '', 'Sat', 'Easy line dive', 'depth', 'DA', 'Free immersion to 20m, relaxed'],
        ['Base', 'base', '2', 'Add volume', 'medium', '4', '', 'Mon', 'Pool aerobic', 'pool', 'VOL', '1000m easy DYN'],
        ['', '', '', '', '', '', '', 'Sat', 'Depth adaptation', 'depth', 'DA', '3 dives to 25m, focus equalization'],
        ['Specific', 'specific', '3', 'Target depth work', 'high', '4', 'Peak block', 'Wed', 'Max attempts', 'depth', 'MAX', '2 dives near PB, full recovery'],
        ['', '', '', '', '', '', '', 'Sun', 'Recovery', 'pool', 'RC', '400m very easy'],
      ]
    : [
        ['Base', 'base', '1', 'Build CO2 base', 'low', '3', 'Pool sessions only', 'Mon', 'Aerobic distance', 'pool', 'VOL', '15 min easy continuous'],
        ['', '', '', '', '', '', '', '', '', '', '', '4x100m DYN @ 2:30 strong'],
        ['', '', '', '', '', '', '', 'Wed', 'CO2 table', 'dry', 'co2_table', '8 holds, 15s SI decrement'],
        ['Base', 'base', '2', 'Add CO2 stress', 'medium', '3', 'Watch for over-reaching', 'Mon', 'DYN short SI', 'pool', 'CO2', '5x75m @ 2:00 short rest'],
        ['', '', '', '', '', '', '', 'Fri', 'Recovery swim', 'pool', 'RC', '500m easy with long glides'],
      ];

  for (const row of examples) {
    const r = ws.addRow(row);
    // Cream fill on every content cell so the table reads as "edit me".
    for (let c = 1; c <= COLUMNS.length; c++) editableStyle(r.getCell(c));
  }

  // ── Dropdowns over the example rows + a buffer for added rows ──
  const firstDataRow = headerRowNum + 1;
  const lastDropdownRow = firstDataRow + examples.length + 40;
  for (let rn = firstDataRow; rn <= lastDropdownRow; rn++) {
    addDropdown(ws.getCell(rn, COL.phaseType), PHASE_TYPES);
    addDropdown(ws.getCell(rn, COL.intensity), INTENSITIES);
    addDropdown(ws.getCell(rn, COL.day), DAYS);
    addDropdown(ws.getCell(rn, COL.mode), SESSION_MODES);
    addDropdown(ws.getCell(rn, COL.sessionType), SESSION_TYPES_ALL);
  }

  // ── Reference / glossary ──
  ws.addRow([]);
  ws.addRow([]);
  const refTitle = ws.addRow(['HOW THIS WORKS']);
  refTitleStyle(refTitle.getCell(1));
  const refLines = [
    '',
    'Each row is one exercise. The Phase / Week / Session columns carry the structure.',
    'Fill them on the first row of a session, then add exercise rows below leaving them',
    'blank — those exercises join the same session. Change the Session cell to start a',
    'new session; change Week to start a new week; change Phase to start a new phase.',
    '',
    'COLUMNS',
    '   Phase          Name of the training phase (e.g. Base, Specific). Required on first row.',
    '   Phase Type     base / build / specific / taper / competition / transition.',
    '   Week           Week number (1, 2, 3 ...) or a start date (YYYY-MM-DD).',
    '   Focus          One-line focus for the week.',
    '   Intensity      recovery / low / medium / high / max.',
    '   Sess/wk        Target number of sessions that week.',
    '   Week Notes     Optional note for the week.',
    '   Day            Mon ... Sun.',
    '   Session        Session name (e.g. CO2 table). Start a new session by filling this.',
    '   Mode           depth / pool / dry / general. Which kind of session.',
    '   Session Type   Depth: EQ DA TE FE MAX RC.  Pool: VOL CO2 O2 SP TE MAX FUN RC.',
    '                  Dry: co2_table o2_table comfy pb_attempt recovery.',
    '   Exercise       Free text. The student sees this in the session detail. Required.',
    '',
    'META (top of sheet)',
    '   Title          Plan name shown in the app.',
    '   Author         Your name. Locked onto the plan when the student imports it.',
    '   Mode           Default mode for the plan (sessions can override per row).',
    '   Start Date     Optional. YYYY-MM-DD.',
    ...(isSeason ? ['   Competition Date  Optional target date. YYYY-MM-DD.'] : []),
    '   Description    Optional. Short summary of the plan.',
  ];
  for (const text of refLines) {
    const r = ws.addRow([text]);
    if (text) mutedStyle(r.getCell(1));
  }

  return wb;
}

// ── Run ──────────────────────────────────────────────────────────────────
const trainingWb = buildWorkbook('training');
const seasonWb = buildWorkbook('season');

const trainingPath = path.join(OUT_DIR, 'e08_training_plan_template.xlsx');
const seasonPath = path.join(OUT_DIR, 'e08_season_plan_template.xlsx');

await trainingWb.xlsx.writeFile(trainingPath);
await seasonWb.xlsx.writeFile(seasonPath);

console.log(`Built ${trainingPath}`);
console.log(`Built ${seasonPath}`);
