/* ═══════════════════════════════════════════════════════════════
   THE SALE POINT — main.js  v3
   ✔ Multiple independent tabs — one per table, unlimited takeaway
   ✔ Settings page: currency, service charge, tax, restaurant info
   ✔ Units of measure with variable (kg/L) vs fixed (piece/plate)
   ✔ Qty↔Price mutual adjustment for variable-unit items
   ✔ Date filters on history (Today / Week / Month / Range)
   ✔ SweetAlert2 everywhere — no native confirm/alert
   ✔ KOT system with pending tracking
   ✔ 3 themes: Dark · Light · Rose
═══════════════════════════════════════════════════════════════ */

/* ── Storage ── */
const LS = {
  get: (k) => {
    try {
      return JSON.parse(localStorage.getItem("sp_" + k));
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem("sp_" + k, JSON.stringify(v));
    } catch {}
  },
};

/* ── Users ── */
const USERS = [
  { username: "admin", password: "admin123", display: "Admin", role: "Admin" },
  {
    username: "cashier",
    password: "cash123",
    display: "Cashier",
    role: "Cashier",
  },
  {
    username: "waiter",
    password: "wait123",
    display: "Waiter",
    role: "Waiter",
  },
];
let CURRENT_USER = null;

/* ── DB State ── */
let DB = {
  cats: [],
  items: [],
  staff: [],
  tables: [],
  orders: [],
  tabs: [],
  units: [],
};

/* ── MULTI-TAB SYSTEM ──
   TAB_ID = currently viewed tab id.
   Each table can have AT MOST ONE tab (enforced on table select).
   Takeaway orders can have unlimited tabs (no table assigned).
   Tabs are fully independent — each has its own CART stored inside the tab object.
   We NEVER use a global CART array. Always read/write from the active tab.
──────────────────────────────────────────── */
let TAB_ID = null; // ID of the currently displayed tab
let ACTIVE_CAT = "all";
let PAY = "Cash";
let ORDER_NUM = 1;
let KOT_NUM = 1;

/* KOT pending: set of cart-item IDs not yet KOT-printed in the CURRENT tab view */
let KOT_PENDING = new Set();

/* Unit adjustment state */
let UA_CART_ID = null; // cart item id being adjusted
let UA_BASE_PRICE = 0; // price per unit from item definition

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ── Temp image refs ── */
let _itemImg = null;
let _catImg = null;

/* ── Constants ── */
const TAG_CLASS = {
  amber: "b-amber",
  green: "b-green",
  blue: "b-blue",
  red: "b-red",
  purple: "b-purple",
  gray: "b-gray",
};
const TAG_COLOR = {
  amber: "#F59E0B",
  green: "#10B981",
  blue: "#3B82F6",
  red: "#EF4444",
  purple: "#8B5CF6",
  gray: "#9BA5C0",
};

const SVGS = {
  Starters: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="14" r="7" stroke="#94A3B8" stroke-width="1.4"/><path d="M9 32c0-6 5-10 11-10s11 4 11 10" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  Mains: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="22" r="12" stroke="#94A3B8" stroke-width="1.4"/><path d="M8 22h24M20 10v4" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  Grill: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="8" y="18" width="24" height="12" rx="3" stroke="#94A3B8" stroke-width="1.4"/><path d="M8 18h24M12 30v5M28 30v5" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  Pasta: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M10 26c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/><path d="M6 26h28" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  Desserts: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 6c-5.5 0-10 4.5-10 10 0 4.6 3 8.5 7.2 9.7L15 32h10l-2.2-6.3C26.9 24.5 30 20.6 30 16c0-5.5-4.5-10-10-10z" stroke="#94A3B8" stroke-width="1.4"/></svg>`,
  Beverages: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M14 10l3.5 20h5l3.5-20H14z" stroke="#94A3B8" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 10h16" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  default: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="13" stroke="#94A3B8" stroke-width="1.4" stroke-dasharray="3 3"/></svg>`,
};
const getSVG = (n) => SVGS[n] || SVGS.default;

/* ── Settings ── */
let CFG = {
  currency: "RS",
  currencyName: "Pakistani Rupee",
  serviceCharge: 0,
  tax: 0,
  discType: "flat",
  restName: "The Sale Point",
  restAddress: "",
  restPhone: "",
  footer: "Thank you for dining with us!",
  defPay: "Cash",
  autoKot: "no",
  rcptFooter: "Please visit again!",
};

/* ═══════════════════════════════════
   SEED DATA
═══════════════════════════════════ */
function seedUnits() {
  return [
    { id: uid(), name: "Piece", abbr: "pcs", type: "fixed" },
    { id: uid(), name: "Plate", abbr: "plt", type: "fixed" },
    { id: uid(), name: "Bowl", abbr: "bwl", type: "fixed" },
    { id: uid(), name: "Glass", abbr: "gls", type: "fixed" },
    { id: uid(), name: "Cup", abbr: "cup", type: "fixed" },
    { id: uid(), name: "kg", abbr: "kg", type: "variable" },
    { id: uid(), name: "gram", abbr: "g", type: "variable" },
    { id: uid(), name: "Litre", abbr: "L", type: "variable" },
    { id: uid(), name: "ml", abbr: "ml", type: "variable" },
    { id: uid(), name: "Portion", abbr: "por", type: "fixed" },
  ];
}
function seedCats() {
  return [
    { id: uid(), name: "Starters", tag: "green", img: null },
    { id: uid(), name: "Mains", tag: "amber", img: null },
    { id: uid(), name: "Grill", tag: "red", img: null },
    { id: uid(), name: "Pasta", tag: "purple", img: null },
    { id: uid(), name: "Desserts", tag: "blue", img: null },
    { id: uid(), name: "Beverages", tag: "gray", img: null },
  ];
}
function seedItems(cats, units) {
  const gc = (n) => (cats.find((c) => c.name === n) || cats[0]).id;
  const gu = (n) =>
    (units.find((u) => u.name === n || u.abbr === n) || units[0]).id;
  return [
    {
      id: uid(),
      name: "Burrata Caprese",
      catId: gc("Starters"),
      unitId: gu("Plate"),
      price: 650,
      status: "on",
      desc: "Heirloom tomato, aged balsamic",
      img: null,
    },
    {
      id: uid(),
      name: "Scallop Ceviche",
      catId: gc("Starters"),
      unitId: gu("Plate"),
      price: 850,
      status: "on",
      desc: "Lime & coconut leche de tigre",
      img: null,
    },
    {
      id: uid(),
      name: "Chicken Karahi",
      catId: gc("Mains"),
      unitId: gu("kg"),
      price: 1200,
      status: "on",
      desc: "Slow-cooked, desi spices",
      img: null,
    },
    {
      id: uid(),
      name: "Mutton Nihari",
      catId: gc("Mains"),
      unitId: gu("kg"),
      price: 1400,
      status: "on",
      desc: "Slow cooked overnight",
      img: null,
    },
    {
      id: uid(),
      name: "Prawn Biryani",
      catId: gc("Mains"),
      unitId: gu("Plate"),
      price: 1600,
      status: "on",
      desc: "Jumbo prawns, saffron rice",
      img: null,
    },
    {
      id: uid(),
      name: "Seekh Kabab",
      catId: gc("Grill"),
      unitId: gu("Piece"),
      price: 350,
      status: "on",
      desc: "Minced beef, charcoal grilled",
      img: null,
    },
    {
      id: uid(),
      name: "Beef Boti",
      catId: gc("Grill"),
      unitId: gu("kg"),
      price: 1100,
      status: "on",
      desc: "Marinated tender beef cubes",
      img: null,
    },
    {
      id: uid(),
      name: "Mix Grill Platter",
      catId: gc("Grill"),
      unitId: gu("Plate"),
      price: 2200,
      status: "on",
      desc: "4-skewer platter with raita",
      img: null,
    },
    {
      id: uid(),
      name: "Peshwari Pasta",
      catId: gc("Pasta"),
      unitId: gu("Plate"),
      price: 850,
      status: "on",
      desc: "Cream sauce, desi twist",
      img: null,
    },
    {
      id: uid(),
      name: "Gulab Jamun",
      catId: gc("Desserts"),
      unitId: gu("Piece"),
      price: 120,
      status: "on",
      desc: "Warm syrup, rose cardamom",
      img: null,
    },
    {
      id: uid(),
      name: "Chocolate Fondant",
      catId: gc("Desserts"),
      unitId: gu("Plate"),
      price: 550,
      status: "on",
      desc: "Valrhona 70%, salted caramel",
      img: null,
    },
    {
      id: uid(),
      name: "Doodh Patti",
      catId: gc("Beverages"),
      unitId: gu("Cup"),
      price: 120,
      status: "on",
      desc: "Strong Pakistani chai",
      img: null,
    },
    {
      id: uid(),
      name: "Fresh Lemonade",
      catId: gc("Beverages"),
      unitId: gu("Glass"),
      price: 220,
      status: "on",
      desc: "Mint, lemon, chilled soda",
      img: null,
    },
    {
      id: uid(),
      name: "Rooh Afza Shake",
      catId: gc("Beverages"),
      unitId: gu("Glass"),
      price: 280,
      status: "on",
      desc: "Chilled, creamy",
      img: null,
    },
    {
      id: uid(),
      name: "Mutton Seekh (250g)",
      catId: gc("Grill"),
      unitId: gu("gram"),
      price: 3,
      status: "on",
      desc: "Price per gram",
      img: null,
    },
  ];
}
function seedStaff() {
  return [
    {
      id: uid(),
      name: "Ahmed Ali",
      role: "Head Waiter",
      phone: "+92 300 1001",
      status: "on",
    },
    {
      id: uid(),
      name: "Sara Khan",
      role: "Cashier",
      phone: "+92 300 1002",
      status: "on",
    },
    {
      id: uid(),
      name: "Bilal Raza",
      role: "Server",
      phone: "+92 300 1003",
      status: "on",
    },
    {
      id: uid(),
      name: "Fatima Noor",
      role: "Manager",
      phone: "+92 300 1004",
      status: "on",
    },
  ];
}
function seedTables() {
  return [
    { id: uid(), name: "Table 1", seats: 2, status: "avail" },
    { id: uid(), name: "Table 2", seats: 4, status: "avail" },
    { id: uid(), name: "Table 3", seats: 4, status: "avail" },
    { id: uid(), name: "Table 4", seats: 6, status: "avail" },
    { id: uid(), name: "Table 5", seats: 2, status: "avail" },
    { id: uid(), name: "Table 6", seats: 8, status: "avail" },
    { id: uid(), name: "Bar 1", seats: 2, status: "avail" },
    { id: uid(), name: "Bar 2", seats: 2, status: "avail" },
    { id: uid(), name: "VIP Room", seats: 12, status: "clean" },
  ];
}

/* ═══════════════════════════════════
   LOAD / SAVE DB
═══════════════════════════════════ */
function loadDB() {
  DB.units = LS.get("units") || null;
  DB.cats = LS.get("cats") || null;
  DB.items = LS.get("items") || null;
  DB.staff = LS.get("staff") || null;
  DB.tables = LS.get("tables") || null;
  DB.orders = LS.get("orders") || [];
  DB.tabs = LS.get("tabs") || [];
  if (!DB.units) {
    DB.units = seedUnits();
    LS.set("units", DB.units);
  }
  if (!DB.cats) {
    DB.cats = seedCats();
    LS.set("cats", DB.cats);
  }
  if (!DB.items) {
    DB.items = seedItems(DB.cats, DB.units);
    LS.set("items", DB.items);
  }
  if (!DB.staff) {
    DB.staff = seedStaff();
    LS.set("staff", DB.staff);
  }
  if (!DB.tables) {
    DB.tables = seedTables();
    LS.set("tables", DB.tables);
  }
  DB.shifts = LS.get("shifts") || [];
  ORDER_NUM = DB.orders.length
    ? Math.max(...DB.orders.map((o) => o.num || 1)) + 1
    : 1;
  KOT_NUM = LS.get("kot_num") || 1;

  const saved = LS.get("cfg");
  if (saved) Object.assign(CFG, saved);
}
const save = (k) => LS.set(k, DB[k]);
const saveCFG = () => LS.set("cfg", CFG);
const cur = () => CFG.currency || "RS";

