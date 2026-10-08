// Pure, presentation-only helpers shared across the app. The actual
// scheduling algorithm lives in the Python backend (backend/logic.py) —
// nothing in this file decides *what* goes on the timetable, only how to
// label/format things and how to seed the sample/blank config.

let uidCounter = 1;
const uid = (prefix) => `${prefix}${uidCounter++}`;

const DEFAULT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function addMinutesToTime(time, minutes) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const ROTATION_COLORS = ["#0071e3", "#1e8e3e", "#b25000", "#8e44ad", "#c2185b", "#00838f"];
function subBatchLabel(index) {
  return `S${index + 1}`; // 0 -> S1, 1 -> S2, ...
}
function subBatchColor(index) {
  return ROTATION_COLORS[index % ROTATION_COLORS.length];
}

// ---------------------------------------------------------------------
// Sample / blank starting data
// ---------------------------------------------------------------------
function buildSampleConfig() {
  // Real SE-IT dataset (Information Technology, Term I, AY 2026-27), taken from the
  // department's Teaching Allocation sheet and the SE-IT class timetable.
  const T = {}; // teacher id by abbreviation
  ["RSS", "NSJ", "TTT", "PGP", "PAD", "JDM", "PYT", "BPB", "PPP", "SAP"].forEach((k) => (T[k] = uid("t")));
  const batchId = uid("b");

  const ts = (name, abbr, weeklyHours, isLab = false) => ({ id: uid("ts"), name, abbr, weeklyHours, isLab, labBlockSize: 2 });

  const teachers = [
    { id: T.RSS, name: "Ms. Rupali S. Shishupal", abbr: "RSS", email: "", maxWeeklyHours: 18, unavailable: [], subjects: [ts("Discrete Mathematics", "DM", 4)] },
    { id: T.NSJ, name: "Dr. Nalini S. Jagtap", abbr: "NSJ", email: "", maxWeeklyHours: 18, unavailable: [], subjects: [ts("Object Oriented Programming", "OOP", 3), ts("Community Engagement Project", "CEP", 2, true)] },
    { id: T.TTT, name: "Mrs. Trupti T. Tekale", abbr: "TTT", email: "", maxWeeklyHours: 18, unavailable: [], subjects: [ts("Digital Electronics & Computer Organization", "DE&CO", 3), ts("Digital Electronics & Computer Organization Lab", "DE&COL", 2, true), ts("Community Engagement Project", "CEP", 2, true)] },
    { id: T.PGP, name: "Dr. Pallavi G. Patil", abbr: "PGP", email: "", maxWeeklyHours: 18, unavailable: [], subjects: [ts("Data Structures and Algorithms", "DSA", 4), ts("Data Structures and Algorithms Lab", "DSAL", 2, true)] },
    { id: T.PAD, name: "Mrs. Priyanka A. Deshmukh", abbr: "PAD", email: "", maxWeeklyHours: 18, unavailable: [], subjects: [ts("Open Elective I (Financial Literacy & Digital Finance)", "OE-I", 2), ts("Object Oriented Programming Lab", "OOPL", 2, true)] },
    { id: T.JDM, name: "Mrs. Jayashree D. Muley", abbr: "JDM", email: "", maxWeeklyHours: 18, unavailable: [], subjects: [ts("Engineering Economics", "EE", 2)] },
    { id: T.PYT, name: "Ms. Priyanka Y. Takale", abbr: "PYT", email: "", maxWeeklyHours: 18, unavailable: [], subjects: [ts("Environmental Science Studies", "ESS", 2)] },
    { id: T.BPB, name: "Mrs. Bhavana B. Bhadane", abbr: "BPB", email: "", maxWeeklyHours: 18, unavailable: [], subjects: [ts("Data Structures and Algorithms Lab", "DSAL", 2, true)] },
    { id: T.PPP, name: "Dr. Priyanka P. Patil", abbr: "PPP", email: "", maxWeeklyHours: 18, unavailable: [], subjects: [ts("Community Engagement Project", "CEP", 2, true)] },
    { id: T.SAP, name: "Mrs. Shilpa A. Pandey", abbr: "SAP", email: "", maxWeeklyHours: 18, unavailable: [], subjects: [ts("Community Engagement Project", "CEP", 2, true)] },
  ];

  const lecture = (name, abbr, hours, teacher) => ({ id: uid("s"), name, abbr, periodsPerWeek: hours, isLab: false, teacherId: T[teacher] });
  const lab = (name, abbr, hours, teacher, subBatchIndex) => ({ id: uid("s"), name, abbr, periodsPerWeek: hours, isLab: true, labBlockSize: 2, teacherId: T[teacher], subBatchIndex });
  const DSAL = "Data Structures and Algorithms Lab", CEP = "Community Engagement Project";
  const OOPL = "Object Oriented Programming Lab", DECOL = "Digital Electronics & Computer Organization Lab";

  const subjects = [
    lecture("Discrete Mathematics", "DM", 4, "RSS"),
    lecture("Object Oriented Programming", "OOP", 3, "NSJ"),
    lecture("Data Structures and Algorithms", "DSA", 4, "PGP"),
    lecture("Digital Electronics & Computer Organization", "DE&CO", 3, "TTT"),
    lecture("Open Elective I (Financial Literacy & Digital Finance)", "OE-I", 2, "PAD"),
    lecture("Engineering Economics", "EE", 2, "JDM"),
    lecture("Environmental Science Studies", "ESS", 2, "PYT"),
    // each sub-batch (S1-S4 = index 0-3) has its own labs, teachers and hours
    ...[0, 1, 2, 3].map((i) => lab(OOPL, "OOPL", 2, "PAD", i)),
    ...[0, 1, 2, 3].map((i) => lab(DECOL, "DE&COL", 2, "TTT", i)),
    lab(DSAL, "DSAL", 2, "BPB", 0), lab(DSAL, "DSAL", 2, "PGP", 0),
    lab(DSAL, "DSAL", 4, "PGP", 1),
    lab(DSAL, "DSAL", 4, "PGP", 2),
    lab(DSAL, "DSAL", 4, "BPB", 3),
    lab(CEP, "CEP", 2, "PPP", 0), lab(CEP, "CEP", 2, "TTT", 0),
    lab(CEP, "CEP", 2, "TTT", 1), lab(CEP, "CEP", 2, "NSJ", 1),
    lab(CEP, "CEP", 4, "SAP", 2),
    lab(CEP, "CEP", 2, "PPP", 3), lab(CEP, "CEP", 2, "TTT", 3),
  ];

  return {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    periodsPerDay: 8,
    periodDuration: 50,
    dayStartTime: "09:40",
    labBlockSize: 2,
    dayOverrides: { Fri: 4 },
    noFreePeriods: true,
    labsAfterLunch: true,
    breaks: [{ id: uid("br"), afterPeriod: 4, duration: 40, label: "Lunch Break" }],
    teachers,
    batches: [{ id: batchId, name: "SE-IT (Div A)", subBatches: 4, subjects }],
  };
}

