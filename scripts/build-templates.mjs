// Generate the two .e08plan.xlsx coach templates.
//
// Single-sheet workbooks so "Save As → CSV" produces the wire format
// the app expects in one click, no copy/paste between tabs.
//
// Layout matches the CSV equivalents row-for-row:
//   Title rows (intro + "save as CSV when done" + "reference at bottom")
//   # === META ===           ┐
//   # === PHASES ===         │
//   # === WEEKS ===          │  same as CSV section markers + headers + data
//   # === SESSIONS ===       │
//   # === EXERCISES ===      ┘
//   blank
//   HOW THIS WORKS           ┐  free-form reference text
//   VALID VALUES             ┘
//
// Dropdowns (data validation) are added on the categorical cells:
//   META.kind, META.type, META.mode, META.start_date (date hint)
//   WEEKS.intensity
//   PHASES.type
//   SESSIONS.day_of_week, SESSIONS.mode, SESSIONS.session_type
//
// session_type uses the union of all valid types (depth + pool + dry).
// Conditional dropdowns based on mode are technically possible in xlsx
// but cross-tool compatibility (Numbers vs Excel vs Sheets) is too
// fragile to rely on. Validation at import catches mismatches.
//
// Run: npm run build-templates

import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const OUT_DIR    = path.resolve(__dirname, '..', 'templates');

// ── Reference value lists (single source of truth in this script) ─────

const KINDS         = ['training', 'season'];
const FILE_TYPES    = ['training_plan', 'season_plan'];
const PLAN_MODES    = ['depth', 'pool', 'general'];
const SESSION_MODES = ['depth', 'pool', 'dry', 'general'];
const INTENSITIES   = ['recovery', 'low', 'medium', 'high', 'max'];
const PHASE_TYPES   = ['base', 'capacity', 'specific', 'taper', 'competition', 'transition'];
const DAYS_OF_WEEK  = [0, 1, 2, 3, 4, 5, 6];
const SESSION_TYPES_ALL = [
  // depth
  'EQ', 'DA', 'TE', 'FE', 'MAX', 'RC',
  // pool (TE / MAX / RC overlap with depth safe)
  'VOL', 'CO2', 'O2', 'SP', 'FUN',
  // dry
  'co2_table', 'o2_table', 'comfy', 'pb_attempt', 'recovery',
];

const INTRO_LINES = [
  'This file is a working example. Edit the cells to make it your plan.',
  'Save as CSV (UTF-8) when done. Send the file to your student.',
  'Reference for valid values + column glossary is at the bottom.',
];

const LEGEND_LINES = [
  'Cell colours:',
  '   Cream      = fill these in. Plan content + structural indices when you add rows.',
  '   Grey       = optional. Leave blank and the app generates a default.',
  '   White      = preset by the template. Usually leave alone (e.g. type, kind).',
];

// ── Tiny helpers ──────────────────────────────────────────────────────

function listFormula(values) {
  // Excel data validation list. Quoted comma-separated string.
  return [`"${values.join(',')}"`];
}

function applyHeaderStyle(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF1F1F1F' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF999999' } },
    };
  });
}

function applyTitleStyle(cell) {
  cell.font = { bold: true, size: 14, color: { argb: 'FFC8190F' } };
}