/* ═══════════════════════════════════
   LOGIN / LOGOUT
═══════════════════════════════════ */
function togglePw() {
  const i = document.getElementById("l-pass"),
    b = document.getElementById("pw-tog");
  i.type = i.type === "password" ? "text" : "password";
  b.textContent = i.type === "password" ? "👁" : "🙈";
}
function doLogin(e) {
  e.preventDefault();
  const user = document.getElementById("l-user").value.trim();
  const pass = document.getElementById("l-pass").value;
  let ok = true;
  ["l-user", "l-pass"].forEach((id) => {
    document.getElementById(id).classList.remove("invalid");
  });
  ["l-user-e", "l-pass-e"].forEach((id) =>
    document.getElementById(id).classList.remove("show"),
  );
  document.getElementById("login-error").style.display = "none";
  if (!user) {
    document.getElementById("l-user").classList.add("invalid");
    document.getElementById("l-user-e").classList.add("show");
    ok = false;
  }
  if (!pass) {
    document.getElementById("l-pass").classList.add("invalid");
    document.getElementById("l-pass-e").classList.add("show");
    ok = false;
  }
  if (!ok) return;
  const found = USERS.find((u) => u.username === user && u.password === pass);
  if (!found) {
    document.getElementById("login-error").style.display = "block";
    document.getElementById("l-pass").classList.add("invalid");
    return;
  }
  CURRENT_USER = found;
  LS.set("session", {
    username: found.username,
    display: found.display,
    role: found.role,
  });
  const btn = document.getElementById("login-btn");
  btn.textContent = "✓ Welcome!";
  btn.style.opacity = ".8";
  setTimeout(() => {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app-wrap").style.display = "flex";
    document.getElementById("user-pill-name").textContent = found.display;
    initApp();
  }, 450);
}
function doLogout() {
  Swal.fire({
    title: "Sign Out?",
    text: "You will be returned to the login screen.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sign Out",
    cancelButtonText: "Stay",
    reverseButtons: true,
  }).then((r) => {
    if (!r.isConfirmed) return;
    LS.set("session", null);
    CURRENT_USER = null;
    document.getElementById("app-wrap").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("l-user").value = "";
    document.getElementById("l-pass").value = "";
    document.getElementById("login-btn").textContent = "Sign In";
    document.getElementById("login-btn").style.opacity = "";
  });
}
function setLoginTheme(t, btn) {
  document
    .querySelectorAll(".ltheme-btn")
    .forEach((b) => b.classList.remove("on"));
  btn.classList.add("on");
  applyTheme(t);
}

/* ═══════════════════════════════════
   THEME
═══════════════════════════════════ */
/* Theme definitions for swatches */
const THEMES = [
  { id: "dark", name: "Dark", sidebar: "#0A0F1E", main: "#EEF0F7" },
  { id: "light", name: "Light", sidebar: "#1E293B", main: "#F1F5F9" },
  { id: "rose", name: "Rose", sidebar: "#1C0B10", main: "#FFF1F3" },
  { id: "ocean", name: "Ocean", sidebar: "#082534", main: "#EBF5FA" },
  { id: "forest", name: "Forest", sidebar: "#0A2614", main: "#EDF7EE" },
  { id: "sunset", name: "Sunset", sidebar: "#2C1006", main: "#FDF3EC" },
];

function initTheme() {
  applyTheme(LS.get("theme") || "dark");
}
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  LS.set("theme", t);
  document
    .querySelectorAll(".theme-btn")
    .forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-theme") === t),
    );
  document
    .querySelectorAll(".ltheme-btn")
    .forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-theme") === t),
    );
  document
    .querySelectorAll(".theme-swatch")
    .forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-theme") === t),
    );
}
function renderThemeSwatches() {
  const container = document.getElementById("theme-swatches");
  if (!container) return;
  const active = document.documentElement.getAttribute("data-theme") || "dark";
  container.innerHTML = THEMES.map(
    (th) => `
    <button class="theme-swatch ${th.id === active ? "on" : ""}" data-theme="${th.id}" onclick="applyTheme('${th.id}')">
      <div class="ts-preview">
        <div class="ts-sidebar" style="background:${th.sidebar}"></div>
        <div class="ts-main" style="background:${th.main}"></div>
      </div>
      <span class="ts-name">${th.name}</span>
    </button>`,
  ).join("");
  /* Also populate login theme buttons */
  const loginBtns = document.getElementById("login-theme-btns");
  if (loginBtns && !loginBtns.children.length) {
    loginBtns.innerHTML = THEMES.map(
      (th) =>
        `<button class="ltheme-btn ${th.id === active ? "on" : ""}" data-theme="${th.id}" onclick="setLoginTheme('${th.id}',this)">${th.name}</button>`,
    ).join("");
  }
}

/* ═══════════════════════════════════
   TOAST & SWAL
═══════════════════════════════════ */
function toast(msg, type = "ok") {
  const icons = { ok: "✓", err: "✗", amber: "✦", info: "ℹ" };
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.innerHTML = `<span>${icons[type] || "•"}</span>${msg}`;
  document.getElementById("toasts").appendChild(el);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.add("in")),
  );
  setTimeout(() => {
    el.classList.remove("in");
    el.classList.add("out");
    setTimeout(() => el.remove(), 350);
  }, 3200);
}
const swalConfirm = (title, text, confirmTxt = "Yes", icon = "warning") =>
  Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmTxt,
    cancelButtonText: "Cancel",
    reverseButtons: true,
  }).then((r) => r.isConfirmed);

/* ═══════════════════════════════════
   MODAL
═══════════════════════════════════ */
function openMo(id) {
  document.getElementById(id).classList.add("open");
}
function closeMo(id) {
  document.getElementById(id).classList.remove("open");
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".modal-bg").forEach((m) =>
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.remove("open");
    }),
  );
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape")
    document
      .querySelectorAll(".modal-bg.open")
      .forEach((m) => m.classList.remove("open"));
});
function clrErr(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.querySelectorAll(".fc").forEach((f) => f.classList.remove("invalid"));
  m.querySelectorAll(".ferr").forEach((e) => e.classList.remove("show"));
}
function fErr(fi, ei) {
  const f = document.getElementById(fi),
    e = document.getElementById(ei);
  if (f) f.classList.add("invalid");
  if (e) e.classList.add("show");
}

/* ═══════════════════════════════════
   NAVIGATION
═══════════════════════════════════ */
const PAGE_INFO = {
  pos: ["New Order", "Select dishes and build the order"],
  tabs: ["Open Tabs", "Each table has its own independent order"],
  tables: ["Table Map", "Manage seating and availability"],
  master: ["Manage", "Menu items, categories & staff"],
  orders: ["Order History", "All completed transactions"],
  dash: ["Dashboard", "Sales performance & analytics"],
  shift: ["Shift Report", "Track sales within a shift period"],
  settings: ["Settings", "Billing, currency, units & preferences"],
};
function nav(page) {
  const mapped = ["items", "cats", "staff"].includes(page) ? "master" : page;
  document.querySelectorAll(".pg").forEach((p) => p.classList.remove("on"));
  document
    .querySelectorAll(".nav-item")
    .forEach((b) => b.classList.remove("on"));
  const pgEl = document.getElementById("pg-" + mapped);
  if (pgEl) pgEl.classList.add("on");
  document.querySelectorAll(".nav-item").forEach((b) => {
    if ((b.getAttribute("onclick") || "").includes("'" + page + "'"))
      b.classList.add("on");
  });
  const [title, sub] = PAGE_INFO[mapped] || [page, ""];
  document.getElementById("pg-title").textContent = title;
  document.getElementById("pg-sub").textContent = sub;
  closeSb();
  if (page === "pos") refreshPOS();
  else if (page === "tabs") renderOpenTabs();
  else if (page === "tables") renderTables();
  else if (["items", "cats", "staff"].includes(page)) {
    renderMaster();
    document
      .querySelectorAll(".m-panel")
      .forEach((p) => p.classList.remove("on"));
    document
      .querySelectorAll(".m-tab")
      .forEach((b) => b.classList.remove("on"));
    document.getElementById("mp-" + page).classList.add("on");
    document
      .querySelectorAll(".m-tab")
      [["items", "cats", "staff"].indexOf(page)].classList.add("on");
  } else if (page === "orders") renderHistory();
  else if (page === "dash") renderDash();
  else if (page === "settings") renderSettings();
  else if (page === "shift") renderShiftPage();
}
function swMTab(p, btn) {
  document
    .querySelectorAll(".m-panel")
    .forEach((x) => x.classList.remove("on"));
  document.querySelectorAll(".m-tab").forEach((x) => x.classList.remove("on"));
  document.getElementById("mp-" + p).classList.add("on");
  btn.classList.add("on");
  renderMaster();
}
function openSb() {
  document.getElementById("sb").classList.add("open");
  document.getElementById("sb-ov").classList.add("open");
}
function closeSb() {
  document.getElementById("sb").classList.remove("open");
  document.getElementById("sb-ov").classList.remove("open");
}

/* ═══════════════════════════════════
   SETTINGS
═══════════════════════════════════ */
function renderSettings() {
  const g = (id) => document.getElementById(id);
  if (g("s-currency")) g("s-currency").value = CFG.currency;
  if (g("s-currency-name")) g("s-currency-name").value = CFG.currencyName;
  if (g("s-service")) g("s-service").value = CFG.serviceCharge;
  if (g("s-tax")) g("s-tax").value = CFG.tax;
  if (g("s-disc-type")) g("s-disc-type").value = CFG.discType;
  if (g("s-name")) g("s-name").value = CFG.restName;
  if (g("s-address")) g("s-address").value = CFG.restAddress;
  if (g("s-phone")) g("s-phone").value = CFG.restPhone;
  if (g("s-footer")) g("s-footer").value = CFG.footer;
  if (g("s-rcpt-footer")) g("s-rcpt-footer").value = CFG.rcptFooter;
  if (g("s-def-pay")) g("s-def-pay").value = CFG.defPay;
  if (g("s-auto-kot")) g("s-auto-kot").value = CFG.autoKot;
  renderUnitsList();
  renderThemeSwatches();
}
function saveSettings() {
  CFG.currency = document.getElementById("s-currency").value.trim() || "RS";
  CFG.currencyName = document.getElementById("s-currency-name").value.trim();
  CFG.serviceCharge =
    parseFloat(document.getElementById("s-service").value) || 0;
  CFG.tax = parseFloat(document.getElementById("s-tax").value) || 0;
  CFG.discType = document.getElementById("s-disc-type").value;
  CFG.restName =
    document.getElementById("s-name").value.trim() || "The Sale Point";
  CFG.restAddress = document.getElementById("s-address").value.trim();
  CFG.restPhone = document.getElementById("s-phone").value.trim();
  CFG.footer = document.getElementById("s-footer").value.trim();
  CFG.defPay = document.getElementById("s-def-pay").value;
  CFG.autoKot = document.getElementById("s-auto-kot").value;
  CFG.rcptFooter = document.getElementById("s-rcpt-footer").value.trim();
  saveCFG();
  toast("Settings saved", "ok");
}

/* ═══════════════════════════════════
   UNITS MANAGEMENT
═══════════════════════════════════ */
function renderUnitsList() {
  const el = document.getElementById("units-list");
  if (!DB.units.length) {
    el.innerHTML =
      '<div style="color:var(--soft);font-size:.8rem;font-style:italic">No units defined</div>';
    return;
  }
  el.innerHTML = DB.units
    .map(
      (u) => `
    <div class="unit-row">
      <span class="unit-row-name">${u.name}</span>
      <span class="unit-row-abbr">${u.abbr}</span>
      <span class="unit-row-type"><span class="badge ${u.type === "variable" ? "b-green" : "b-gray"}">${u.type === "variable" ? "Weight/Vol" : "Fixed"}</span></span>
      <button class="btn btn-sm btn-ghost" onclick="openUnitModal('${u.id}')">Edit</button>
      <button class="btn btn-sm btn-red" onclick="delUnit('${u.id}')">✕</button>
    </div>`,
    )
    .join("");
}
function addUnit() {
  openUnitModal(null);
}
function openUnitModal(id = null) {
  clrErr("mo-unit");
  document.getElementById("mo-unit-title").textContent = id
    ? "Edit Unit"
    : "Add Unit";
  const u = id ? DB.units.find((x) => x.id === id) || {} : {};
  document.getElementById("fu-id").value = u.id || "";
  document.getElementById("fu-name").value = u.name || "";
  document.getElementById("fu-abbr").value = u.abbr || "";
  document.getElementById("fu-type").value = u.type || "fixed";
  openMo("mo-unit");
}
function saveUnit() {
  clrErr("mo-unit");
  const id = document.getElementById("fu-id").value;
  const name = document.getElementById("fu-name").value.trim();
  const abbr =
    document.getElementById("fu-abbr").value.trim() || name.slice(0, 4);
  const type = document.getElementById("fu-type").value;
  if (!name) {
    fErr("fu-name", "fu-name-e");
    return;
  }
  if (id) {
    const i = DB.units.findIndex((x) => x.id === id);
    if (i > -1) DB.units[i] = { id, name, abbr, type };
    toast("Unit updated", "amber");
  } else {
    DB.units.push({ id: uid(), name, abbr, type });
    toast("Unit added");
  }
  save("units");
  renderUnitsList();
  fillUnitSel();
  closeMo("mo-unit");
}
async function delUnit(id) {
  const inUse = DB.items.some((i) => i.unitId === id);
  if (inUse) {
    Swal.fire({
      title: "Unit In Use",
      text: "Remove this unit from all menu items first.",
      icon: "warning",
    });
    return;
  }
  const ok = await swalConfirm("Delete Unit?", "", "Delete");
  if (!ok) return;
  DB.units = DB.units.filter((x) => x.id !== id);
  save("units");
  renderUnitsList();
  fillUnitSel();
  toast("Removed", "info");
}
function fillUnitSel() {
  const sel = document.getElementById("fi-unit"),
    cur = sel.value;
  sel.innerHTML =
    '<option value="">Select unit…</option>' +
    DB.units
      .map(
        (u) =>
          `<option value="${u.id}" ${u.id === cur ? "selected" : ""}>${u.name} (${u.abbr})</option>`,
      )
      .join("");
}
function getUnit(unitId) {
  return DB.units.find((u) => u.id === unitId) || null;
}