function emptyConfig() {
  return {
    days: [...DEFAULT_DAYS],
    periodsPerDay: 7,
    periodDuration: 50,
    dayStartTime: "09:00",
    labBlockSize: 2,
    dayOverrides: {},
    noFreePeriods: false,
    labsAfterLunch: false,
    breaks: [{ id: uid("br"), afterPeriod: 4, duration: 40, label: "Lunch Break" }],
    teachers: [],
    batches: [],
  };
}

// ---------------------------------------------------------------------
// Day-length + time-label helpers
// ---------------------------------------------------------------------
// Pure UI helper — the actual scheduling logic lives in the Python backend
// (backend/logic.py); this just answers "how many periods does this
// particular day have", which the UI needs constantly for rendering.
function getPeriodsForDay(config, day) {
  const override = config.dayOverrides && config.dayOverrides[day];
  return override && override > 0 ? override : config.periodsPerDay;
}

function timeLabelForPeriod(config, period) {
  let minutesIn = 0;
  for (let p = 1; p < period; p++) {
    minutesIn += config.periodDuration;
    const br = config.breaks.find((b) => b.afterPeriod === p);
    if (br) minutesIn += br.duration;
  }
  const start = addMinutesToTime(config.dayStartTime, minutesIn);
  const end = addMinutesToTime(config.dayStartTime, minutesIn + config.periodDuration);
  return `${start}–${end}`;
}

export {
  uid,
  DEFAULT_DAYS,
  addMinutesToTime,
  subBatchLabel,
  subBatchColor,
  buildSampleConfig,
  emptyConfig,
  getPeriodsForDay,
  timeLabelForPeriod,
};