function applySectionMarkerStyle(cell) {
  cell.font = { bold: true, color: { argb: 'FF555555' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
}

function applyReferenceTitleStyle(cell) {
  cell.font = { bold: true, color: { argb: 'FFC8190F' } };
}

function applyMutedStyle(cell) {
  cell.font = { color: { argb: 'FF666666' } };
}

// "Edit me" the cells that carry the coach's actual content. Light
// cream fill so the eye lands on them when scanning the file.
function applyEditableStyle(cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8DC' } };
}

// "Auto-fill" optional cells where blank is fine and the app /
// importer fills in a default. Grey fill + italic so they read as
// "you don't need to touch this".
function applyAutofillStyle(cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  cell.font = { italic: true, color: { argb: 'FF888888' } };
}

// Add a list-validation dropdown to a single cell.
function addDropdown(cell, values, prompt = null) {
  cell.dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: listFormula(values),
    showErrorMessage: true,
    errorStyle: 'warning',
    errorTitle: 'Unexpected value',
    error: `Pick one of: ${values.join(', ')}`,
    ...(prompt
      ? { showInputMessage: true, promptTitle: 'Allowed values', prompt }
      : {}),
  };
}

// ── Workbook builder ──────────────────────────────────────────────────

function buildWorkbook(kind /* 'training' | 'season' */) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ELEMENT | 08';
  wb.created = new Date();

  const ws = wb.addWorksheet(kind === 'training' ? 'Training Plan' : 'Season Plan', {
    properties: { defaultColWidth: 18 },
  });

  // Column widths tuned to the widest content.
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 26;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 14;

  // ── Title block ──────────────────────────────────────────────────
  const titleRow = ws.addRow([
    kind === 'training'
      ? 'ELEMENT | 08 Training Plan Template'
      : 'ELEMENT | 08 Season Plan Template',
  ]);
  applyTitleStyle(titleRow.getCell(1));
  ws.addRow([]);
  for (const line of INTRO_LINES) {
    const r = ws.addRow([line]);
    applyMutedStyle(r.getCell(1));
  }
  ws.addRow([]);
  for (const line of LEGEND_LINES) {
    const r = ws.addRow([line]);
    applyMutedStyle(r.getCell(1));
  }
  // Mini swatch row showing the three colours.
  const swatchRow = ws.addRow(['', 'cream', 'grey', 'white']);
  applyMutedStyle(swatchRow.getCell(1));
  applyEditableStyle(swatchRow.getCell(2));
  applyAutofillStyle(swatchRow.getCell(3));
  // Cell 4 stays default (white).
  ws.addRow([]);

  // ── META ────────────────────────────────────────────────────────
  applySectionMarkerStyle(ws.addRow(['# === META ===']).getCell(1));
  applyHeaderStyle(ws.addRow(['key', 'value']));

  const isTraining = kind === 'training';
  const metaRows = isTraining
    ? [
        ['title',       'Pre-trip CO2 ramp'],
        ['author',      'Coach Maya'],
        ['type',        'training_plan'],
        ['kind',        'training'],
        ['mode',        'pool'],
        ['description', '2-week pool block for divers prepping a depth trip. Builds CO2 tolerance without burning into the trip itself.'],
        ['start_date',  ''],
      ]
    : [
        ['title',            '8-Week Depth Build to 35m'],
        ['author',           'Coach Maya'],
        ['type',             'season_plan'],
        ['kind',             'season'],
        ['mode',             'depth'],
        ['description',      'Two-phase build for divers with a 25-30m PB targeting 35m. Base builds CO2 + EQ rhythm; Capacity adds depth volume + mouthfill work.'],
        ['start_date',       ''],
        ['competition_date', ''],
      ];
  for (const row of metaRows) {
    const r = ws.addRow(row);
    const key = row[0];
    const cell = r.getCell(2);
    if (key === 'kind')  addDropdown(cell, KINDS, 'training (no phases) or season (multi-phase)');
    if (key === 'type')  addDropdown(cell, FILE_TYPES, 'training_plan or season_plan. Match this to "kind".');
    if (key === 'mode')  addDropdown(cell, PLAN_MODES, 'Plan-level training mode. Sessions can override individually.');

    // Cream = coach's content. Grey = auto-fill / leave blank.
    if (key === 'title' || key === 'author' || key === 'description' || key === 'mode') {
      applyEditableStyle(cell);
    } else if (key === 'start_date' || key === 'competition_date') {
      applyAutofillStyle(cell);
    }
    // type / kind stay default preset by template choice.
  }
  ws.addRow([]);

  // ── PHASES ──────────────────────────────────────────────────────
  applySectionMarkerStyle(ws.addRow(['# === PHASES ===']).getCell(1));
  applyHeaderStyle(ws.addRow(['phase_idx', 'id', 'name', 'type']));
  const phaseRows = isTraining
    ? [[0, 'phase_0', 'Training Plan', 'base']]
    : [
        [0, 'phase_base',     'Base',     'base'],
        [1, 'phase_capacity', 'Capacity', 'capacity'],
      ];
  for (const row of phaseRows) {
    const r = ws.addRow(row);
    addDropdown(r.getCell(4), PHASE_TYPES, 'Phase semantic type. Drives MESO color in the app.');
    applyEditableStyle(r.getCell(1));   // phase_idx coach types when adding phases
    applyAutofillStyle(r.getCell(2));   // id auto-generates if blank
    applyEditableStyle(r.getCell(3));   // name
    // type (col 4): only edit-relevant for season plans. Training plans
    // hide the phase entirely so type is invisible.
    if (!isTraining) applyEditableStyle(r.getCell(4));
  }
  ws.addRow([]);

  // ── WEEKS ───────────────────────────────────────────────────────
  applySectionMarkerStyle(ws.addRow(['# === WEEKS ===']).getCell(1));
  applyHeaderStyle(ws.addRow([
    'phase_idx', 'week_idx', 'week_start', 'focus', 'intensity', 'target_sessions', 'notes',
  ]));
  const weekRows = isTraining
    ? [
        [0, 0, '', 'Build CO2 base. Aerobic distance. Easy turn rhythm.', 'low',    3, 'Pool sessions only. No depth.'],
        [0, 1, '', 'Add CO2 stress. Shorter rests on DYN sets.',          'medium', 3, 'Watch for over-reaching. Back off if recovery suffers.'],
      ]
    : [
        [0, 0, '', 'Establish session rhythm. Comfort and relaxation in shallow water.', 'low',      3, "Don't push depth this week. Build the habit."],
        [0, 1, '', 'Build FRC volume. Introduce bottom hangs at 10-15m.',                'low',      3, ''],
        [0, 2, '', 'Increase progressive dive depth. Add FRC mouthfill drills.',         'medium',   3, 'Aim for 3 dives in the 18-22m range.'],
        [0, 3, '', 'Deload. Reduce intensity. Let adaptations settle.',                  'recovery', 2, 'Easy week before pushing into Capacity.'],
        [1, 0, '', 'Final base week. Build back from deload.',                           'medium',   3, ''],
        [1, 1, '', 'Push depth toward 25m on adaptation dives.',                         'medium',   3, ''],
        [1, 2, '', 'Extend bottom hangs to 8-10s at adaptation depth.',                  'high',     3, 'Stop if EQ rhythm breaks.'],
        [1, 3, '', 'Mouthfill chargework + first attempts at 30m+.',                     'high',     2, 'Quality over quantity. Two well-prepped dives is plenty.'],
      ];
  for (const row of weekRows) {
    const r = ws.addRow(row);
    addDropdown(r.getCell(5), INTENSITIES, 'Planned intensity for the week. Guidance only.');
    applyEditableStyle(r.getCell(1));   // phase_idx, coach types when adding rows
    applyEditableStyle(r.getCell(2));   // week_idx, coach types when adding rows
    applyAutofillStyle(r.getCell(3));   // week_start leave blank, anchored at activation
    applyEditableStyle(r.getCell(4));   // focus
    applyEditableStyle(r.getCell(5));   // intensity
    applyEditableStyle(r.getCell(6));   // target_sessions
    applyEditableStyle(r.getCell(7));   // notes
  }
  ws.addRow([]);

  // ── SESSIONS ────────────────────────────────────────────────────
  applySectionMarkerStyle(ws.addRow(['# === SESSIONS ===']).getCell(1));
  applyHeaderStyle(ws.addRow([
    'phase_idx', 'week_idx', 'session_idx', 'session_id',
    'day_of_week', 'label', 'mode', 'session_type',
  ]));
  const sessionRows = isTraining
    ? [
        [0, 0, 0, 'sess_w1_a', 1, 'Aerobic distance',     'pool', 'VOL'],
        [0, 0, 1, 'sess_w1_b', 3, 'CO2 table',            'dry',  'co2_table'],
        [0, 0, 2, 'sess_w1_c', 5, 'Easy DYN technique',   'pool', 'TE'],
        [0, 1, 0, 'sess_w2_a', 1, 'DYN with shorter SI',  'pool', 'CO2'],
        [0, 1, 1, 'sess_w2_b', 3, 'Hard CO2 table',       'dry',  'co2_table'],
        [0, 1, 2, 'sess_w2_c', 5, 'Recovery swim',        'pool', 'RC'],
      ]
    : [
        [0, 0, 0, 's_b0_0', 1, 'Dry CO2 base',             'dry',   'co2_table'],
        [0, 0, 1, 's_b0_1', 3, 'Shallow comfort dives',    'depth', 'RC'],
        [0, 0, 2, 's_b0_2', 5, 'Pool aerobic',             'pool',  'VOL'],
        [0, 1, 0, 's_b1_0', 1, 'Dry CO2 progression',      'dry',   'co2_table'],
        [0, 1, 1, 's_b1_1', 3, 'FRC dives + bottom hangs', 'depth', 'EQ'],
        [0, 1, 2, 's_b1_2', 5, 'Pool DYN technique',       'pool',  'TE'],
        [0, 2, 0, 's_b2_0', 1, 'Dry CO2 stress',           'dry',   'co2_table'],
        [0, 2, 1, 's_b2_1', 3, 'Adaptation dives',         'depth', 'DA'],
        [0, 2, 2, 's_b2_2', 5, 'Pool DYN volume',          'pool',  'VOL'],
        [0, 3, 0, 's_b3_0', 2, 'Easy dry session',         'dry',   'comfy'],
        [0, 3, 1, 's_b3_1', 4, 'Recovery dives',           'depth', 'RC'],
        [1, 0, 0, 's_c0_0', 1, 'Dry O2 prep',              'dry',   'o2_table'],
        [1, 0, 1, 's_c0_1', 3, 'Mouthfill drill dives',    'depth', 'EQ'],
        [1, 0, 2, 's_c0_2', 5, 'Pool DYN max',             'pool',  'MAX'],
        [1, 1, 0, 's_c1_0', 1, 'Dry O2 progression',       'dry',   'o2_table'],
        [1, 1, 1, 's_c1_1', 3, 'Adaptation toward 25m',    'depth', 'DA'],
        [1, 1, 2, 's_c1_2', 5, 'Pool aerobic recovery',    'pool',  'VOL'],
        [1, 2, 0, 's_c2_0', 1, 'Dry O2 stress',            'dry',   'o2_table'],
        [1, 2, 1, 's_c2_1', 3, 'Long-hang adaptation',     'depth', 'DA'],
        [1, 2, 2, 's_c2_2', 5, 'Pool quality DYN',         'pool',  'VOL'],
        [1, 3, 0, 's_c3_0', 2, 'Mental prep + dry hangs',  'dry',   'pb_attempt'],
        [1, 3, 1, 's_c3_1', 4, 'Max attempt session',      'depth', 'MAX'],
      ];
  for (const row of sessionRows) {
    const r = ws.addRow(row);
    addDropdown(r.getCell(5), DAYS_OF_WEEK.map(String), '0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun');
    addDropdown(r.getCell(7), SESSION_MODES, 'Session training mode. Drives which session_type is valid.');
    addDropdown(r.getCell(8), SESSION_TYPES_ALL, 'Pick a session_type that matches the mode (see VALID VALUES at bottom).');
    applyEditableStyle(r.getCell(1));   // phase_idx, coach types when adding rows
    applyEditableStyle(r.getCell(2));   // week_idx, coach types when adding rows
    applyEditableStyle(r.getCell(3));   // session_idx coach types when adding rows
    applyAutofillStyle(r.getCell(4));   // session_id auto-generates if blank
    applyEditableStyle(r.getCell(5));   // day_of_week
    applyEditableStyle(r.getCell(6));   // label
    applyEditableStyle(r.getCell(7));   // mode
    applyEditableStyle(r.getCell(8));   // session_type
  }
  ws.addRow([]);

  // ── EXERCISES ───────────────────────────────────────────────────
  applySectionMarkerStyle(ws.addRow(['# === EXERCISES ===']).getCell(1));
  applyHeaderStyle(ws.addRow([
    'phase_idx', 'week_idx', 'session_idx', 'exercise_idx', 'exercise_id', 'description',
  ]));
  const exerciseRows = isTraining
    ? [
        [0, 0, 0, 0, 'ex_1', '15 min easy continuous swim with snorkel. Long even strokes.'],
        [0, 0, 0, 1, 'ex_2', '4x100m DYN @ 2:30 send-off. Aim for relaxed 1:30/100m pace.'],
        [0, 0, 1, 0, 'ex_3', 'CO2 table: 8 holds, max length 1:30, decreasing rest 1:30 to 1:00.'],
        [0, 0, 2, 0, 'ex_4', 'Drill set: 4x25m streamline + 4x25m perfect turns.'],
        [0, 0, 2, 1, 'ex_5', '3x50m DYN at moderate pace. Focus glide.'],
        [0, 1, 0, 0, 'ex_6', '5x75m DYN @ 2:00 send-off. Push the last two.'],
        [0, 1, 1, 0, 'ex_7', 'CO2 table: 8 holds, max length 2:00, rest 1:30 to 0:45.'],
        [0, 1, 2, 0, 'ex_8', '500m easy swim with fins. No diving.'],
      ]
    : [
        [0, 0, 0, 0, 'ex_b00_0', 'CO2 table: 8 holds at 60% max, 1:30 to 1:00 rest.'],
        [0, 0, 1, 0, 'ex_b01_0', '3 dives to 5-8m. Long surface intervals (5+ min). Focus relaxation.'],
        [0, 0, 2, 0, 'ex_b02_0', '20 min easy continuous swim with snorkel.'],
        [0, 1, 1, 0, 'ex_b11_0', '5 FRC dives at 8-12m with 5s bottom hang. Focus EQ rhythm.'],
        [1, 3, 0, 0, 'ex_c30_0', 'Visualisation + dry breathe-up routine. 20 min.'],
        [1, 3, 1, 0, 'ex_c31_0', 'Full warm-up protocol. One quality attempt at goal depth.'],
      ];
  for (const row of exerciseRows) {
    const r = ws.addRow(row);
    applyEditableStyle(r.getCell(1));   // phase_idx
    applyEditableStyle(r.getCell(2));   // week_idx
    applyEditableStyle(r.getCell(3));   // session_idx
    applyEditableStyle(r.getCell(4));   // exercise_idx
    applyAutofillStyle(r.getCell(5));   // exercise_id auto-generates if blank
    applyEditableStyle(r.getCell(6));   // description
  }
  ws.addRow([]);

  // ── Reference ───────────────────────────────────────────────────
  // Sentinel marker tells the importer to stop reading data rows. Any
  // free-form text below this point is ignored on import.
  applySectionMarkerStyle(ws.addRow(['# === REFERENCE ===']).getCell(1));
  applyReferenceTitleStyle(ws.addRow(['HOW THIS WORKS']).getCell(1));
  const howRows = [
    '',
    'The plan is split across five sections: META / PHASES / WEEKS / SESSIONS / EXERCISES.',
    'Each section starts with a header row defining its columns. Edit the rows under each header.',
    'Add as many rows as you need.',
    '',
    'Hierarchy is encoded by index columns:',
    '   phase_idx (always 0 for a training plan)',
    '     week_idx (starts at 0)',
    '       session_idx (starts at 0 within each week)',
    '         exercise_idx (starts at 0 within each session)',
    '',
    'You can sort or filter rows in your spreadsheet without breaking the import.',
    'The app rebuilds the nested structure from the indices.',
    '',
    'Save as CSV (UTF-8) when done. Send the file to your student.',
    'They tap "Import Plan from File" in the Plans screen and pick the CSV.',
    'Validation surfaces every issue at once so you can fix and re-export in one pass.',
  ];
  for (const text of howRows) {
    const r = ws.addRow([text]);
    if (text) applyMutedStyle(r.getCell(1));
  }
  ws.addRow([]);
  applyReferenceTitleStyle(ws.addRow(['VALID VALUES']).getCell(1));
  const valueRows = [
    '',
    `kind:               ${KINDS.join(', ')}`,
    `type:               ${FILE_TYPES.join(', ')}`,
    `mode (plan):        ${PLAN_MODES.join(', ')}`,
    `mode (session):     ${SESSION_MODES.join(', ')}`,
    `intensity:          ${INTENSITIES.join(', ')}`,
    `phase type:         ${PHASE_TYPES.join(', ')}`,
    'day_of_week:        0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun',
    'session_type:       depends on mode. Pick the one that fits the session.',
    '',
    '   mode=depth:',
    '     EQ           EQ Training. FRC dives, mouthfill charge work, equalization focus.',
    '     DA           Depth Adaptation. Progressive dives toward or near PB.',
    '     TE           Technique. Finning, streamline, turns. No depth targets.',
    '     FE           Fun / Exploration. Unstructured, no targets.',
    '     MAX          Max Attempt. One quality dive at or beyond PB.',
    '     RC           Recovery. Shallow, easy, minimal exertion.',
    '',
    '   mode=pool:',
    '     VOL          Volume / Mileage. Steady-state distance, aerobic base.',
    '     CO2          CO2 Training. STA + DYN combos, CO2 tolerance.',
    '     O2           O2 Training. Long rests, longer holds, dive reflex.',
    '     SP           Speed. Short, high-intensity reps.',
    '     TE           Technique. Streamline, kick mechanics, turns.',
    '     MAX          Max Attempt. All-out attempt at personal-best distance.',
    '     FUN          Fun. Relays, underwater games, freedive play.',
    '     RC           Recovery. Easy laps or relaxation work.',
    '',
    '   mode=dry:',
    '     co2_table    CO2 Training. Decreasing-rest hold tables for CO2 tolerance.',
    '     o2_table     O2 Training. Increasing-hold tables for O2 tolerance.',
    '     comfy        Relax / Technique. Easy hold work, no pressure.',
    '     pb_attempt   PB Attempt. Max hold session.',
    '     recovery     Recovery. Light, restorative.',
    '',
    '   mode=general:    leave session_type blank.',
  ];
  for (const text of valueRows) {
    const r = ws.addRow([text]);
    if (text) applyMutedStyle(r.getCell(1));
  }

  ws.addRow([]);
  applyReferenceTitleStyle(ws.addRow(['COLUMN GLOSSARY']).getCell(1));
  const glossaryRows = [
    '',
    'META section',
    '   title              Plan name shown to the student. Required.',
    '   author             Your name. Required. Locks once exported (becomes "Imported from {name}" badge).',
    '   description        Short pitch of what the plan is for. Optional but useful.',
    '   type               training_plan or season_plan. Preset by template; matches "kind".',
    '   kind               training (no phases) or season (multi-phase). Preset by template.',
    '   mode               Plan-level mode. depth, pool, or general. Sessions can override.',
    '   start_date         Optional. Leave blank app fills in when student activates.',
    '   competition_date   Season plans only. Optional. Leave blank for student-anchored plans.',
    '',
    'PHASES section',
    '   phase_idx          Phase number, starts with 0. Sequential. Training plans always have just one (0).',
    '   id                 Optional. Leave blank, app generates "phase_0", "phase_1", etc.',
    '   name               Display name for the phase ("Base Building", "Capacity"). Required.',
    '   type               base | capacity | specific | taper | competition | transition.',
    '                      For SEASON plans: pick the type matching each phase. Drives phase colour and naming.',
    '                      For TRAINING plans: phase is hidden in the UI, so type is invisible. Leave at "base".',
    '',
    'WEEKS section',
    '   phase_idx          Which phase this week belongs to.',
    '   week_idx           Week number INSIDE the phase. Starts at 0. Restarts at 0 in each new phase.',
    '   week_start         Optional ISO date (YYYY-MM-DD) anchored to a Monday. Leave blank for student-anchored.',
    '   focus              Free text. What is this week about? Required.',
    '   intensity          recovery | low | medium | high | max. Required.',
    '   target_sessions    Number of sessions you plan for this week. Used for adherence tracking.',
    '   notes              Free text. Coach-to-student week-level notes. Optional.',
    '',
    'SESSIONS section',
    '   phase_idx          Which phase this session belongs to.',
    '   week_idx           Which week (within the phase) this session belongs to.',
    '   session_idx        Position of this session within its week. Starts with 0.',
    '   session_id         Optional. Leave blank app auto-generates a stable ID.',
    '   day_of_week        0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun. Required.',
    '   label              Display name for the session ("Aerobic distance"). Required.',
    '   mode               depth | pool | dry | general. Drives which session_type values are valid.',
    '   session_type       Session subtype. Values depend on mode (see VALID VALUES above).',
    '',
    'EXERCISES section',
    '   phase_idx          Which phase this exercise belongs to.',
    '   week_idx           Which week (within the phase) this exercise belongs to.',
    '   session_idx        Which session (within the week) this exercise belongs to.',
    '   exercise_idx       Position of this exercise within its session. Starts with 0.',
    '   exercise_id        Optional. Leave blank app auto-generates a stable ID.',
    '   description        Free text. Be specific. The student sees this in the session detail. Required.',
  ];
  for (const text of glossaryRows) {
    const r = ws.addRow([text]);
    if (text) applyMutedStyle(r.getCell(1));
  }

  return wb;
}

// ── Run ───────────────────────────────────────────────────────────────

const trainingWb = buildWorkbook('training');
const seasonWb   = buildWorkbook('season');

const trainingPath = path.join(OUT_DIR, 'e08_training_plan_template.xlsx');
const seasonPath   = path.join(OUT_DIR, 'e08_season_plan_template.xlsx');

await trainingWb.xlsx.writeFile(trainingPath);
await seasonWb.xlsx.writeFile(seasonPath);

console.log(`Built ${trainingPath}`);
console.log(`Built ${seasonPath}`);