/* DATA EXPORT / IMPORT */
function exportData() {
  const blob = new Blob([JSON.stringify({ DB, CFG }, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download =
    "salepoint_backup_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  toast("Data exported", "ok");
}
function importDataClick() {
  document.getElementById("import-file").click();
}
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.DB) Object.assign(DB, data.DB);
      if (data.CFG) {
        Object.assign(CFG, data.CFG);
        saveCFG();
      }
      Object.keys(DB).forEach((k) => save(k));
      toast("Data imported successfully", "ok");
      setTimeout(() => location.reload(), 800);
    } catch {
      Swal.fire({
        title: "Import Failed",
        text: "Invalid JSON file.",
        icon: "error",
      });
    }
  };
  reader.readAsText(file);
}
async function resetAllData() {
  const ok = await swalConfirm(
    "Reset ALL Data?",
    "This will permanently delete all orders, tabs, and settings. This cannot be undone.",
    "Reset Everything",
    "error",
  );
  if (!ok) return;
  [
    "units",
    "cats",
    "items",
    "staff",
    "tables",
    "orders",
    "tabs",
    "cfg",
    "kot_num",
    "session",
    "theme",
  ].forEach((k) => localStorage.removeItem("sp_" + k));
  toast("Reset complete — reloading…", "info");
  setTimeout(() => location.reload(), 800);
}

/* ═══════════════════════════════════
   IMAGE WIDGET
═══════════════════════════════════ */
function buildImgWidget(containerId, src, cbName) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  if (src) {
    wrap.innerHTML = `<div class="img-preview-box"><img src="${src}" alt="Preview"/><button class="img-rm-btn" type="button" onclick="rmImg('${containerId}','${cbName}')">✕</button></div>`;
  } else {
    wrap.innerHTML = `<label class="img-zone"><div class="img-zone-ico">🖼</div><div class="img-zone-lbl">Click to upload photo</div><input type="file" accept="image/*" onchange="loadImg(this,'${containerId}','${cbName}')"/></label>`;
  }
}
function loadImg(input, containerId, cbName) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast("Please select an image file", "err");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const src = e.target.result;
    buildImgWidget(containerId, src, cbName);
    if (cbName === "setItemImg") _itemImg = src;
    else if (cbName === "setCatImg") _catImg = src;
  };
  reader.onerror = () => toast("Could not read file", "err");
  reader.readAsDataURL(file);
}
function rmImg(containerId, cbName) {
  buildImgWidget(containerId, null, cbName);
  if (cbName === "setItemImg") _itemImg = null;
  else if (cbName === "setCatImg") _catImg = null;
}

/* ═══════════════════════════════════
   CATEGORIES CRUD
═══════════════════════════════════ */
function openCatModal(id = null) {
  clrErr("mo-cat");
  _catImg = null;
  document.getElementById("mo-cat-title").textContent = id
    ? "Edit Category"
    : "Add Category";
  const c = id ? DB.cats.find((x) => x.id === id) || {} : {};
  document.getElementById("fc-id").value = c.id || "";
  document.getElementById("fc-name").value = c.name || "";
  document.getElementById("fc-tag").value = c.tag || "amber";
  _catImg = c.img || null;
  buildImgWidget("cat-img-wrap", _catImg, "setCatImg");
  openMo("mo-cat");
}
function saveCat() {
  clrErr("mo-cat");
  const id = document.getElementById("fc-id").value,
    name = document.getElementById("fc-name").value.trim(),
    tag = document.getElementById("fc-tag").value;
  if (!name) {
    fErr("fc-name", "fc-name-e");
    return;
  }
  const img = _catImg;
  if (id) {
    const i = DB.cats.findIndex((x) => x.id === id);
    if (i > -1) DB.cats[i] = { ...DB.cats[i], name, tag, img };
    toast("Category updated", "amber");
  } else {
    DB.cats.push({ id: uid(), name, tag, img });
    toast("Category added");
  }
  save("cats");
  renderCatsTable();
  buildCatBar();
  fillCatSel();
  closeMo("mo-cat");
}
async function delCat(id) {
  const ok = await swalConfirm(
    "Delete Category?",
    "Items in this category will lose their category.",
    "Delete",
  );
  if (!ok) return;
  DB.cats = DB.cats.filter((x) => x.id !== id);
  save("cats");
  renderCatsTable();
  buildCatBar();
  toast("Removed", "info");
}
function renderCatsTable() {
  const tb = document.getElementById("cats-tb");
  if (!DB.cats.length) {
    tb.innerHTML =
      '<tr class="dt-empty"><td colspan="5">No categories yet</td></tr>';
    return;
  }
  tb.innerHTML = DB.cats
    .map((c) => {
      const cnt = DB.items.filter((i) => i.catId === c.id).length;
      const img = c.img
        ? `<div style="width:36px;height:36px;border-radius:7px;overflow:hidden;border:1px solid var(--border)"><img src="${c.img}" style="width:100%;height:100%;object-fit:cover"/></div>`
        : `<div style="width:36px;height:36px;border-radius:7px;background:var(--mist);border:1px solid var(--border);display:flex;align-items:center;justify-content:center">${getSVG(c.name).replace('width="40" height="40"', 'width="20" height="20"')}</div>`;
      return `<tr><td>${img}</td><td><strong style="font-family:var(--ff-display)">${c.name}</strong></td><td><span class="badge ${TAG_CLASS[c.tag] || "b-gray"}">${c.tag}</span></td><td><span class="badge b-amber">${cnt}</span></td><td><div class="dt-acts"><button class="btn btn-sm btn-ghost" onclick="openCatModal('${c.id}')">Edit</button><button class="btn btn-sm btn-red" onclick="delCat('${c.id}')">✕</button></div></td></tr>`;
    })
    .join("");
}

/* ═══════════════════════════════════
   ITEMS CRUD
═══════════════════════════════════ */
function fillCatSel() {
  const sel = document.getElementById("fi-cat"),
    cur = sel.value;
  sel.innerHTML =
    '<option value="">Select category…</option>' +
    DB.cats
      .map(
        (c) =>
          `<option value="${c.id}" ${c.id === cur ? "selected" : ""}>${c.name}</option>`,
      )
      .join("");
}
function openItemModal(id = null) {
  clrErr("mo-item");
  _itemImg = null;
  fillCatSel();
  fillUnitSel();
  document.getElementById("mo-item-title").textContent = id
    ? "Edit Dish"
    : "Add Dish";
  const it = id ? DB.items.find((x) => x.id === id) || {} : {};
  document.getElementById("fi-id").value = it.id || "";
  document.getElementById("fi-name").value = it.name || "";
  document.getElementById("fi-cat").value = it.catId || "";
  document.getElementById("fi-unit").value = it.unitId || "";
  document.getElementById("fi-price").value = it.price || "";
  document.getElementById("fi-desc").value = it.desc || "";
  document.getElementById("fi-status").value = it.status || "on";
  _itemImg = it.img || null;
  buildImgWidget("item-img-wrap", _itemImg, "setItemImg");
  updatePriceLabel();
  openMo("mo-item");
}
function updatePriceLabel() {
  const unitId = document.getElementById("fi-unit").value;
  const unit = getUnit(unitId);
  const lbl = document.getElementById("fi-price-label");
  if (unit) lbl.textContent = `Price per ${unit.name} (${cur()}) *`;
  else lbl.textContent = `Price (${cur()}) *`;
}
document.addEventListener("DOMContentLoaded", () => {
  const us = document.getElementById("fi-unit");
  if (us) us.addEventListener("change", updatePriceLabel);
});
function saveItem() {
  clrErr("mo-item");
  const id = document.getElementById("fi-id").value,
    name = document.getElementById("fi-name").value.trim();
  const catId = document.getElementById("fi-cat").value,
    unitId = document.getElementById("fi-unit").value;
  const price = parseFloat(document.getElementById("fi-price").value);
  const desc = document.getElementById("fi-desc").value.trim(),
    status = document.getElementById("fi-status").value,
    img = _itemImg;
  let ok = true;
  if (!name) {
    fErr("fi-name", "fi-name-e");
    ok = false;
  }
  if (!catId) {
    fErr("fi-cat", "fi-cat-e");
    ok = false;
  }
  if (!unitId) {
    fErr("fi-unit", "fi-unit-e");
    ok = false;
  }
  if (isNaN(price) || price < 0) {
    fErr("fi-price", "fi-price-e");
    ok = false;
  }
  if (!ok) return;
  if (id) {
    const i = DB.items.findIndex((x) => x.id === id);
    if (i > -1)
      DB.items[i] = { id, name, catId, unitId, price, desc, status, img };
    toast("Dish updated", "amber");
  } else {
    DB.items.push({ id: uid(), name, catId, unitId, price, desc, status, img });
    toast("Dish added");
  }
  save("items");
  renderItemsTable();
  renderMenu();
  closeMo("mo-item");
}
async function delItem(id) {
  const ok = await swalConfirm(
    "Remove Dish?",
    "This cannot be undone.",
    "Remove",
  );
  if (!ok) return;
  DB.items = DB.items.filter((x) => x.id !== id);
  save("items");
  renderItemsTable();
  renderMenu();
  toast("Removed", "info");
}
function renderItemsTable() {
  const tb = document.getElementById("items-tb"),
    q = (document.getElementById("q-items") || {}).value || "";
  const list = DB.items.filter((i) =>
    i.name.toLowerCase().includes(q.toLowerCase()),
  );
  if (!list.length) {
    tb.innerHTML =
      '<tr class="dt-empty"><td colspan="7">No items found</td></tr>';
    return;
  }
  tb.innerHTML = list
    .map((it) => {
      const cat = DB.cats.find((c) => c.id === it.catId) || {
        name: "—",
        tag: "gray",
      };
      const unit = getUnit(it.unitId) || { name: "—", abbr: "" };
      const img = it.img
        ? `<div style="width:42px;height:42px;border-radius:8px;overflow:hidden;border:1px solid var(--border)"><img src="${it.img}" style="width:100%;height:100%;object-fit:cover"/></div>`
        : `<div style="width:42px;height:42px;border-radius:8px;background:var(--mist);border:1px solid var(--border);display:flex;align-items:center;justify-content:center">${getSVG(cat.name).replace('width="40" height="40"', 'width="20" height="20"')}</div>`;
      return `<tr><td>${img}</td><td><div style="font-family:var(--ff-display);font-size:.9rem">${it.name}</div><div style="font-size:.65rem;color:var(--soft)">${it.desc || ""}</div></td><td><span class="badge ${TAG_CLASS[cat.tag] || "b-gray"}">${cat.name}</span></td><td><span class="badge ${unit.type === "variable" ? "b-green" : "b-gray"}">${unit.name}</span></td><td style="font-family:var(--ff-display);color:var(--amber3)">${cur()} ${Number(it.price).toFixed(0)}/${unit.abbr}</td><td><span class="badge ${it.status === "on" ? "b-green" : "b-red"}">${it.status === "on" ? "Available" : "86'd"}</span></td><td><div class="dt-acts"><button class="btn btn-sm btn-ghost" onclick="openItemModal('${it.id}')">Edit</button><button class="btn btn-sm btn-red" onclick="delItem('${it.id}')">✕</button></div></td></tr>`;
    })
    .join("");
}

/* ═══════════════════════════════════
   STAFF CRUD
═══════════════════════════════════ */
function openStaffModal(id = null) {
  clrErr("mo-staff");
  document.getElementById("mo-staff-title").textContent = id
    ? "Edit Staff"
    : "Add Staff";
  const s = id ? DB.staff.find((x) => x.id === id) || {} : {};
  document.getElementById("fs-id").value = s.id || "";
  document.getElementById("fs-name").value = s.name || "";
  document.getElementById("fs-role").value = s.role || "";
  document.getElementById("fs-phone").value = s.phone || "";
  document.getElementById("fs-status").value = s.status || "on";
  openMo("mo-staff");
}
function saveStaff() {
  clrErr("mo-staff");
  const id = document.getElementById("fs-id").value,
    name = document.getElementById("fs-name").value.trim();
  const role = document.getElementById("fs-role").value.trim(),
    phone = document.getElementById("fs-phone").value.trim(),
    status = document.getElementById("fs-status").value;
  if (!name) {
    fErr("fs-name", "fs-name-e");
    return;
  }
  if (id) {
    const i = DB.staff.findIndex((x) => x.id === id);
    if (i > -1) DB.staff[i] = { id, name, role, phone, status };
    toast("Updated", "amber");
  } else {
    DB.staff.push({ id: uid(), name, role, phone, status });
    toast("Staff added");
  }
  save("staff");
  renderStaffTable();
  syncServer();
  closeMo("mo-staff");
}
async function delStaff(id) {
  const ok = await swalConfirm("Remove Staff?", "", "Remove");
  if (!ok) return;
  DB.staff = DB.staff.filter((x) => x.id !== id);
  save("staff");
  renderStaffTable();
  syncServer();
  toast("Removed", "info");
}
function renderStaffTable() {
  const tb = document.getElementById("staff-tb");
  if (!DB.staff.length) {
    tb.innerHTML =
      '<tr class="dt-empty"><td colspan="5">No staff added</td></tr>';
    return;
  }
  tb.innerHTML = DB.staff
    .map(
      (s) =>
        `<tr><td><strong style="font-family:var(--ff-display)">${s.name}</strong></td><td><span class="badge b-amber">${s.role || "—"}</span></td><td style="font-size:.75rem;color:var(--soft)">${s.phone || "—"}</td><td><span class="badge ${s.status === "on" ? "b-green" : "b-gray"}">${s.status === "on" ? "Active" : "Off Duty"}</span></td><td><div class="dt-acts"><button class="btn btn-sm btn-ghost" onclick="openStaffModal('${s.id}')">Edit</button><button class="btn btn-sm btn-red" onclick="delStaff('${s.id}')">✕</button></div></td></tr>`,
    )
    .join("");
}
function syncServer() {
  const sel = document.getElementById("f-server"),
    cur = sel.value;
  sel.innerHTML =
    '<option value="">Unassigned</option>' +
    DB.staff
      .filter((s) => s.status === "on")
      .map(
        (s) =>
          `<option value="${s.id}" ${s.id === cur ? "selected" : ""}>${s.name}</option>`,
      )
      .join("");
}

/* ═══════════════════════════════════
   TABLES CRUD
═══════════════════════════════════ */
const TBL_ICO = { avail: "🪑", busy: "🍽", rsrvd: "📋", clean: "🧹" };
const TBL_LBL = {
  avail: "Available",
  busy: "Occupied",
  rsrvd: "Reserved",
  clean: "Cleaning",
};
function openTblModal(id = null) {
  clrErr("mo-tbl");
  document.getElementById("mo-tbl-title").textContent = id
    ? "Edit Table"
    : "Add Table";
  const t = id ? DB.tables.find((x) => x.id === id) || {} : {};
  document.getElementById("ft-id").value = t.id || "";
  document.getElementById("ft-name").value = t.name || "";
  document.getElementById("ft-seats").value = t.seats || 4;
  document.getElementById("ft-status").value = t.status || "avail";
  openMo("mo-tbl");
}
function saveTable() {
  clrErr("mo-tbl");
  const id = document.getElementById("ft-id").value,
    name = document.getElementById("ft-name").value.trim();
  const seats = parseInt(document.getElementById("ft-seats").value) || 4,
    status = document.getElementById("ft-status").value;
  if (!name) {
    fErr("ft-name", "ft-name-e");
    return;
  }
  if (id) {
    const i = DB.tables.findIndex((x) => x.id === id);
    if (i > -1) DB.tables[i] = { id, name, seats, status };
    toast("Updated", "amber");
  } else {
    DB.tables.push({ id: uid(), name, seats, status });
    toast("Table added");
  }
  save("tables");
  renderTables();
  syncTableDropdown();
  closeMo("mo-tbl");
}
function setTblStatus(id, status) {
  const i = DB.tables.findIndex((x) => x.id === id);
  if (i > -1) {
    DB.tables[i].status = status;
    save("tables");
    renderTables();
  }
}
function renderTables() {
  const g = document.getElementById("tables-grid");
  if (!DB.tables.length) {
    g.innerHTML =
      '<div style="grid-column:1/-1;padding:50px;text-align:center;color:var(--soft);font-family:var(--ff-display);font-size:1.1rem;font-style:italic">No tables configured</div>';
    return;
  }
  g.innerHTML = DB.tables
    .map((t) => {
      const openTab = DB.tabs.find((tb) => tb.tableId === t.id);
      const openInfo = openTab
        ? `<div class="tbl-open" style="display:block">Open · ${openTab.items.reduce((s, i) => s + i.qty, 0)} items</div>`
        : "";
      return `<div class="tbl ${t.status}">
      <div class="tbl-icon">${TBL_ICO[t.status] || "🪑"}</div>
      <div class="tbl-name">${t.name}</div>
      <div class="tbl-seats">${t.seats} seats</div>
      <div class="tbl-st">${TBL_LBL[t.status]}</div>
      ${openInfo}
      <div class="tbl-acts">
        ${openTab ? `<button class="tbl-act" onclick="goToTab('${openTab.id}')">Open Tab</button>` : ""}
        <button class="tbl-act" onclick="startNewTabForTable('${t.id}')">New Order</button>
        <button class="tbl-act" onclick="setTblStatus('${t.id}','avail')">Free</button>
        <button class="tbl-act" onclick="openTblModal('${t.id}')">Edit</button>
        <button class="tbl-act tbl-act-del" onclick="delTable('${t.id}')">Delete</button>
      </div>
    </div>`;
    })
    .join("");
}
async function delTable(id) {
  const openTab = DB.tabs.find((tb) => tb.tableId === id);
  if (openTab) {
    Swal.fire({
      title: "Table Has an Open Tab",
      text: "Close or bill the open order on this table before deleting it.",
      icon: "warning",
    });
    return;
  }
  const tbl = DB.tables.find((t) => t.id === id);
  const ok = await swalConfirm(
    `Delete "${tbl?.name || "Table"}"?`,
    "This removes the table permanently. Past orders are not affected.",
    "Delete Table",
    "warning",
  );
  if (!ok) return;
  DB.tables = DB.tables.filter((t) => t.id !== id);
  save("tables");
  renderTables();
  syncTableDropdown();
  /* If the current tab was assigned to this table, clear the assignment */
  const activeTab = getActiveTab();
  if (activeTab && activeTab.tableId === id) {
    activeTab.tableId = "";
    activeTab.tableName = "Takeaway";
    save("tabs");
    document.getElementById("f-table").value = "";
  }
  toast(`${tbl?.name || "Table"} deleted`, "info");
}
function syncTableDropdown() {
  const sel = document.getElementById("f-table");
  const activeTabTableId = getActiveTab()?.tableId || "";
  sel.innerHTML =
    '<option value="">Takeaway / No Table</option>' +
    DB.tables
      .map((t) => {
        const existingTab = DB.tabs.find(
          (tb) => tb.tableId === t.id && tb.id !== TAB_ID,
        );
        const hasCurrent = activeTabTableId === t.id;
        const blocked = existingTab && !hasCurrent;
        return `<option value="${t.id}" ${hasCurrent ? "selected" : ""} ${blocked ? "disabled" : ""}>${t.name}${blocked ? " (Tab Open)" : ""} — ${TBL_LBL[t.status] || "?"}</option>`;
      })
      .join("");
}

/* ═══════════════════════════════════════════════
   MULTI-TABLE TAB SYSTEM — CORE FIX
   
   Design:
   • DB.tabs is the array of ALL open tabs.
   • TAB_ID is which tab the right panel is displaying.
   • Each tab stores its own items[], guest, tableId, etc.
   • startNewTab()   → creates a brand new empty tab (for takeaway or new table)
   • goToTab(id)     → switch the panel to an existing tab
   • saveActiveTab() → persist the panel's current state into the active tab object
   • Table constraint: ONE tab per tableId (non-empty). Enforced on table select.
═══════════════════════════════════════════════ */

function getActiveTab() {
  return DB.tabs.find((t) => t.id === TAB_ID) || null;
}

function startNewTab() {
  saveActiveTab();
  /* If the current active tab is already empty (no table, no items, no guest)
     just reuse it — don't keep piling up blank "Tab XXXX" entries */
  const current = getActiveTab();
  if (current && !current.tableId && !current.items.length && !current.guest) {
    KOT_PENDING = new Set();
    loadTabIntoPanel(current);
    return current;
  }
  const tab = {
    id: uid(),
    createdAt: new Date().toISOString(),
    guest: "",
    tableId: "",
    tableName: "Takeaway",
    staffId: "",
    staffName: "—",
    items: [],
    note: "",
    payment: CFG.defPay || "Cash",
    kotCount: 0,
  };
  DB.tabs.push(tab);
  save("tabs");
  TAB_ID = tab.id;
  KOT_PENDING = new Set();
  loadTabIntoPanel(tab);
  return tab;
}

function startNewTabForTable(tableId) {
  /* Called from Table Map "New Order" button */
  const existing = DB.tabs.find((tb) => tb.tableId === tableId);
  if (existing) {
    goToTab(existing.id);
    nav("pos");
    return;
  }
  saveActiveTab();
  const tbl = DB.tables.find((t) => t.id === tableId);
  const tab = {
    id: uid(),
    createdAt: new Date().toISOString(),
    guest: "",
    tableId,
    tableName: tbl ? tbl.name : "Table",
    staffId: "",
    staffName: "—",
    items: [],
    note: "",
    payment: CFG.defPay || "Cash",
    kotCount: 0,
  };
  DB.tabs.push(tab);
  save("tabs");
  TAB_ID = tab.id;
  KOT_PENDING = new Set();
  setTblStatus(tableId, "busy");
  loadTabIntoPanel(tab);
  nav("pos");
}

function goToTab(tabId) {
  saveActiveTab();
  const t = DB.tabs.find((x) => x.id === tabId);
  if (!t) return;
  TAB_ID = tabId;
  KOT_PENDING = new Set();
  loadTabIntoPanel(t);
}

function loadTabIntoPanel(tab) {
  document.getElementById("f-guest").value = tab.guest || "";
  document.getElementById("f-table").value = tab.tableId || "";
  document.getElementById("f-server").value = tab.staffId || "";
  document.getElementById("f-note").value = tab.note || "";
  document.getElementById("f-disc").value = "";
  document.getElementById("op-ref").textContent =
    "Tab: " + tab.id.slice(-8).toUpperCase();
  const pay = tab.payment || CFG.defPay || "Cash";
  document
    .querySelectorAll(".pay-btn")
    .forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-pay") === pay),
    );
  PAY = pay;
  syncTableDropdown();
  renderCart();
  syncBadge();
  renderTabsStrip();
  updateKotBtn();
}

/* Persist panel fields (guest, server, note, payment) into the active tab.
   tableId is intentionally NOT read from the dropdown here — table assignment
   happens only when the tab is created (in onTblChange / startNewTabForTable).
   This prevents accidental re-linking of an order to a different table. */
function saveActiveTab() {
  if (!TAB_ID) return;
  const tab = DB.tabs.find((t) => t.id === TAB_ID);
  if (!tab) return;
  tab.guest = document.getElementById("f-guest").value.trim();
  tab.staffId = document.getElementById("f-server").value;
  tab.note = document.getElementById("f-note").value.trim();
  tab.payment = PAY;
  const srv = DB.staff.find((s) => s.id === tab.staffId);
  tab.staffName = srv ? srv.name : "—";
  save("tabs");
}

/* Auto-save called on input changes */
function autoSaveTab() {
  saveActiveTab();
  renderTabsStrip();
}

/* ═══════════════════════════════════════════════════════
   TABLE DROPDOWN CHANGE
   Rule: every table (and Takeaway) gets its OWN independent
   order. Changing the dropdown NEVER reassigns the current
   order — it switches the panel to that table's order or
   creates a fresh empty one if none exists yet.

   Cases:
   A) Same table already selected  → nothing to do.
   B) Selected table has an open tab → save current, switch
      panel to that existing tab so user can view/edit it.
   C) Selected table is free OR Takeaway selected → save
      current tab as-is (it stays linked to its original
      table), then create a brand-new empty tab for the
      chosen table and load it into the panel.
══════════════════════════════════════════════════════= */
function onTblChange() {
  const chosen = document.getElementById("f-table").value;
  const current = getActiveTab();

  /* ── A: user re-selected the same table already on this tab ── */
  if (chosen === (current?.tableId || "")) return;

  /* ── B: chosen table already has its own open tab ── */
  const existingTab = DB.tabs.find(
    (tb) => tb.tableId === chosen && tb.id !== TAB_ID,
  );
  if (existingTab) {
    saveActiveTab(); // lock in the current tab unchanged
    TAB_ID = existingTab.id;
    KOT_PENDING = new Set();
    loadTabIntoPanel(existingTab); // show that table's full order
    const nm = chosen
      ? DB.tables.find((t) => t.id === chosen)?.name
      : "Takeaway";
    toast("Switched to " + (nm || "order"), "amber");
    return;
  }

  /* ── C: free table or Takeaway — create a new empty order for it ── */
  saveActiveTab(); // current tab stays linked to its table
  const tbl = chosen ? DB.tables.find((t) => t.id === chosen) : null;
  const tblName = tbl ? tbl.name : "Takeaway";
  /* Carry server over from the previous tab so staff doesn't need to re-select */
  const inheritedStaffId = current?.staffId || "";

  const newTab = {
    id: uid(),
    createdAt: new Date().toISOString(),
    guest: "",
    tableId: chosen,
    tableName: tblName,
    staffId: inheritedStaffId,
    staffName: DB.staff.find((s) => s.id === inheritedStaffId)?.name || "—",
    items: [],
    note: "",
    payment: CFG.defPay || "Cash",
    kotCount: 0,
  };
  DB.tabs.push(newTab);
  save("tabs");
  if (tbl) setTblStatus(chosen, "busy");

  TAB_ID = newTab.id;
  KOT_PENDING = new Set();
  loadTabIntoPanel(newTab); // panel shows fresh empty order for this table
  toast("New order started for " + tblName, "ok");
}

function killTab(tabId) {
  const tab = DB.tabs.find((t) => t.id === tabId);
  if (tab?.tableId) setTblStatus(tab.tableId, "avail");
  DB.tabs = DB.tabs.filter((t) => t.id !== tabId);
  save("tabs");
  if (TAB_ID === tabId) {
    if (DB.tabs.length > 0) {
      TAB_ID = DB.tabs[DB.tabs.length - 1].id;
      KOT_PENDING = new Set();
      loadTabIntoPanel(DB.tabs[DB.tabs.length - 1]);
    } else startNewTab();
  }
  renderTabsStrip();
  renderOpenTabs();
}

/* Tab strip in order panel */
function renderTabsStrip() {
  const area = document.getElementById("tabs-chips");
  const pill = document.getElementById("tabs-pill");
  const n = document.getElementById("tabs-pill-n"),
    nb = document.getElementById("tabs-n");

  /* Only show tabs that have a real table assigned.
     The current active blank tab (no table, no items) is the "working" panel
     and doesn't need a chip — user picks a table to activate it. */
  const visibleTabs = DB.tabs.filter(
    (tab) =>
      tab.tableId || // has a table assigned
      tab.items.length > 0 || // has items (takeaway order in progress)
      (tab.guest && tab.guest.trim()), // has a named guest
  );

  const cnt = visibleTabs.length;
  nb.textContent = cnt;
  nb.style.display = cnt ? "flex" : "none";
  n.textContent = cnt;
  pill.style.display = cnt > 0 ? "flex" : "none";

  if (!cnt) {
    area.innerHTML =
      '<span style="font-size:.67rem;color:rgba(255,255,255,.22);font-style:italic">No open tabs</span>';
    return;
  }
  area.innerHTML = visibleTabs
    .map((tab) => {
      /* Label: table name first, then guest name, never show raw ID */
      const lbl =
        tab.tableName && tab.tableName !== "Takeaway"
          ? tab.tableName
          : tab.guest
            ? tab.guest.split(" ")[0]
            : "Takeaway";
      const c = tab.items.reduce((s, i) => s + i.qty, 0);
      const isActive = tab.id === TAB_ID;
      return `<div class="tab-chip ${isActive ? "active" : ""}" onclick="goToTab('${tab.id}');nav('pos')" title="${tab.tableName || "Takeaway"}">${lbl}${c ? ` <span style="opacity:.55">(${c})</span>` : ""}</div>`;
    })
    .join("");
}

/* ═══════════════════════════════════
   CART — reads/writes active tab's items
═══════════════════════════════════ */
function getTabItems() {
  return getActiveTab()?.items || [];
}
function setTabItems(arr) {
  const t = getActiveTab();
  if (t) {
    t.items = arr;
    save("tabs");
  }
}

function buildCatBar() {
  const bar = document.getElementById("cat-bar");
  bar.innerHTML =
    `<button class="cat-btn ${ACTIVE_CAT === "all" ? "on" : ""}" onclick="filterCat('all')">All Dishes</button>` +
    DB.cats
      .map((c) => {
        const thumb = c.img
          ? `<span class="cat-thumb"><img src="${c.img}" alt=""/></span>`
          : `<span class="cat-thumb" style="background:${TAG_COLOR[c.tag] || "#94A3B8"}18">${getSVG(c.name).replace('width="40" height="40"', 'width="14" height="14"')}</span>`;
        return `<button class="cat-btn ${ACTIVE_CAT === c.id ? "on" : ""}" onclick="filterCat('${c.id}')">${thumb} ${c.name}</button>`;
      })
      .join("");
}
function filterCat(id) {
  ACTIVE_CAT = id;
  buildCatBar();
  renderMenu();
}

function renderMenu() {
  const q = document.getElementById("menu-q").value.toLowerCase();
  const list = DB.items.filter((it) => {
    if (ACTIVE_CAT !== "all" && it.catId !== ACTIVE_CAT) return false;
    if (
      q &&
      !it.name.toLowerCase().includes(q) &&
      !(it.desc || "").toLowerCase().includes(q)
    )
      return false;
    return true;
  });
  const g = document.getElementById("menu-grid");
  if (!list.length) {
    g.innerHTML =
      '<div style="grid-column:1/-1;padding:50px;text-align:center;color:var(--soft);font-family:var(--ff-display);font-size:1.1rem;font-style:italic">No dishes found</div>';
    return;
  }
  g.innerHTML = list
    .map((it) => {
      const cat = DB.cats.find((c) => c.id === it.catId) || {
        name: "",
        tag: "gray",
      };
      const unit = getUnit(it.unitId) || { name: "pcs", abbr: "pcs" };
      const stripe = `background:${TAG_COLOR[cat.tag] || "#94A3B8"}`;
      const imgContent = it.img
        ? `<img src="${it.img}" alt="${it.name}"/>`
        : `<div class="mc-img-placeholder">${getSVG(cat.name)}</div>`;
      return `<div class="menu-card ${it.status === "off" ? "unavail" : ""}" onclick="addToCart('${it.id}',this)">
      <div class="cat-stripe" style="${stripe}"></div>
      ${it.status === "off" ? '<div class="mc-unavail-badge">86\'d</div>' : ""}
      <div class="mc-img">${imgContent}</div>
      <div class="mc-body">
        <div class="mc-name">${it.name}</div>
        <div class="mc-cat-label">${cat.name}</div>
        <div class="mc-price"><span class="cur">${cur()} </span>${Number(it.price).toFixed(0)}<span style="font-size:.62rem;opacity:.6">/${unit.abbr}</span></div>
      </div>
      <div class="flash-ring"></div>
    </div>`;
    })
    .join("");
}

function addToCart(itemId, el) {
  if (!TAB_ID) startNewTab();
  const item = DB.items.find((i) => i.id === itemId);
  if (!item || item.status === "off") return;
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 400);
  const items = getTabItems();
  const ex = items.find((c) => c.itemId === itemId);
  const unit = getUnit(item.unitId) || {
    name: "pcs",
    abbr: "pcs",
    type: "fixed",
  };
  if (ex) {
    ex.qty++;
    KOT_PENDING.add(ex.id);
  } else {
    const cat = DB.cats.find((c) => c.id === item.catId) || { name: "" };
    const ni = {
      id: uid(),
      itemId,
      name: item.name,
      basePrice: item.price /* price per unit from definition */,
      price: item.price /* actual per-unit charge (may differ for variable) */,
      qty: 1,
      img: item.img,
      catName: cat.name,
      unitId: item.unitId,
      unitName: unit.name,
      unitAbbr: unit.abbr,
      unitType: unit.type,
      kotSent: false,
    };
    items.push(ni);
    KOT_PENDING.add(ni.id);
  }
  setTabItems(items);
  saveActiveTab();
  renderCart();
  syncBadge();
  updateKotBtn();
  if (CFG.autoKot === "yes") {
    printKOT();
  }
}

function adjQty(cid, d) {
  const items = getTabItems(),
    i = items.findIndex((c) => c.id === cid);
  if (i < 0) return;
  items[i].qty = Math.max(0.001, parseFloat((items[i].qty + d).toFixed(3)));
  if (items[i].qty <= 0) {
    KOT_PENDING.delete(cid);
    items.splice(i, 1);
  } else if (d > 0) KOT_PENDING.add(cid);
  setTabItems(items);
  saveActiveTab();
  renderCart();
  syncBadge();
  updateKotBtn();
}
function rmCI(cid) {
  const items = getTabItems().filter((c) => c.id !== cid);
  KOT_PENDING.delete(cid);
  setTabItems(items);
  saveActiveTab();
  renderCart();
  syncBadge();
  updateKotBtn();
}
async function clearOrder() {
  if (!getTabItems().length) return;
  const ok = await swalConfirm(
    "Clear Order?",
    "All items will be removed.",
    "Clear",
  );
  if (!ok) return;
  setTabItems([]);
  KOT_PENDING = new Set();
  saveActiveTab();
  renderCart();
  syncBadge();
  updateKotBtn();
}
function syncBadge() {
  const n = getTabItems().reduce((s, i) => s + i.qty, 0),
    el = document.getElementById("cart-n");
  el.style.display = n ? "flex" : "none";
  el.textContent = Math.round(n);
}
function selPay(btn) {
  document
    .querySelectorAll(".pay-btn")
    .forEach((b) => b.classList.remove("on"));
  btn.classList.add("on");
  PAY = btn.getAttribute("data-pay");
  saveActiveTab();
}

function renderCart() {
  const items = getTabItems();
  const area = document.getElementById("cart-area"),
    tots = document.getElementById("op-totals");
  const kotBar = document.getElementById("kot-status-bar");
  if (!items.length) {
    area.innerHTML = `<div class="cart-empty-state"><div class="ces-icon"><svg width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="17" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3"/><path d="M12 24c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="14.5" cy="15.5" r="1.5" fill="currentColor"/><circle cx="21.5" cy="15.5" r="1.5" fill="currentColor"/></svg></div><div class="ces-text">Tap a dish to begin</div></div>`;
    kotBar.style.display = "none";
    return;
  }
  area.innerHTML = items
    .map((c, i) => {
      const imgEl = c.img
        ? `<img src="${c.img}" alt=""/>`
        : `${getSVG(c.catName || "").replace('width="40" height="40"', 'width="22" height="22"')}`;
      const isPending = KOT_PENDING.has(c.id);
      const kotDot = `<div class="ci-kot-dot ${isPending ? "pending" : "sent"}" title="${isPending ? "Pending KOT" : "KOT Sent"}"></div>`;
      const isVar = c.unitType === "variable";
      /* For variable units show qty with decimals and edit icon */
      const qtyDisplay = isVar
        ? c.qty.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
        : c.qty;
      const unitBadge = `<span class="ci-unit-badge ${isVar ? "variable" : ""}" onclick="openUnitAdj('${c.id}')" title="${isVar ? "Click to adjust qty/price" : "Fixed unit"}">✎ ${qtyDisplay} ${c.unitAbbr}</span>`;
      const adjNote =
        isVar && c.price !== c.basePrice
          ? `<div style="font-size:.6rem;color:var(--amber3)">Custom: ${cur()} ${c.price.toFixed(0)}/${c.unitAbbr}</div>`
          : "";
      return `${i > 0 ? '<div class="ci-sep"></div>' : ""}<div class="ci">
      <div class="ci-img">${imgEl}</div>
      <div class="ci-info">
        <div class="ci-name">${c.name}</div>
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:2px">
          ${unitBadge}
          <span class="ci-unit">${cur()} ${c.price.toFixed(0)} ea</span>
        </div>
        ${adjNote}
      </div>
      ${kotDot}
      <div class="qty-row">
        ${
          isVar
            ? `<button class="qb" onclick="openUnitAdj('${c.id}')">✎</button>`
            : `<button class="qb" onclick="adjQty('${c.id}',-1)">−</button><span class="qv">${c.qty}</span><button class="qb" onclick="adjQty('${c.id}',1)">+</button>`
        }
      </div>
      <span class="ci-total">${cur()} ${(c.price * c.qty).toFixed(0)}</span>
      <button class="ci-del" onclick="rmCI('${c.id}')">✕</button>
    </div>`;
    })
    .join("");
  recalc();
  const pc = KOT_PENDING.size;
  if (pc > 0) {
    kotBar.style.display = "flex";
    document.getElementById("kot-pending-n").textContent =
      pc + " new item" + (pc !== 1 ? "s" : "");
  } else kotBar.style.display = "none";
}

function recalc() {
  const items = getTabItems();
  const rawDisc = parseFloat(document.getElementById("f-disc").value) || 0;
  const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  let disc = 0;
  if (CFG.discType === "pct") disc = Math.min(sub, sub * (rawDisc / 100));
  else disc = Math.min(sub, rawDisc);
  const afterDisc = sub - disc;
  const svcPct = CFG.serviceCharge || 0;
  const svc = afterDisc * (svcPct / 100);
  const taxPct = CFG.tax || 0;
  const tax = (afterDisc + svc) * (taxPct / 100);
  const grand = afterDisc + svc + tax;
  document.getElementById("t-sub").textContent = cur() + " " + sub.toFixed(0);
  document.getElementById("t-svc-lbl").textContent =
    "Service (" + svcPct + "%)";
  document.getElementById("t-svc").textContent = cur() + " " + svc.toFixed(0);
  document.getElementById("t-total").textContent =
    cur() + " " + grand.toFixed(0);
  const dr = document.getElementById("t-disc-row");
  if (disc > 0) {
    dr.style.display = "flex";
    document.getElementById("t-disc").textContent =
      "-" + cur() + " " + disc.toFixed(0);
  } else dr.style.display = "none";
  return { sub, disc, svc, tax, grand };
}

function saveTab() {
  const items = getTabItems(),
    guest = document.getElementById("f-guest").value.trim();
  if (!items.length && !guest) {
    Swal.fire({
      title: "Empty Tab",
      text: "Add items or a customer name first.",
      icon: "info",
    });
    return;
  }
  saveActiveTab();
  toast("Tab saved", "amber");
  renderTabsStrip();
}

/* ═══════════════════════════════════
   UNIT QUANTITY / PRICE ADJUSTMENT
═══════════════════════════════════ */
function openUnitAdj(cartId) {
  const items = getTabItems(),
    ci = items.find((c) => c.id === cartId);
  if (!ci) return;
  UA_CART_ID = cartId;
  UA_BASE_PRICE = ci.basePrice;
  document.getElementById("ua-title").textContent = "Adjust: " + ci.name;
  document.getElementById("ua-item-info").innerHTML =
    `<strong>${ci.name}</strong> &nbsp;|&nbsp; Unit: <strong>${ci.unitName} (${ci.unitAbbr})</strong><br>
     Base price: <strong>${cur()} ${ci.basePrice.toFixed(0)} per ${ci.unitAbbr}</strong>`;
  document.getElementById("ua-qty-label").textContent =
    `Quantity (${ci.unitAbbr})`;
  document.getElementById("ua-qty").value = ci.qty;
  document.getElementById("ua-price").value = parseFloat(
    (ci.price * ci.qty).toFixed(2),
  );
  updateUaRateInfo();
  openMo("mo-unit-adj");
}
function uaQtyChanged() {
  const qty = parseFloat(document.getElementById("ua-qty").value) || 0;
  const items = getTabItems(),
    ci = items.find((c) => c.id === UA_CART_ID);
  if (!ci) return;
  const totalPrice =
    qty * ci.price; /* keep per-unit price, update total shown */
  document.getElementById("ua-price").value = parseFloat(totalPrice.toFixed(2));
  updateUaRateInfo();
}
function uaPriceChanged() {
  const totalPrice = parseFloat(document.getElementById("ua-price").value) || 0;
  const qty = parseFloat(document.getElementById("ua-qty").value) || 0;
  if (qty > 0) {
    /* price changed → figure out implied qty based on base price */
    const impliedQty = totalPrice / UA_BASE_PRICE;
    document.getElementById("ua-qty").value = parseFloat(impliedQty.toFixed(3));
  }
  updateUaRateInfo();
}
function updateUaRateInfo() {
  const qty = parseFloat(document.getElementById("ua-qty").value) || 0;
  const total = parseFloat(document.getElementById("ua-price").value) || 0;
  const perUnit = qty > 0 ? total / qty : 0;
  const diff = perUnit - UA_BASE_PRICE;
  const pct = UA_BASE_PRICE > 0 ? (diff / UA_BASE_PRICE) * 100 : 0;
  let note = "";
  if (Math.abs(diff) > 0.1)
    note = `<span style="color:${diff < 0 ? "var(--green)" : "var(--red)"}"> (${diff < 0 ? "-" : "+"}${cur()} ${Math.abs(diff).toFixed(0)}/unit, ${pct.toFixed(0)}%)</span>`;
  document.getElementById("ua-rate-info").innerHTML =
    `Effective rate: <strong>${cur()} ${perUnit.toFixed(0)}/${(getTabItems().find((c) => c.id === UA_CART_ID) || { unitAbbr: "unit" }).unitAbbr}</strong>${note}<br>Total: <strong>${cur()} ${total.toFixed(0)}</strong>`;
}
function applyUnitAdj() {
  const items = getTabItems(),
    i = items.findIndex((c) => c.id === UA_CART_ID);
  if (i < 0) {
    closeMo("mo-unit-adj");
    return;
  }
  const qty = parseFloat(document.getElementById("ua-qty").value) || 0;
  const total = parseFloat(document.getElementById("ua-price").value) || 0;
  if (qty <= 0) {
    Swal.fire({
      title: "Invalid Qty",
      text: "Quantity must be greater than 0.",
      icon: "warning",
    });
    return;
  }
  items[i].qty = qty;
  items[i].price =
    qty > 0
      ? total / qty
      : items[i].basePrice; /* store per-unit effective price */
  KOT_PENDING.add(UA_CART_ID);
  setTabItems(items);
  saveActiveTab();
  renderCart();
  syncBadge();
  updateKotBtn();
  closeMo("mo-unit-adj");
  toast("Quantity / price updated", "ok");
}

/* ═══════════════════════════════════
   OPEN TABS PAGE
═══════════════════════════════════ */
function renderOpenTabs() {
  const g = document.getElementById("tabs-grid");
  const open = DB.tabs.filter((t) => t.items.length > 0 || t.guest);
  if (!open.length) {
    g.innerHTML =
      '<div class="tabs-empty">No open tabs — all bills settled</div>';
    return;
  }
  g.innerHTML = open
    .map((tab) => {
      const tot = tab.items.reduce((s, i) => s + i.price * i.qty, 0);
      const isCur = tab.id === TAB_ID;
      const rows = tab.items
        .map((i) => {
          const imgEl = i.img
            ? `<img src="${i.img}" alt=""/>`
            : `${getSVG(i.catName || "").replace('width="40" height="40"', 'width="18" height="18"')}`;
          return `<div class="ot-item"><div class="ot-item-img">${imgEl}</div><span class="ot-item-name">${i.name}</span><span class="ot-item-qty">${i.qty}${i.unitAbbr ? ` ${i.unitAbbr}` : ""}</span><span class="ot-item-price">${cur()} ${(i.price * i.qty).toFixed(0)}</span></div>`;
        })
        .join("");
      const meta =
        [
          tab.tableName && tab.tableName !== "Takeaway" ? tab.tableName : null,
          tab.staffName && tab.staffName !== "—" ? tab.staffName : null,
          tab.guest ? `Guest: ${tab.guest}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "No details";
      return `<div class="ot-card">
      <div class="ot-head">
        <div><div class="ot-tag">${tab.tableName || "Takeaway"}${tab.staffName && tab.staffName !== "—" ? " · " + tab.staffName : ""}</div><div class="ot-meta">${meta}</div></div>
        <div style="display:flex;gap:5px;align-items:center">
          <span class="badge ${isCur ? "b-amber" : "b-gray"}">${isCur ? "Active" : "Open"}</span>
          <button class="btn btn-sm btn-red" onclick="killTab('${tab.id}')">✕</button>
        </div>
      </div>
      <div class="ot-items">${rows || '<div style="font-size:.77rem;color:var(--soft);padding:10px 0;font-style:italic">No items yet</div>'}</div>
      <div class="ot-foot">
        <div><div class="ot-total-l">Running Total</div><div class="ot-total-n">${cur()} ${tot.toFixed(0)}</div></div>
        <div class="ot-actions">
          <button class="btn btn-sm btn-outline" onclick="goToTab('${tab.id}');nav('pos')">+ Items</button>
          <button class="btn btn-sm btn-amber" onclick="goToTab('${tab.id}');nav('pos');setTimeout(confirmOrder,400)">Bill</button>
        </div>
      </div>
    </div>`;
    })
    .join("");
}

/* ═══════════════════════════════════
   KOT
═══════════════════════════════════ */
function updateKotBtn() {
  const btn = document.getElementById("kot-btn");
  if (KOT_PENDING.size > 0) btn.classList.add("has-items");
  else btn.classList.remove("has-items");
}
function printKOT() {
  const items = getTabItems();
  if (!items.length) {
    Swal.fire({ title: "No Items", text: "Add items first.", icon: "info" });
    return;
  }
  const tab = getActiveTab();
  const pendingItems =
    KOT_PENDING.size > 0 ? items.filter((c) => KOT_PENDING.has(c.id)) : items;
  const now = new Date();
  document.getElementById("kot-area").innerHTML = buildKOTHtml({
    kotNum: KOT_NUM,
    table: tab?.tableName || "Takeaway",
    server: DB.staff.find((s) => s.id === tab?.staffId)?.name || "—",
    time: now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    date: now.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    items: pendingItems,
    isPartial: KOT_PENDING.size > 0 && KOT_PENDING.size < items.length,
  });
  openMo("mo-kot");
}
function buildKOTHtml({ kotNum, table, server, time, date, items, isPartial }) {
  const rows = items
    .map(
      (i) =>
        `<div class="kot-item new"><span class="kot-item-name">${i.name} <span class="new-badge">NEW</span></span><span class="kot-item-qty">${i.qty}${i.unitAbbr ? ` ${i.unitAbbr}` : ""}</span></div>`,
    )
    .join("");
  return `<div class="kot-print"><div class="kot-header"><div class="kot-title">Kitchen Order Ticket</div><div class="kot-sub">${CFG.restName}</div></div><div class="kot-meta"><div class="kot-meta-row"><span>KOT #</span><strong>${kotNum}</strong></div><div class="kot-meta-row"><span>Table</span><strong>${table}</strong></div><div class="kot-meta-row"><span>Server</span><strong>${server}</strong></div><div class="kot-meta-row"><span>Time</span><strong>${time} · ${date}</strong></div>${isPartial ? '<div class="kot-meta-row"><span>Type</span><strong style="color:#F59E0B">ADD-ON</strong></div>' : ""}</div><div class="kot-items-head"><span>Item</span><span>Qty</span></div>${rows}<div class="kot-footer"><div class="kot-footer-txt">Prepare immediately</div></div></div>`;
}
function doPrintKOT() {
  const items = getTabItems();
  KOT_PENDING.forEach((id) => {
    const ci = items.find((c) => c.id === id);
    if (ci) ci.kotSent = true;
  });
  KOT_PENDING = new Set();
  KOT_NUM++;
  LS.set("kot_num", KOT_NUM);
  const tab = getActiveTab();
  if (tab) {
    tab.kotCount = (tab.kotCount || 0) + 1;
    save("tabs");
  }
  setTabItems(items);
  document.getElementById("print-zone").innerHTML =
    document.getElementById("kot-area").innerHTML;
  window.print();
  closeMo("mo-kot");
  saveActiveTab();
  renderCart();
  updateKotBtn();
  toast("KOT printed", "ok");
}

/* ═══════════════════════════════════
   CONFIRM & BILL
═══════════════════════════════════ */
async function confirmOrder() {
  saveActiveTab();
  const tab = getActiveTab();
  if (!tab || !tab.items.length) {
    Swal.fire({
      title: "Empty Order",
      text: "Add items before billing.",
      icon: "warning",
    });
    return;
  }
  if (KOT_PENDING.size > 0) {
    const r = await Swal.fire({
      title: "Unprinted KOT Items",
      text: `${KOT_PENDING.size} item(s) not yet sent to kitchen.`,
      icon: "warning",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Print KOT First",
      denyButtonText: "Bill Without KOT",
      cancelButtonText: "Cancel",
    });
    if (r.isConfirmed) {
      printKOT();
      return;
    }
    if (r.isDismissed) return;
  }
  const { sub, disc, svc, tax, grand } = recalc();
  const now = new Date();
  const order = {
    id: tab.id,
    num: ORDER_NUM,
    createdAt: now.toISOString(),
    guest: tab.guest || "Guest",
    staffId: tab.staffId,
    staffName: tab.staffName || "—",
    tableId: tab.tableId,
    tableName: tab.tableName || "Takeaway",
    items: [...tab.items],
    subtotal: sub,
    discount: disc,
    serviceCharge: svc,
    tax,
    total: grand,
    payMethod: PAY,
    note: tab.note,
  };
  DB.orders.push(order);
  save("orders");
  ORDER_NUM++;
  if (tab.tableId) setTblStatus(tab.tableId, "avail");
  DB.tabs = DB.tabs.filter((t) => t.id !== tab.id);
  save("tabs");
  document.getElementById("rcpt-area").innerHTML = buildRcpt(order);
  openMo("mo-rcpt");
  toast("Order #" + order.num + " confirmed ✦", "amber");
  startNewTab();
}

function buildRcpt(o) {
  const d = new Date(o.createdAt);
  const ds = d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const ts = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const rows = o.items
    .map((i) => {
      const imgEl = i.img
        ? `<img src="${i.img}" alt=""/>`
        : `${getSVG(i.catName || "").replace('width="40" height="40"', 'width="16" height="16"')}`;
      const qtyStr = i.unitAbbr ? `${i.qty}${i.unitAbbr}` : `×${i.qty}`;
      return `<div class="rcpt-item"><div class="rcpt-item-img">${imgEl}</div><span class="rcpt-item-name">${i.name}</span><span class="rcpt-item-qty">${qtyStr}</span><span class="rcpt-item-amt">${cur()} ${(i.price * i.qty).toFixed(0)}</span></div>`;
    })
    .join("");
  const svcRow =
    o.serviceCharge > 0
      ? `<div class="rcpt-sr"><span>Service Charge (${CFG.serviceCharge}%)</span><span>${cur()} ${o.serviceCharge.toFixed(0)}</span></div>`
      : "";
  const taxRow =
    o.tax > 0
      ? `<div class="rcpt-sr"><span>Tax (${CFG.tax}%)</span><span>${cur()} ${o.tax.toFixed(0)}</span></div>`
      : "";
  return `<div class="rcpt"><div class="rcpt-top"><div class="rcpt-logo">${CFG.restName}</div><div class="rcpt-sub">${CFG.restAddress || "Restaurant POS"}</div><hr class="rcpt-hr"/><div class="rcpt-oid">Order #${o.num} · ${o.id.toUpperCase().slice(0, 8)}</div></div><div class="rcpt-body"><div class="rcpt-meta"><div class="rcpt-mr"><span>Date</span><strong>${ds}</strong></div><div class="rcpt-mr"><span>Time</span><strong>${ts}</strong></div><div class="rcpt-mr"><span>Guest</span><strong>${o.guest}</strong></div><div class="rcpt-mr"><span>Table</span><strong>${o.tableName}</strong></div><div class="rcpt-mr"><span>Server</span><strong>${o.staffName}</strong></div></div><div class="rcpt-items-hd"><span>Dish</span><span>Qty</span><span>Amount</span></div>${rows}<div class="rcpt-sums"><div class="rcpt-sr"><span>Subtotal</span><span>${cur()} ${o.subtotal.toFixed(0)}</span></div>${o.discount > 0 ? `<div class="rcpt-sr" style="color:#059669"><span>Discount</span><span>-${cur()} ${o.discount.toFixed(0)}</span></div>` : ""}${svcRow}${taxRow}<div class="rcpt-sr grand"><span class="rsl">Total</span><span class="rsv">${cur()} ${o.total.toFixed(0)}</span></div></div><div class="rcpt-pay-row"><span>Payment</span><strong>${o.payMethod}</strong></div>${o.note ? `<div style="margin-top:8px;padding:6px 10px;background:#f0ece4;border-radius:5px;font-size:.7rem;color:#7a7268">Note: ${o.note}</div>` : ""}</div><div class="rcpt-foot"><div class="rcpt-dots">· · · · ·</div><div class="rcpt-thanks">${CFG.rcptFooter || "Thank you!"}</div></div></div>`;
}
function printRcpt() {
  document.getElementById("print-zone").innerHTML =
    document.getElementById("rcpt-area").innerHTML;
  window.print();
}
function viewRcpt(id) {
  const o = DB.orders.find((x) => x.id === id);
  if (!o) return;
  document.getElementById("rcpt-area").innerHTML = buildRcpt(o);
  openMo("mo-rcpt");
}

/* ═══════════════════════════════════
   ORDER HISTORY + DATE FILTERS
═══════════════════════════════════ */
function setDatePreset(p) {
  const now = new Date(),
    fmt = (d) => d.toISOString().slice(0, 10);
  const from = document.getElementById("h-from"),
    to = document.getElementById("h-to");
  if (p === "today") {
    from.value = fmt(now);
    to.value = fmt(now);
  } else if (p === "week") {
    const s = new Date(now);
    s.setDate(now.getDate() - now.getDay());
    from.value = fmt(s);
    to.value = fmt(now);
  } else if (p === "month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    from.value = fmt(s);
    to.value = fmt(now);
  } else {
    from.value = "";
    to.value = "";
  }
  renderHistory();
}
function renderHistory() {
  const feed = document.getElementById("history-feed"),
    summary = document.getElementById("history-summary");
  const q = (document.getElementById("q-orders") || {}).value || "";
  const fromVal = document.getElementById("h-from").value;
  const toVal = document.getElementById("h-to").value;
  const fromD = fromVal ? new Date(fromVal + "T00:00:00") : null;
  const toD = toVal ? new Date(toVal + "T23:59:59") : null;
  const list = [...DB.orders].reverse().filter((o) => {
    if (
      q &&
      !o.guest.toLowerCase().includes(q.toLowerCase()) &&
      !String(o.num).includes(q)
    )
      return false;
    const d = new Date(o.createdAt);
    if (fromD && d < fromD) return false;
    if (toD && d > toD) return false;
    return true;
  });
  /* Summary bar */
  const totRev = list.reduce((s, o) => s + o.total, 0);
  const totItems = list.reduce(
    (s, o) => s + o.items.reduce((a, i) => a + i.qty, 0),
    0,
  );
  summary.innerHTML = list.length
    ? `
    <div class="hs-item"><div class="hs-n">${list.length}</div><div class="hs-l">Orders</div></div>
    <div class="hs-item"><div class="hs-n">${cur()} ${totRev.toFixed(0)}</div><div class="hs-l">Revenue</div></div>
    <div class="hs-item"><div class="hs-n">${cur()} ${list.length ? (totRev / list.length).toFixed(0) : 0}</div><div class="hs-l">Avg Order</div></div>
    <div class="hs-item"><div class="hs-n">${Math.round(totItems)}</div><div class="hs-l">Items Sold</div></div>
  `
    : "";
  if (!list.length) {
    feed.innerHTML =
      '<div style="text-align:center;padding:60px;color:var(--soft);font-family:var(--ff-display);font-size:1.1rem;font-style:italic">No orders found</div>';
    return;
  }
  feed.innerHTML = list
    .map((o) => {
      const d = new Date(o.createdAt);
      const items = o.items.map((i) => i.name).join(", ");
      return `<div class="oh-item"><div class="oh-num"><div class="oh-n">#${o.num}</div><div class="oh-d">${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div></div><div class="oh-body"><div class="oh-guest">${o.guest}</div><div class="oh-items-txt">${items.slice(0, 70)}${items.length > 70 ? "…" : ""}</div><div class="oh-tags"><span class="badge b-amber">${o.tableName}</span><span class="badge b-green">${o.payMethod}</span><span class="badge b-gray">${o.items.reduce((s, i) => s + i.qty, 0) | 0} items</span>${o.staffName && o.staffName !== "—" ? `<span class="badge b-blue">${o.staffName}</span>` : ""}</div></div><div class="oh-right"><div class="oh-total">${cur()} ${o.total.toFixed(0)}</div><div class="oh-time">${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div><div class="oh-acts"><button class="btn btn-sm btn-outline" onclick="viewRcpt('${o.id}')">Receipt</button></div></div></div>`;
    })
    .join("");
}
async function clearHistory() {
  if (!DB.orders.length) return;
  const ok = await swalConfirm(
    "Clear All History?",
    "This cannot be undone.",
    "Clear All",
  );
  if (!ok) return;
  DB.orders = [];
  ORDER_NUM = 1;
  save("orders");
  renderHistory();
  toast("Cleared", "info");
}

/* ═══════════════════════════════════
   DASHBOARD
═══════════════════════════════════ */
function renderDash() {
  const today = new Date().toDateString();
  const tod = DB.orders.filter(
    (o) => new Date(o.createdAt).toDateString() === today,
  );
  const todR = tod.reduce((s, o) => s + o.total, 0),
    totR = DB.orders.reduce((s, o) => s + o.total, 0),
    avg = DB.orders.length ? totR / DB.orders.length : 0;
  document.getElementById("dash-stats").innerHTML =
    `<div class="stat-card"><div class="stat-bg">💰</div><div class="stat-n"><span class="cur">${cur()} </span>${todR.toFixed(0)}</div><div class="stat-l">Today Revenue</div></div><div class="stat-card"><div class="stat-bg">📜</div><div class="stat-n">${tod.length}</div><div class="stat-l">Today Orders</div></div><div class="stat-card"><div class="stat-bg">◈</div><div class="stat-n"><span class="cur">${cur()} </span>${totR.toFixed(0)}</div><div class="stat-l">Total Revenue</div></div><div class="stat-card"><div class="stat-bg">✦</div><div class="stat-n"><span class="cur">${cur()} </span>${avg.toFixed(0)}</div><div class="stat-l">Avg Order</div></div>`;
  document.getElementById("dash-today-n").textContent = tod.length;
  const te = document.getElementById("dash-today");
  if (!tod.length)
    te.innerHTML =
      '<div style="color:var(--soft);font-size:.82rem;padding:12px 0;font-style:italic">No orders today</div>';
  else
    te.innerHTML = [...tod]
      .reverse()
      .slice(0, 7)
      .map((o) => {
        const d = new Date(o.createdAt);
        return `<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border)"><span style="font-size:.66rem;color:var(--soft);white-space:nowrap">${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span><span style="flex:1;font-family:var(--ff-display);font-size:.92rem">${o.guest}</span><span style="font-family:var(--ff-display);font-size:.95rem;color:var(--amber3)">${cur()} ${o.total.toFixed(0)}</span></div>`;
      })
      .join("");
  const dc = {};
  DB.orders.forEach((o) =>
    o.items.forEach((i) => {
      if (!dc[i.name]) dc[i.name] = { q: 0, r: 0 };
      dc[i.name].q += i.qty;
      dc[i.name].r += i.price * i.qty;
    }),
  );
  const td = Object.entries(dc)
      .sort((a, b) => b[1].r - a[1].r)
      .slice(0, 6),
    mx = td[0] ? td[0][1].r : 1;
  document.getElementById("dash-top").innerHTML = !td.length
    ? '<div style="color:var(--soft);font-size:.82rem">No data</div>'
    : td
        .map(
          ([n, d]) =>
            `<div class="perf-item"><div class="perf-row"><span>${n}</span><span>${cur()} ${d.r.toFixed(0)}</span></div><div class="perf-track"><div class="perf-fill" style="width:${(d.r / mx) * 100}%"></div></div></div>`,
        )
        .join("");
  const cr = {};
  DB.orders.forEach((o) =>
    o.items.forEach((i) => {
      const item = DB.items.find((x) => x.name === i.name),
        cat = item ? DB.cats.find((c) => c.id === item.catId) : null;
      const cn = cat ? cat.name : "Other";
      if (!cr[cn]) cr[cn] = { r: 0 };
      cr[cn].r += i.price * i.qty;
    }),
  );
  const ca = Object.entries(cr).sort((a, b) => b[1].r - a[1].r),
    mc = ca[0] ? ca[0][1].r : 1;
  document.getElementById("dash-cats").innerHTML = !ca.length
    ? '<div style="color:var(--soft);font-size:.82rem">No data</div>'
    : ca
        .map(
          ([n, d]) =>
            `<div class="perf-item"><div class="perf-row"><span>${n}</span><span style="color:var(--amber3)">${cur()} ${d.r.toFixed(0)}</span></div><div class="perf-track"><div class="perf-fill" style="width:${(d.r / mc) * 100}%"></div></div></div>`,
        )
        .join("");
  const sr = {};
  DB.orders.forEach((o) => {
    if (o.staffName && o.staffName !== "—") {
      if (!sr[o.staffName]) sr[o.staffName] = { n: 0, r: 0 };
      sr[o.staffName].n++;
      sr[o.staffName].r += o.total;
    }
  });
  const sa = Object.entries(sr).sort((a, b) => b[1].r - a[1].r);
  document.getElementById("dash-staff").innerHTML = !sa.length
    ? '<div style="color:var(--soft);font-size:.82rem">No data</div>'
    : sa
        .map(
          ([n, d]) =>
            `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)"><div><div style="font-family:var(--ff-display);font-size:.93rem">${n}</div><div style="font-size:.65rem;color:var(--soft)">${d.n} order${d.n !== 1 ? "s" : ""}</div></div><div style="font-family:var(--ff-display);font-size:1.05rem;color:var(--amber3)">${cur()} ${d.r.toFixed(0)}</div></div>`,
        )
        .join("");
}
function renderMaster() {
  renderItemsTable();
  renderCatsTable();
  renderStaffTable();
}

/* ═══════════════════════════════════
   REFRESH POS PANEL
═══════════════════════════════════ */
function refreshPOS() {
  buildCatBar();
  renderMenu();
  syncTableDropdown();
  syncServer();
  const tab = getActiveTab();
  if (tab) {
    document.getElementById("f-guest").value = tab.guest || "";
    document.getElementById("f-table").value = tab.tableId || "";
    document.getElementById("f-server").value = tab.staffId || "";
    document.getElementById("f-note").value = tab.note || "";
    document.getElementById("op-ref").textContent =
      "Tab: " + tab.id.slice(-8).toUpperCase();
    const pay = tab.payment || CFG.defPay || "Cash";
    document
      .querySelectorAll(".pay-btn")
      .forEach((b) =>
        b.classList.toggle("on", b.getAttribute("data-pay") === pay),
      );
    PAY = pay;
  }
  renderCart();
  syncBadge();
  renderTabsStrip();
  updateKotBtn();
}

/* ═══════════════════════════════════
   CLOCK
═══════════════════════════════════ */
function tick() {
  const d = new Date();
  document.getElementById("clk").textContent =
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   SHIFT SYSTEM — complete rewrite
   Logic:
   - CFG.activeShift = { start: ISO, end: ISO|null, name? }
   - DB.shifts = array of completed shift records
   - A shift can span midnight (cross-day).
   - renderShiftPage() is the single source of truth — it
     reads CFG.activeShift and populates all UI correctly.
   - generateShiftReport() always reads the datetime inputs,
     which are kept in sync with CFG.activeShift.
════════════════════════════════════════════════════════ */

/* Format a datetime-local input value from a Date */
function toDatetimeLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/* Format a Date for display */
function fmtShiftDt(d) {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
/* Duration string between two Dates */
function shiftDuration(start, end) {
  const ms = end - start;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* Called whenever datetime inputs change — update preview */
function onShiftTimeChange() {
  const sv = document.getElementById("sh-start").value;
  const ev = document.getElementById("sh-end").value;
  const preview = document.getElementById("shift-duration-preview");
  const crossNote = document.getElementById("shift-cross-note");
  if (!sv || !ev || !preview) return;
  const s = new Date(sv),
    e = new Date(ev);
  if (e <= s) {
    preview.textContent = "⚠ End must be after start";
    preview.style.color = "var(--red)";
    if (crossNote) crossNote.style.display = "none";
    return;
  }
  preview.textContent = `Duration: ${shiftDuration(s, e)}`;
  preview.style.color = "var(--soft)";
  // Cross-midnight: end date is different from start date
  const crossMidnight = s.toDateString() !== e.toDateString();
  if (crossNote) crossNote.style.display = crossMidnight ? "flex" : "none";
}

function shiftPreset(type) {
  const now = new Date();
  let s = new Date(now),
    e = new Date(now);
  if (type === "morning") {
    s.setHours(6, 0, 0, 0);
    e.setHours(14, 0, 0, 0);
  }
  if (type === "afternoon") {
    s.setHours(14, 0, 0, 0);
    e.setHours(22, 0, 0, 0);
  }
  if (type === "night") {
    s.setHours(22, 0, 0, 0);
    e = new Date(s);
    e.setDate(e.getDate() + 1); // next day for cross-midnight
    e.setHours(6, 0, 0, 0);
  }
  document.getElementById("sh-start").value = toDatetimeLocal(s);
  document.getElementById("sh-end").value = toDatetimeLocal(e);
  onShiftTimeChange();
}

function renderShiftPage() {
  const active = CFG.activeShift;

  /* ── Hero status bar ── */
  const dot = document.getElementById("ssh-dot");
  const statusTxt = document.getElementById("ssh-status-txt");
  const timesEl = document.getElementById("ssh-times");
  const actionsEl = document.getElementById("ssh-actions");
  const startBtn = document.getElementById("start-shift-btn");
  const endBtn = document.getElementById("end-shift-btn");

  if (active) {
    const s = new Date(active.start);
    const e = active.end ? new Date(active.end) : null;
    // Hero
    if (dot) {
      dot.className = "ssh-dot active";
    }
    if (statusTxt) statusTxt.textContent = "Shift Active";
    if (timesEl)
      timesEl.textContent =
        fmtShiftDt(s) + (e ? " → " + fmtShiftDt(e) : " → ongoing");
    if (actionsEl)
      actionsEl.innerHTML = `<button class="btn btn-red btn-sm" onclick="endShift()">■ End Shift</button>
       <button class="btn btn-outline btn-sm" onclick="generateShiftReport()">📊 Refresh Report</button>`;
    // Inputs — populate from active shift so Generate Report works
    const startEl = document.getElementById("sh-start");
    const endEl = document.getElementById("sh-end");
    if (startEl) startEl.value = toDatetimeLocal(s);
    if (endEl)
      endEl.value = e ? toDatetimeLocal(e) : toDatetimeLocal(new Date());
    // Buttons
    if (startBtn) startBtn.textContent = "↺ Update Shift";
    if (endBtn) endBtn.style.display = "inline-flex";
    onShiftTimeChange();
    generateShiftReport();
  } else {
    if (dot) {
      dot.className = "ssh-dot";
    }
    if (statusTxt) statusTxt.textContent = "No Active Shift";
    if (timesEl)
      timesEl.textContent =
        "Start a shift to track sales for a specific period";
    if (actionsEl) actionsEl.innerHTML = "";
    if (startBtn) startBtn.textContent = "▶ Start Shift";
    if (endBtn) endBtn.style.display = "none";
  }

  renderPastShifts();
  updateShiftSidebar();
}

function startShift() {
  const sv = document.getElementById("sh-start").value;
  const ev = document.getElementById("sh-end").value;
  if (!sv) {
    Swal.fire({
      title: "Start Time Required",
      text: "Please set a shift start time or use a preset.",
      icon: "warning",
    });
    return;
  }
  const startDt = new Date(sv);
  const endDt = ev ? new Date(ev) : null;
  if (endDt && endDt <= startDt) {
    Swal.fire({
      title: "Invalid Times",
      text: "End time must be after start time.",
      icon: "warning",
    });
    return;
  }
  // Warn if shift already active
  if (CFG.activeShift) {
    Swal.fire({
      title: "Shift Already Active",
      text: "An active shift exists. Do you want to replace it with the new times?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Update",
      cancelButtonText: "Cancel",
    }).then((r) => {
      if (r.isConfirmed) _doStartShift(startDt, endDt);
    });
    return;
  }
  _doStartShift(startDt, endDt);
}

function _doStartShift(startDt, endDt) {
  CFG.activeShift = {
    start: startDt.toISOString(),
    end: endDt ? endDt.toISOString() : null,
    startedAt: new Date().toISOString(),
  };
  saveCFG();
  renderShiftPage();
  toast("Shift started — " + fmtShiftDt(startDt), "ok");
}

async function endShift() {
  if (!CFG.activeShift) return;
  const ok = await swalConfirm(
    "End This Shift?",
    "The shift will be saved to history.",
    "End Shift",
    "question",
  );
  if (!ok) return;
  const now = new Date().toISOString();
  if (!DB.shifts) DB.shifts = [];
  DB.shifts.push({ ...CFG.activeShift, closedAt: now });
  LS.set("shifts", DB.shifts);
  CFG.activeShift = null;
  saveCFG();
  renderShiftPage();
  toast("Shift ended and saved to history", "info");
}

function generateShiftReport() {
  const area = document.getElementById("shift-report-area");
  if (!area) return;
  const sv = document.getElementById("sh-start").value;
  const ev = document.getElementById("sh-end").value;

  if (!sv) {
    area.innerHTML = `<div class="shift-report-empty"><div class="sre-icon">📊</div><div class="sre-title">Set Shift Times</div><div class="sre-sub">Configure shift start and end times, then click View Report</div></div>`;
    return;
  }

  const shiftStart = new Date(sv);
  const shiftEnd = ev ? new Date(ev) : new Date(); // if no end, use now

  if (shiftEnd <= shiftStart) {
    area.innerHTML = `<div class="shift-report-empty"><div class="sre-icon">⚠️</div><div class="sre-title">Invalid Time Range</div><div class="sre-sub">End time must be after start time</div></div>`;
    return;
  }

  // Filter orders: createdAt falls within [shiftStart, shiftEnd]
  // This correctly handles cross-midnight because Date comparison is epoch-based
  const shiftOrders = DB.orders.filter((o) => {
    const t = new Date(o.createdAt);
    return t >= shiftStart && t <= shiftEnd;
  });

  const totalRev = shiftOrders.reduce((s, o) => s + o.total, 0);
  const totalItems = shiftOrders.reduce(
    (s, o) => s + o.items.reduce((a, i) => a + i.qty, 0),
    0,
  );
  const avgOrder = shiftOrders.length ? totalRev / shiftOrders.length : 0;
  const crossMidnight = shiftStart.toDateString() !== shiftEnd.toDateString();

  /* Payment breakdown */
  const payBreak = {};
  shiftOrders.forEach((o) => {
    payBreak[o.payMethod] = (payBreak[o.payMethod] || 0) + o.total;
  });

  /* Top items */
  const itemMap = {};
  shiftOrders.forEach((o) =>
    o.items.forEach((i) => {
      if (!itemMap[i.name]) itemMap[i.name] = { qty: 0, rev: 0 };
      itemMap[i.name].qty += i.qty;
      itemMap[i.name].rev += i.price * i.qty;
    }),
  );
  const topItems = Object.entries(itemMap)
    .sort((a, b) => b[1].rev - a[1].rev)
    .slice(0, 5);

  /* Order rows */
  const orderRows =
    shiftOrders.length === 0
      ? '<div class="shift-no-orders">No orders found in this shift window</div>'
      : shiftOrders
          .map((o) => {
            const d = new Date(o.createdAt);
            const itemNames = o.items.map((i) => i.name).join(", ");
            return `<div class="shift-order-row">
          <div class="sho-num">#${o.num}</div>
          <div class="sho-body">
            <div class="sho-guest">${o.guest}</div>
            <div class="sho-meta">${o.tableName} · ${o.staffName || "Unassigned"} · ${itemNames.slice(0, 40)}${itemNames.length > 40 ? "…" : ""}</div>
          </div>
          <div style="text-align:right">
            <div class="sho-total">${cur()} ${o.total.toFixed(0)}</div>
            <div class="sho-time">${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
            <span class="badge b-gray" style="font-size:.56rem">${o.payMethod}</span>
          </div>
        </div>`;
          })
          .join("");

  /* Payment breakdown rows */
  const payRows =
    Object.entries(payBreak)
      .map(
        ([m, a]) =>
          `<div class="shift-pay-row"><span>${m}</span><strong>${cur()} ${a.toFixed(0)}</strong></div>`,
      )
      .join("") ||
    '<div style="font-size:.75rem;color:var(--soft);font-style:italic">No payments</div>';

  /* Top items rows */
  const topRows = topItems.length
    ? topItems
        .map(
          ([n, d]) =>
            `<div class="shift-pay-row"><span>${n} <span style="color:var(--soft);font-size:.65rem">(×${Math.round(d.qty)})</span></span><strong>${cur()} ${d.rev.toFixed(0)}</strong></div>`,
        )
        .join("")
    : '<div style="font-size:.75rem;color:var(--soft);font-style:italic">No items</div>';

  const isActive = !!CFG.activeShift;
  const headerBadge = isActive
    ? `<span class="ssh-dot active" style="width:8px;height:8px;display:inline-block;margin-right:6px;border-radius:50%"></span>Active Shift`
    : `Custom Range`;

  area.innerHTML = `
    <div class="shift-report-card">
      <div class="shift-report-header">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div class="shift-report-title">Shift Report</div>
            <div class="shift-report-period">${fmtShiftDt(shiftStart)} → ${fmtShiftDt(shiftEnd)}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span style="font-size:.65rem;opacity:.6">${headerBadge}</span>
            ${crossMidnight ? '<span style="font-size:.62rem;opacity:.5">🌙 Cross-midnight</span>' : ""}
            <span style="font-size:.62rem;opacity:.5">Duration: ${shiftDuration(shiftStart, shiftEnd)}</span>
          </div>
        </div>
      </div>

      <!-- Stats row -->
      <div class="shift-stats">
        <div class="shift-stat">
          <div class="shift-stat-n">${cur()} ${totalRev.toFixed(0)}</div>
          <div class="shift-stat-l">Revenue</div>
        </div>
        <div class="shift-stat">
          <div class="shift-stat-n">${shiftOrders.length}</div>
          <div class="shift-stat-l">Orders</div>
        </div>
        <div class="shift-stat">
          <div class="shift-stat-n">${cur()} ${avgOrder.toFixed(0)}</div>
          <div class="shift-stat-l">Avg Order</div>
        </div>
        <div class="shift-stat">
          <div class="shift-stat-n">${Math.round(totalItems)}</div>
          <div class="shift-stat-l">Items Sold</div>
        </div>
      </div>

      <!-- Payment + Top Items side by side -->
      <div class="shift-breakdown-grid">
        <div class="shift-breakdown-section">
          <div class="shift-section-label">Payment Breakdown</div>
          ${payRows}
        </div>
        <div class="shift-breakdown-section">
          <div class="shift-section-label">Top Selling Items</div>
          ${topRows}
        </div>
      </div>

      <!-- Orders list -->
      <div class="shift-orders-header">
        <span class="shift-section-label" style="margin-bottom:0">Orders in Shift (${shiftOrders.length})</span>
        ${shiftOrders.length > 0 ? `<span style="font-size:.68rem;color:var(--soft)">${cur()} ${totalRev.toFixed(0)} total</span>` : ""}
      </div>
      <div class="shift-orders-list">${orderRows}</div>
    </div>`;
}

function renderPastShifts() {
  const el = document.getElementById("past-shifts-list");
  if (!el) return;
  if (!DB.shifts || !DB.shifts.length) {
    el.innerHTML =
      '<div class="shift-no-orders">No past shifts recorded yet</div>';
    return;
  }
  el.innerHTML = [...DB.shifts]
    .reverse()
    .map((sh, idx) => {
      const s = new Date(sh.start);
      const e = sh.closedAt
        ? new Date(sh.closedAt)
        : sh.end
          ? new Date(sh.end)
          : null;
      const shiftOrders = DB.orders.filter((o) => {
        const t = new Date(o.createdAt);
        return t >= s && (!e || t <= e);
      });
      const rev = shiftOrders.reduce((sum, o) => sum + o.total, 0);
      const cross = e && s.toDateString() !== e.toDateString();
      return `<div class="past-shift-row" onclick="loadPastShift(${DB.shifts.length - 1 - idx})">
      <div class="psr-left">
        <div class="psr-date">${s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
        <div class="psr-time">${s.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} → ${e ? e.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}${cross ? ' <span style="color:var(--amber3);font-size:.6rem">+1d</span>' : ""}</div>
      </div>
      <div class="psr-right">
        <div class="psr-rev">${cur()} ${rev.toFixed(0)}</div>
        <div class="psr-orders">${shiftOrders.length} orders</div>
      </div>
    </div>`;
    })
    .join("");
}

function loadPastShift(idx) {
  const sh = DB.shifts[idx];
  if (!sh) return;
  const s = new Date(sh.start);
  const e = sh.closedAt
    ? new Date(sh.closedAt)
    : sh.end
      ? new Date(sh.end)
      : new Date();
  document.getElementById("sh-start").value = toDatetimeLocal(s);
  document.getElementById("sh-end").value = toDatetimeLocal(e);
  onShiftTimeChange();
  generateShiftReport();
  toast("Loaded past shift — " + fmtShiftDt(s), "amber");
}

function updateShiftSidebar() {
  const dot = document.getElementById("shift-dot");
  const label = document.getElementById("shift-label");
  if (!dot || !label) return;
  const active = CFG.activeShift;
  if (active) {
    dot.className = "shift-dot on";
    const s = new Date(active.start);
    label.textContent =
      "Shift: " +
      s.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } else {
    dot.className = "shift-dot";
    label.textContent = "No active shift";
  }
}

function initApp() {
  loadDB();
  tick();
  setInterval(tick, 30000);

  /* Purge stale empty tabs (no table, no items, no guest) from previous sessions
     — keep at most one blank working tab. */
  const meaningfulTabs = DB.tabs.filter(
    (t) => t.tableId || t.items.length > 0 || (t.guest && t.guest.trim()),
  );
  if (meaningfulTabs.length < DB.tabs.length) {
    DB.tabs = meaningfulTabs;
    save("tabs");
  }

  if (DB.tabs.length > 0) {
    TAB_ID = DB.tabs[DB.tabs.length - 1].id;
    KOT_PENDING = new Set();
  } else {
    const tab = startNewTab();
    TAB_ID = tab.id;
  }
  refreshPOS();
  renderDash();
  updateShiftSidebar();
  renderThemeSwatches();
}

window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  const session = LS.get("session");
  if (session?.username) {
    const found = USERS.find((u) => u.username === session.username);
    if (found) {
      CURRENT_USER = found;
      document.getElementById("login-screen").style.display = "none";
      document.getElementById("app-wrap").style.display = "flex";
      document.getElementById("user-pill-name").textContent = found.display;
      initApp();
      return;
    }
  }
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app-wrap").style.display = "none";
});
