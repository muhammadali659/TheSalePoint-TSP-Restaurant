/* ═══════════════════════════════════════════════════════
   THE SALE POINT — main.js
   Features:
   - Login / Logout with session persistence
   - 3 Themes (Dark, Light, Rose)
   - One tab per table (multiple tables can have their own tabs)
   - KOT (Kitchen Order Ticket) — print pending new items
   - SweetAlert2 replaces all alert/confirm dialogs
═══════════════════════════════════════════════════════ */

/* ── Storage ── */
const LS = {
  get: (k) => {
    try {
      return JSON.parse(localStorage.getItem("mpos3_" + k));
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem("mpos3_" + k, JSON.stringify(v));
    } catch {}
  },
};

/* ── Demo Users (extend as needed) ── */
const USERS = [
  { username: "admin", password: "admin123", role: "Admin", display: "Admin" },
  {
    username: "cashier",
    password: "cash123",
    role: "Cashier",
    display: "Cashier",
  },
  {
    username: "waiter",
    password: "wait123",
    role: "Waiter",
    display: "Waiter",
  },
];

let CURRENT_USER = null;

/* ── State ── */
let DB = { cats: [], items: [], staff: [], tables: [], orders: [], tabs: [] };
let CART = [];
let TAB_ID = null;
let ACTIVE_CAT = "all";
let PAY = "Cash";
let ORDER_NUM = 1;
let KOT_NUM = 1;
const TAX = 0.0;
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ── Temp image state ── */
let _itemImg = null;
let _catImg = null;

/* ── Pending KOT items (cart item ids not yet KOT-printed) ── */
let KOT_PENDING = new Set(); // set of cart item IDs added since last KOT

/* ── Category color helpers ── */
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

/* ── SVG placeholders ── */
const SVGS = {
  Starters: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="14" r="7" stroke="#94A3B8" stroke-width="1.4"/><path d="M9 32c0-6 5-10 11-10s11 4 11 10" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/><path d="M17 10h6M20 7v6" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  Mains: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="22" r="12" stroke="#94A3B8" stroke-width="1.4"/><path d="M8 22h24M20 10v4M13 15l2.5 2.5M27 15l-2.5 2.5" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  Grill: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="8" y="18" width="24" height="12" rx="3" stroke="#94A3B8" stroke-width="1.4"/><path d="M8 18h24M12 30v5M28 30v5M14 11c0-2 2-3 2-5M20 11c0-2 2-3 2-5M26 11c0-2 2-3 2-5" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  Pasta: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M10 26c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/><path d="M6 26h28" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/><path d="M12 26c0 4.4 3.6 7 8 7s8-2.6 8-7" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/><path d="M17 16c0-3 2-5 3-7M21 16c0-3 2-5 3-7" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  Desserts: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 6c-5.5 0-10 4.5-10 10 0 4.6 3 8.5 7.2 9.7L15 32h10l-2.2-6.3C26.9 24.5 30 20.6 30 16c0-5.5-4.5-10-10-10z" stroke="#94A3B8" stroke-width="1.4"/><path d="M17 32h6" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/><circle cx="20" cy="16" r="2.5" stroke="#94A3B8" stroke-width="1.4"/></svg>`,
  Beverages: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M14 10l3.5 20h5l3.5-20H14z" stroke="#94A3B8" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 10h16M17 18h6" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/><path d="M19 5c0 0 0 3-3 3" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  default: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="13" stroke="#94A3B8" stroke-width="1.4" stroke-dasharray="3 3"/><circle cx="20" cy="20" r="4" stroke="#94A3B8" stroke-width="1.4"/></svg>`,
};
function getSVG(catName) {
  return SVGS[catName] || SVGS.default;
}

/* ═══════════════════════════
   LOGIN / LOGOUT
═══════════════════════════ */
function togglePw() {
  const inp = document.getElementById("l-pass");
  const tog = document.getElementById("pw-tog");
  if (inp.type === "password") {
    inp.type = "text";
    tog.textContent = "🙈";
  } else {
    inp.type = "password";
    tog.textContent = "👁";
  }
}

function doLogin(e) {
  e.preventDefault();
  const user = document.getElementById("l-user").value.trim();
  const pass = document.getElementById("l-pass").value;
  const errEl = document.getElementById("login-error");
  const btn = document.getElementById("login-btn");

  // Clear errors
  document.getElementById("l-user-e").classList.remove("show");
  document.getElementById("l-pass-e").classList.remove("show");
  document.getElementById("l-user").classList.remove("invalid");
  document.getElementById("l-pass").classList.remove("invalid");
  errEl.style.display = "none";

  let ok = true;
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
    errEl.style.display = "block";
    document.getElementById("l-pass").classList.add("invalid");
    return;
  }

  // Success — animate button
  btn.textContent = "✓ Welcome!";
  btn.style.opacity = ".85";
  CURRENT_USER = found;
  LS.set("session", {
    username: found.username,
    role: found.role,
    display: found.display,
  });

  setTimeout(() => {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app-wrap").style.display = "flex";
    document.getElementById("user-pill-name").textContent = found.display;
    initApp();
  }, 500);
}

function doLogout() {
  Swal.fire({
    title: "Sign Out?",
    text: "You'll be returned to the login screen.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sign Out",
    cancelButtonText: "Stay",
    reverseButtons: true,
  }).then((r) => {
    if (r.isConfirmed) {
      LS.set("session", null);
      CURRENT_USER = null;
      document.getElementById("app-wrap").style.display = "none";
      document.getElementById("login-screen").style.display = "flex";
      document.getElementById("l-user").value = "";
      document.getElementById("l-pass").value = "";
      document.getElementById("login-btn").textContent = "Sign In";
      document.getElementById("login-btn").style.opacity = "";
    }
  });
}

function setLoginTheme(theme, btn) {
  document
    .querySelectorAll(".ltheme-btn")
    .forEach((b) => b.classList.remove("on"));
  btn.classList.add("on");
  applyTheme(theme);
}

/* ═══════════════════════════
   SEED DATA
═══════════════════════════ */
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
function seedItems(cats) {
  const gc = (n) => (cats.find((c) => c.name === n) || cats[0]).id;
  return [
    {
      id: uid(),
      name: "Burrata Caprese",
      catId: gc("Starters"),
      price: 650,
      status: "on",
      desc: "Heirloom tomato, aged balsamic",
      img: null,
    },
    {
      id: uid(),
      name: "Scallop Ceviche",
      catId: gc("Starters"),
      price: 850,
      status: "on",
      desc: "Lime & coconut leche de tigre",
      img: null,
    },
    {
      id: uid(),
      name: "Truffle Arancini",
      catId: gc("Starters"),
      price: 750,
      status: "on",
      desc: "Black truffle, parmesan foam",
      img: null,
    },
    {
      id: uid(),
      name: "Chicken Karahi",
      catId: gc("Mains"),
      price: 1200,
      status: "on",
      desc: "Slow-cooked, desi spices",
      img: null,
    },
    {
      id: uid(),
      name: "Mutton Nihari",
      catId: gc("Mains"),
      price: 1400,
      status: "on",
      desc: "Slow cooked overnight, garnished",
      img: null,
    },
    {
      id: uid(),
      name: "Prawn Biryani",
      catId: gc("Mains"),
      price: 1600,
      status: "on",
      desc: "Jumbo prawns, saffron rice",
      img: null,
    },
    {
      id: uid(),
      name: "Seekh Kabab",
      catId: gc("Grill"),
      price: 950,
      status: "on",
      desc: "Minced beef, charcoal grilled",
      img: null,
    },
    {
      id: uid(),
      name: "Beef Boti",
      catId: gc("Grill"),
      price: 1100,
      status: "on",
      desc: "Marinated tender beef cubes",
      img: null,
    },
    {
      id: uid(),
      name: "Mix Grill Platter",
      catId: gc("Grill"),
      price: 2200,
      status: "on",
      desc: "4-skewer platter with raita",
      img: null,
    },
    {
      id: uid(),
      name: "Peshwari Pasta",
      catId: gc("Pasta"),
      price: 850,
      status: "on",
      desc: "Cream sauce, desi twist",
      img: null,
    },
    {
      id: uid(),
      name: "Tagliatelle Tartufo",
      catId: gc("Pasta"),
      price: 1100,
      status: "on",
      desc: "Black truffle, egg yolk",
      img: null,
    },
    {
      id: uid(),
      name: "Gulab Jamun",
      catId: gc("Desserts"),
      price: 350,
      status: "on",
      desc: "Warm syrup, rose cardamom",
      img: null,
    },
    {
      id: uid(),
      name: "Chocolate Fondant",
      catId: gc("Desserts"),
      price: 550,
      status: "on",
      desc: "Valrhona 70%, salted caramel",
      img: null,
    },
    {
      id: uid(),
      name: "Rooh Afza Shake",
      catId: gc("Beverages"),
      price: 280,
      status: "on",
      desc: "Chilled, creamy",
      img: null,
    },
    {
      id: uid(),
      name: "Green Tea",
      catId: gc("Beverages"),
      price: 150,
      status: "on",
      desc: "Premium green leaves",
      img: null,
    },
    {
      id: uid(),
      name: "Doodh Patti",
      catId: gc("Beverages"),
      price: 120,
      status: "on",
      desc: "Strong Pakistani chai",
      img: null,
    },
    {
      id: uid(),
      name: "Fresh Lemonade",
      catId: gc("Beverages"),
      price: 220,
      status: "on",
      desc: "Mint, lemon, chilled soda",
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
    { id: uid(), name: "Table 3", seats: 4, status: "busy" },
    { id: uid(), name: "Table 4", seats: 6, status: "avail" },
    { id: uid(), name: "Table 5", seats: 2, status: "rsrvd" },
    { id: uid(), name: "Table 6", seats: 8, status: "avail" },
    { id: uid(), name: "Bar 1", seats: 2, status: "avail" },
    { id: uid(), name: "Bar 2", seats: 2, status: "avail" },
    { id: uid(), name: "VIP Room", seats: 12, status: "clean" },
  ];
}

function loadDB() {
  DB.cats = LS.get("cats") || null;
  DB.items = LS.get("items") || null;
  DB.staff = LS.get("staff") || null;
  DB.tables = LS.get("tables") || null;
  DB.orders = LS.get("orders") || [];
  DB.tabs = LS.get("tabs") || [];
  if (!DB.cats) {
    DB.cats = seedCats();
    LS.set("cats", DB.cats);
  }
  if (!DB.items) {
    DB.items = seedItems(DB.cats);
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
  ORDER_NUM = DB.orders.length
    ? Math.max(...DB.orders.map((o) => o.num || 1)) + 1
    : 1;
  KOT_NUM = LS.get("kot_num") || 1;
}
const save = (k) => LS.set(k, DB[k]);

/* ═══════════════════════════
   THEME
═══════════════════════════ */
function initTheme() {
  applyTheme(LS.get("theme") || "dark");
}
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  LS.set("theme", t);
  // Highlight active theme btn in sidebar
  document
    .querySelectorAll(".theme-btn")
    .forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-theme") === t),
    );
  // Highlight login theme btns
  document
    .querySelectorAll(".ltheme-btn")
    .forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-theme") === t),
    );
}

/* ═══════════════════════════
   TOAST
═══════════════════════════ */
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

/* ═══════════════════════════
   SWAL HELPERS
═══════════════════════════ */
function swalConfirm(title, text, confirmTxt = "Yes", icon = "warning") {
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmTxt,
    cancelButtonText: "Cancel",
    reverseButtons: true,
  }).then((r) => r.isConfirmed);
}

/* ═══════════════════════════
   MODAL
═══════════════════════════ */
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

/* ═══════════════════════════
   NAVIGATION
═══════════════════════════ */
const PAGE_INFO = {
  pos: ["New Order", "Select dishes and build the order"],
  tabs: ["Open Tabs", "All unconfirmed orders — one per table"],
  tables: ["Table Map", "Manage seating and availability"],
  master: ["Manage", "Menu items, categories & staff"],
  orders: ["Order History", "All completed transactions"],
  dash: ["Dashboard", "Sales performance & analytics"],
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
    const pm = { items: "items", cats: "cats", staff: "staff" };
    document.getElementById("mp-" + pm[page]).classList.add("on");
    document
      .querySelectorAll(".m-tab")
      [["items", "cats", "staff"].indexOf(page)].classList.add("on");
  } else if (page === "orders") renderHistory();
  else if (page === "dash") renderDash();
}
function swMTab(panel, btn) {
  document
    .querySelectorAll(".m-panel")
    .forEach((p) => p.classList.remove("on"));
  document.querySelectorAll(".m-tab").forEach((b) => b.classList.remove("on"));
  document.getElementById("mp-" + panel).classList.add("on");
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

/* ═══════════════════════════
   IMAGE UPLOAD WIDGET
═══════════════════════════ */
function buildImgWidget(containerId, currentSrc, onLoadCb) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  if (currentSrc) {
    wrap.innerHTML = `<div class="img-preview-box"><img src="${currentSrc}" alt="Preview"/><button class="img-rm-btn" type="button" onclick="rmImg('${containerId}',${JSON.stringify(onLoadCb)})">✕</button></div>`;
  } else {
    wrap.innerHTML = `<label class="img-zone"><div class="img-zone-ico">🖼</div><div class="img-zone-lbl">Click to upload photo</div><input type="file" accept="image/*" onchange="loadImg(this,'${containerId}',${JSON.stringify(onLoadCb)})"/></label>`;
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

/* ═══════════════════════════
   CATEGORIES CRUD
═══════════════════════════ */
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
  const id = document.getElementById("fc-id").value;
  const name = document.getElementById("fc-name").value.trim();
  const tag = document.getElementById("fc-tag").value;
  const img = _catImg;
  if (!name) {
    fErr("fc-name", "fc-name-e");
    return;
  }
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
    "This will not delete its items.",
    "Delete",
    "warning",
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
      const imgHtml = c.img
        ? `<div style="width:38px;height:38px;border-radius:8px;overflow:hidden;border:1px solid var(--border)"><img src="${c.img}" style="width:100%;height:100%;object-fit:cover"/></div>`
        : `<div style="width:38px;height:38px;border-radius:8px;background:var(--mist);border:1px solid var(--border);display:flex;align-items:center;justify-content:center">${getSVG(c.name)}</div>`;
      return `<tr><td>${imgHtml}</td><td><strong style="font-family:var(--ff-display)">${c.name}</strong></td><td><span class="badge ${TAG_CLASS[c.tag] || "b-gray"}">${c.tag}</span></td><td><span class="badge b-amber">${cnt}</span></td><td><div class="dt-acts"><button class="btn btn-sm btn-ghost" onclick="openCatModal('${c.id}')">Edit</button><button class="btn btn-sm btn-red" onclick="delCat('${c.id}')">✕</button></div></td></tr>`;
    })
    .join("");
}

/* ═══════════════════════════
   ITEMS CRUD
═══════════════════════════ */
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
  document.getElementById("mo-item-title").textContent = id
    ? "Edit Dish"
    : "Add Dish";
  const it = id ? DB.items.find((x) => x.id === id) || {} : {};
  document.getElementById("fi-id").value = it.id || "";
  document.getElementById("fi-name").value = it.name || "";
  document.getElementById("fi-cat").value = it.catId || "";
  document.getElementById("fi-price").value = it.price || "";
  document.getElementById("fi-desc").value = it.desc || "";
  document.getElementById("fi-status").value = it.status || "on";
  _itemImg = it.img || null;
  buildImgWidget("item-img-wrap", _itemImg, "setItemImg");
  openMo("mo-item");
}
function saveItem() {
  clrErr("mo-item");
  const id = document.getElementById("fi-id").value;
  const name = document.getElementById("fi-name").value.trim();
  const catId = document.getElementById("fi-cat").value;
  const price = parseFloat(document.getElementById("fi-price").value);
  const desc = document.getElementById("fi-desc").value.trim();
  const status = document.getElementById("fi-status").value;
  const img = _itemImg;
  let ok = true;
  if (!name) {
    fErr("fi-name", "fi-name-e");
    ok = false;
  }
  if (!catId) {
    fErr("fi-cat", "fi-cat-e");
    ok = false;
  }
  if (isNaN(price) || price < 0) {
    fErr("fi-price", "fi-price-e");
    ok = false;
  }
  if (!ok) return;
  if (id) {
    const i = DB.items.findIndex((x) => x.id === id);
    if (i > -1) DB.items[i] = { id, name, catId, price, desc, status, img };
    toast("Dish updated", "amber");
  } else {
    DB.items.push({ id: uid(), name, catId, price, desc, status, img });
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
    "warning",
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
      '<tr class="dt-empty"><td colspan="6">No items found</td></tr>';
    return;
  }
  tb.innerHTML = list
    .map((it) => {
      const cat = DB.cats.find((c) => c.id === it.catId) || {
        name: "—",
        tag: "gray",
      };
      const imgHtml = it.img
        ? `<div style="width:44px;height:44px;border-radius:9px;overflow:hidden;border:1px solid var(--border)"><img src="${it.img}" style="width:100%;height:100%;object-fit:cover"/></div>`
        : `<div style="width:44px;height:44px;border-radius:9px;background:var(--mist);border:1px solid var(--border);display:flex;align-items:center;justify-content:center">${getSVG(cat.name)}</div>`;
      return `<tr><td>${imgHtml}</td><td><div><div style="font-family:var(--ff-display);font-size:.93rem">${it.name}</div><div style="font-size:.67rem;color:var(--soft)">${it.desc || ""}</div></div></td><td><span class="badge ${TAG_CLASS[cat.tag] || "b-gray"}">${cat.name}</span></td><td style="font-family:var(--ff-display);font-size:.95rem;color:var(--amber3)">RS ${Number(it.price).toFixed(0)}</td><td><span class="badge ${it.status === "on" ? "b-green" : "b-red"}">${it.status === "on" ? "Available" : "86'd"}</span></td><td><div class="dt-acts"><button class="btn btn-sm btn-ghost" onclick="openItemModal('${it.id}')">Edit</button><button class="btn btn-sm btn-red" onclick="delItem('${it.id}')">✕</button></div></td></tr>`;
    })
    .join("");
}

/* ═══════════════════════════
   STAFF CRUD
═══════════════════════════ */
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
    phone = document.getElementById("fs-phone").value.trim();
  const status = document.getElementById("fs-status").value;
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
  const ok = await swalConfirm("Remove Staff Member?", "", "Remove", "warning");
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

/* ═══════════════════════════
   TABLES CRUD
═══════════════════════════ */
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
  syncTable();
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
        ? `<div class="tbl-open" style="display:block">Tab open · ${openTab.items.reduce((s, i) => s + i.qty, 0)} items</div>`
        : "";
      return `<div class="tbl ${t.status}">
      <div class="tbl-icon">${TBL_ICO[t.status] || "🪑"}</div>
      <div class="tbl-name">${t.name}</div>
      <div class="tbl-seats">${t.seats} seats</div>
      <div class="tbl-st">${TBL_LBL[t.status]}</div>
      ${openInfo}
      <div class="tbl-acts">
        ${openTab ? `<button class="tbl-act" onclick="switchTab('${openTab.id}');nav('pos')">Open Tab</button>` : ""}
        <button class="tbl-act" onclick="setTblStatus('${t.id}','avail')">Free</button>
        <button class="tbl-act" onclick="setTblStatus('${t.id}','busy')">Busy</button>
        <button class="tbl-act" onclick="openTblModal('${t.id}')">Edit</button>
      </div>
    </div>`;
    })
    .join("");
}
function syncTable() {
  const sel = document.getElementById("f-table"),
    cur = sel.value;
  // Mark tables that already have an open tab (excluding the current tab's table)
  const tab = DB.tabs.find((t) => t.id === TAB_ID);
  const currentTabTableId = tab ? tab.tableId : "";
  sel.innerHTML =
    '<option value="">Takeaway</option>' +
    DB.tables
      .map((t) => {
        const existingTab = DB.tabs.find(
          (tb) => tb.tableId === t.id && tb.id !== TAB_ID,
        );
        const blocked = existingTab ? " (Tab open)" : "";
        const disabled = existingTab ? "disabled" : "";
        const selected = t.id === cur ? "selected" : "";
        return `<option value="${t.id}" ${selected} ${disabled}>${t.name}${blocked} (${TBL_LBL[t.status]})</option>`;
      })
      .join("");
}

/* ═══════════════════════════
   TABLE-SCOPED TAB SYSTEM
   One tab per table max.
   Multiple tables = multiple tabs.
═══════════════════════════ */
function getOrCreateTab() {
  if (TAB_ID) {
    const t = DB.tabs.find((t) => t.id === TAB_ID);
    if (t) return t;
  }
  const tab = {
    id: uid(),
    createdAt: new Date().toISOString(),
    guest: "",
    tableId: "",
    tableName: "",
    staffId: "",
    staffName: "",
    items: [],
    note: "",
    payment: "Cash",
    kotCount: 0,
  };
  DB.tabs.push(tab);
  save("tabs");
  return tab;
}

function loadTab(tab) {
  TAB_ID = tab.id;
  CART = [...tab.items];
  KOT_PENDING = new Set(); // reset pending on tab switch
  document.getElementById("f-guest").value = tab.guest || "";
  document.getElementById("f-table").value = tab.tableId || "";
  document.getElementById("f-server").value = tab.staffId || "";
  document.getElementById("f-note").value = tab.note || "";
  document.getElementById("f-disc").value = "";
  document.getElementById("op-ref").textContent =
    "Tab: " + tab.id.slice(-8).toUpperCase();
  document
    .querySelectorAll(".pay-btn")
    .forEach((b) =>
      b.classList.toggle(
        "on",
        b.getAttribute("data-pay") === (tab.payment || "Cash"),
      ),
    );
  PAY = tab.payment || "Cash";
  renderCart();
  syncBadge();
  renderTabsStrip();
  updateKotBtn();
}

function persistTab() {
  if (!TAB_ID) return;
  const tab = DB.tabs.find((t) => t.id === TAB_ID);
  if (!tab) return;
  tab.items = [...CART];
  tab.guest = document.getElementById("f-guest").value.trim();
  tab.staffId = document.getElementById("f-server").value;
  tab.note = document.getElementById("f-note").value.trim();
  tab.payment = PAY;
  // TABLE SCOPING — prevent double-assignment
  const chosenTable = document.getElementById("f-table").value;
  if (chosenTable && chosenTable !== tab.tableId) {
    // Check if another tab already uses this table
    const conflict = DB.tabs.find(
      (tb) => tb.tableId === chosenTable && tb.id !== TAB_ID,
    );
    if (conflict) {
      Swal.fire({
        title: "Table Already Occupied",
        text: `${DB.tables.find((t) => t.id === chosenTable)?.name || "This table"} already has an open tab. Switch to that tab or choose another table.`,
        icon: "warning",
        confirmButtonText: "OK",
      });
      document.getElementById("f-table").value = tab.tableId; // revert
    } else {
      tab.tableId = chosenTable;
    }
  } else if (!chosenTable) {
    tab.tableId = "";
  }
  const tbl = DB.tables.find((t) => t.id === tab.tableId);
  tab.tableName = tbl ? tbl.name : "Takeaway";
  const srv = DB.staff.find((s) => s.id === tab.staffId);
  tab.staffName = srv ? srv.name : "—";
  save("tabs");
  renderTabsStrip();
}

function onTblChange() {
  const chosenTable = document.getElementById("f-table").value;
  if (!chosenTable) return;
  const conflict = DB.tabs.find(
    (tb) => tb.tableId === chosenTable && tb.id !== TAB_ID,
  );
  if (conflict) {
    Swal.fire({
      title: "Table Already Has an Open Tab",
      html: `<b>${DB.tables.find((t) => t.id === chosenTable)?.name || "This table"}</b> already has an open tab.<br>Would you like to switch to it?`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Switch to That Tab",
      cancelButtonText: "Keep Current",
    }).then((r) => {
      if (r.isConfirmed) {
        switchTab(conflict.id);
        nav("pos");
      } else {
        document.getElementById("f-table").value =
          DB.tabs.find((t) => t.id === TAB_ID)?.tableId || "";
      }
    });
  }
}

function switchTab(tabId) {
  persistTab();
  const t = DB.tabs.find((x) => x.id === tabId);
  if (t) loadTab(t);
}
function killTab(tabId) {
  DB.tabs = DB.tabs.filter((t) => t.id !== tabId);
  save("tabs");
  if (TAB_ID === tabId) {
    if (DB.tabs.length > 0) loadTab(DB.tabs[DB.tabs.length - 1]);
    else {
      TAB_ID = null;
      CART = [];
      KOT_PENDING = new Set();
      const nt = getOrCreateTab();
      TAB_ID = nt.id;
      loadTab(nt);
    }
  }
  renderTabsStrip();
  renderOpenTabs();
}

function renderTabsStrip() {
  const area = document.getElementById("tabs-chips");
  const pill = document.getElementById("tabs-pill");
  const n = document.getElementById("tabs-pill-n");
  const nb = document.getElementById("tabs-n");
  const cnt = DB.tabs.length;
  nb.textContent = cnt;
  nb.style.display = cnt ? "flex" : "none";
  n.textContent = cnt;
  pill.style.display = cnt > 0 ? "flex" : "none";
  if (!DB.tabs.length) {
    area.innerHTML =
      '<span style="font-size:.69rem;color:rgba(255,255,255,.25);font-style:italic">No open tabs</span>';
    return;
  }
  area.innerHTML = DB.tabs
    .map((tab) => {
      const lbl =
        tab.tableName && tab.tableName !== "Takeaway"
          ? tab.tableName
          : tab.guest
            ? tab.guest.split(" ")[0]
            : "Tab " + tab.id.slice(-4).toUpperCase();
      const c = tab.items.reduce((s, i) => s + i.qty, 0);
      return `<div class="tab-chip ${tab.id === TAB_ID ? "active" : ""}" onclick="switchTab('${tab.id}');nav('pos')">${lbl}${c ? ` <span style="opacity:.55">(${c})</span>` : ""}</div>`;
    })
    .join("");
}

/* ═══════════════════════════
   CART
═══════════════════════════ */
function buildCatBar() {
  const bar = document.getElementById("cat-bar");
  bar.innerHTML =
    `<button class="cat-btn ${ACTIVE_CAT === "all" ? "on" : ""}" onclick="filterCat('all')">All Dishes</button>` +
    DB.cats
      .map((c) => {
        const thumb = c.img
          ? `<span class="cat-thumb"><img src="${c.img}" alt="${c.name}"/></span>`
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
        <div class="mc-price"><span class="cur">RS </span>${Number(it.price).toFixed(0)}</div>
      </div>
      <div class="flash-ring"></div>
    </div>`;
    })
    .join("");
}

function addToCart(itemId, el) {
  const item = DB.items.find((i) => i.id === itemId);
  if (!item || item.status === "off") return;
  if (!TAB_ID) {
    const tab = getOrCreateTab();
    TAB_ID = tab.id;
  }
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 400);
  const ex = CART.find((c) => c.itemId === itemId);
  if (ex) {
    ex.qty++;
    KOT_PENDING.add(ex.id); // mark as having new qty — track by id
  } else {
    const cat = DB.cats.find((c) => c.id === item.catId) || { name: "" };
    const newCI = {
      id: uid(),
      itemId,
      name: item.name,
      price: item.price,
      qty: 1,
      img: item.img,
      catName: cat.name,
      kotSent: false,
    };
    CART.push(newCI);
    KOT_PENDING.add(newCI.id);
  }
  persistTab();
  renderCart();
  syncBadge();
  updateKotBtn();
}

function adjQty(cid, d) {
  const i = CART.findIndex((c) => c.id === cid);
  if (i < 0) return;
  CART[i].qty += d;
  if (CART[i].qty <= 0) {
    KOT_PENDING.delete(cid);
    CART.splice(i, 1);
  } else if (d > 0) KOT_PENDING.add(cid);
  persistTab();
  renderCart();
  syncBadge();
  updateKotBtn();
}
function rmCI(cid) {
  CART = CART.filter((c) => c.id !== cid);
  KOT_PENDING.delete(cid);
  persistTab();
  renderCart();
  syncBadge();
  updateKotBtn();
}
async function clearOrder() {
  if (!CART.length) return;
  const ok = await swalConfirm(
    "Clear This Order?",
    "All items will be removed.",
    "Clear",
    "warning",
  );
  if (!ok) return;
  CART = [];
  KOT_PENDING = new Set();
  persistTab();
  renderCart();
  syncBadge();
  updateKotBtn();
}
function syncBadge() {
  const n = CART.reduce((s, i) => s + i.qty, 0),
    el = document.getElementById("cart-n");
  el.style.display = n ? "flex" : "none";
  el.textContent = n;
}
function selPay(btn) {
  document
    .querySelectorAll(".pay-btn")
    .forEach((b) => b.classList.remove("on"));
  btn.classList.add("on");
  PAY = btn.getAttribute("data-pay");
  persistTab();
}

function renderCart() {
  const area = document.getElementById("cart-area"),
    tots = document.getElementById("op-totals");
  const kotBar = document.getElementById("kot-status-bar");
  if (!CART.length) {
    area.innerHTML = `<div class="cart-empty-state"><div class="ces-icon"><svg width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="17" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3"/><path d="M12 24c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="14.5" cy="15.5" r="1.5" fill="currentColor"/><circle cx="21.5" cy="15.5" r="1.5" fill="currentColor"/></svg></div><div class="ces-text">Tap a dish to begin</div></div>`;
    tots.style.display = "none";
    kotBar.style.display = "none";
    return;
  }
  area.innerHTML = CART.map((c, i) => {
    const imgEl = c.img
      ? `<img src="${c.img}" alt=""/>`
      : `${getSVG(c.catName || "").replace('width="40" height="40"', 'width="22" height="22"')}`;
    const isPending = KOT_PENDING.has(c.id);
    const kotDot = `<div class="ci-kot-dot ${isPending ? "pending" : "sent"}" title="${isPending ? "Pending KOT" : "KOT Sent"}"></div>`;
    return `${i > 0 ? '<div class="ci-sep"></div>' : ""}<div class="ci"><div class="ci-img">${imgEl}</div><div class="ci-info"><div class="ci-name">${c.name}</div><div class="ci-unit">RS ${c.price.toFixed(0)} each</div></div>${kotDot}<div class="qty-row"><button class="qb" onclick="adjQty('${c.id}',-1)">−</button><span class="qv">${c.qty}</span><button class="qb" onclick="adjQty('${c.id}',1)">+</button></div><span class="ci-total">RS ${(c.price * c.qty).toFixed(0)}</span><button class="ci-del" onclick="rmCI('${c.id}')">✕</button></div>`;
  }).join("");
  tots.style.display = "block";
  recalc();
  // KOT status bar
  const pendingCount = KOT_PENDING.size;
  if (pendingCount > 0) {
    kotBar.style.display = "flex";
    document.getElementById("kot-pending-n").textContent =
      pendingCount + " new item" + (pendingCount !== 1 ? "s" : "");
  } else {
    kotBar.style.display = "none";
  }
}

function recalc() {
  const disc = parseFloat(document.getElementById("f-disc").value) || 0;
  const sub = CART.reduce((s, i) => s + i.price * i.qty, 0);
  const da = Math.min(disc, sub),
    tax = (sub - da) * TAX,
    grand = sub - da + tax;
  document.getElementById("t-sub").textContent = "RS " + sub.toFixed(0);
  document.getElementById("t-tax").textContent = "RS " + tax.toFixed(0);
  document.getElementById("t-total").textContent = "RS " + grand.toFixed(0);
  const dr = document.getElementById("t-disc-row");
  if (da > 0) {
    dr.style.display = "flex";
    document.getElementById("t-disc").textContent = "-RS " + da.toFixed(0);
  } else dr.style.display = "none";
  return { sub, da, tax, grand };
}

function saveTab() {
  if (!CART.length && !document.getElementById("f-guest").value.trim()) {
    Swal.fire({
      title: "Empty Tab",
      text: "Add at least one item or a customer name first.",
      icon: "info",
      confirmButtonText: "OK",
    });
    return;
  }
  persistTab();
  toast("Tab saved — add more items anytime", "amber");
  renderTabsStrip();
}

/* ═══════════════════════════
   KOT — Kitchen Order Ticket
═══════════════════════════ */
function updateKotBtn() {
  const btn = document.getElementById("kot-btn");
  if (KOT_PENDING.size > 0) btn.classList.add("has-items");
  else btn.classList.remove("has-items");
}

function printKOT() {
  if (!CART.length) {
    Swal.fire({
      title: "No Items",
      text: "Add items to the order first.",
      icon: "info",
      confirmButtonText: "OK",
    });
    return;
  }
  // Build KOT for all pending items (new items not yet KOT-printed)
  const pendingItems =
    KOT_PENDING.size > 0 ? CART.filter((c) => KOT_PENDING.has(c.id)) : CART; // If nothing pending, show all items

  const tab = DB.tabs.find((t) => t.id === TAB_ID);
  const tableName =
    tab?.tableName ||
    document.getElementById("f-table").options[
      document.getElementById("f-table").selectedIndex
    ]?.text ||
    "Takeaway";
  const serverName =
    DB.staff.find((s) => s.id === document.getElementById("f-server").value)
      ?.name || "—";
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const kotHtml = buildKOTHtml({
    kotNum: KOT_NUM,
    table: tableName,
    server: serverName,
    time: timeStr,
    date: dateStr,
    items: pendingItems,
    isPartial: KOT_PENDING.size > 0 && KOT_PENDING.size < CART.length,
  });

  document.getElementById("kot-area").innerHTML = kotHtml;
  openMo("mo-kot");
}

function buildKOTHtml({ kotNum, table, server, time, date, items, isPartial }) {
  const rows = items
    .map(
      (i) =>
        `<div class="kot-item new">
      <span class="kot-item-name">${i.name} <span class="new-badge">NEW</span></span>
      <span class="kot-item-qty">×${i.qty}</span>
    </div>`,
    )
    .join("");

  return `<div class="kot-print">
    <div class="kot-header">
      <div class="kot-title">Kitchen Order Ticket</div>
      <div class="kot-sub">The Sale Point POS</div>
    </div>
    <div class="kot-meta">
      <div class="kot-meta-row"><span>KOT #</span><strong>${kotNum}</strong></div>
      <div class="kot-meta-row"><span>Table</span><strong>${table}</strong></div>
      <div class="kot-meta-row"><span>Server</span><strong>${server}</strong></div>
      <div class="kot-meta-row"><span>Time</span><strong>${time}</strong></div>
      <div class="kot-meta-row"><span>Date</span><strong>${date}</strong></div>
      ${isPartial ? `<div class="kot-meta-row"><span>Type</span><strong style="color:#F59E0B">ADD-ON ORDER</strong></div>` : ""}
    </div>
    <div class="kot-items-head"><span>Item</span><span>Qty</span></div>
    ${rows}
    <div class="kot-footer">
      <div class="kot-footer-txt">Please prepare immediately</div>
      <div class="kot-num">${date} · ${time}</div>
    </div>
  </div>`;
}

function doPrintKOT() {
  // Mark pending items as KOT-sent
  KOT_PENDING.forEach((id) => {
    const ci = CART.find((c) => c.id === id);
    if (ci) ci.kotSent = true;
  });
  KOT_PENDING = new Set();

  // Increment KOT number
  KOT_NUM++;
  LS.set("kot_num", KOT_NUM);

  // Update tab kotCount
  const tab = DB.tabs.find((t) => t.id === TAB_ID);
  if (tab) {
    tab.kotCount = (tab.kotCount || 0) + 1;
    save("tabs");
  }

  // Print
  document.getElementById("print-zone").innerHTML =
    document.getElementById("kot-area").innerHTML;
  window.print();

  closeMo("mo-kot");
  persistTab();
  renderCart();
  updateKotBtn();
  toast("KOT printed successfully", "ok");
}

/* ═══════════════════════════
   OPEN TABS PAGE
═══════════════════════════ */
function renderOpenTabs() {
  const g = document.getElementById("tabs-grid");
  const open = DB.tabs.filter((t) => t.items.length > 0 || t.guest);
  if (!open.length) {
    g.innerHTML =
      '<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--soft);font-family:var(--ff-display);font-size:1.1rem;font-style:italic">No open tabs — all bills settled</div>';
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
          return `<div class="ot-item"><div class="ot-item-img">${imgEl}</div><span class="ot-item-name">${i.name}</span><span class="ot-item-qty">×${i.qty}</span><span class="ot-item-price">RS ${(i.price * i.qty).toFixed(0)}</span></div>`;
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
        <div>
          <div class="ot-tag">${tab.tableName || "Takeaway"}${tab.staffName && tab.staffName !== "—" ? " · " + tab.staffName : ""}</div>
          <div class="ot-meta">${meta}</div>
        </div>
        <div style="display:flex;gap:5px;align-items:center">
          <span class="badge ${isCur ? "b-amber" : "b-gray"}">${isCur ? "Active" : "Open"}</span>
          <button class="btn btn-sm btn-red" onclick="killTab('${tab.id}')">✕</button>
        </div>
      </div>
      <div class="ot-items">${rows || '<div style="font-size:.77rem;color:var(--soft);padding:10px 0;font-style:italic">No items yet</div>'}</div>
      <div class="ot-foot">
        <div><div class="ot-total-l">Running Total</div><div class="ot-total-n">RS ${tot.toFixed(0)}</div></div>
        <div class="ot-actions">
          <button class="btn btn-sm btn-outline" onclick="switchTab('${tab.id}');nav('pos')">+ Add Items</button>
          <button class="btn btn-sm btn-amber" onclick="switchTab('${tab.id}');nav('pos');setTimeout(()=>confirmOrder(),400)">Bill</button>
        </div>
      </div>
    </div>`;
    })
    .join("");
}

/* ═══════════════════════════
   CONFIRM & BILL
═══════════════════════════ */
async function confirmOrder() {
  persistTab();
  const tab = DB.tabs.find((t) => t.id === TAB_ID);
  if (!tab || !tab.items.length) {
    Swal.fire({
      title: "Empty Order",
      text: "No items in this order.",
      icon: "warning",
      confirmButtonText: "OK",
    });
    return;
  }
  // Warn if there are unprinted KOT items
  if (KOT_PENDING.size > 0) {
    const res = await Swal.fire({
      title: "Unprinted KOT Items",
      text: `There are ${KOT_PENDING.size} item(s) not yet sent to kitchen. Print KOT before closing?`,
      icon: "warning",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Print KOT First",
      denyButtonText: "Close Without KOT",
      cancelButtonText: "Cancel",
    });
    if (res.isConfirmed) {
      printKOT();
      return;
    }
    if (res.isDismissed) return;
  }
  const { sub, da, tax, grand } = recalc();
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
    discount: da,
    tax,
    total: grand,
    payMethod: PAY,
    note: tab.note,
  };
  DB.orders.push(order);
  save("orders");
  ORDER_NUM++;
  if (tab.tableId) setTblStatus(tab.tableId, "avail"); // Free the table
  DB.tabs = DB.tabs.filter((t) => t.id !== tab.id);
  save("tabs");
  document.getElementById("rcpt-area").innerHTML = buildRcpt(order);
  openMo("mo-rcpt");
  toast("Order #" + order.num + " confirmed ✦", "amber");
  TAB_ID = null;
  CART = [];
  KOT_PENDING = new Set();
  const nt = getOrCreateTab();
  TAB_ID = nt.id;
  renderCart();
  syncBadge();
  renderTabsStrip();
  updateKotBtn();
  refreshPOS();
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
      return `<div class="rcpt-item"><div class="rcpt-item-img">${imgEl}</div><span class="rcpt-item-name">${i.name}</span><span class="rcpt-item-qty">×${i.qty}</span><span class="rcpt-item-amt">RS ${(i.price * i.qty).toFixed(0)}</span></div>`;
    })
    .join("");
  return `<div class="rcpt"><div class="rcpt-top"><div class="rcpt-logo">The Sale Point</div><div class="rcpt-sub">Restaurant POS</div><hr class="rcpt-hr"/><div class="rcpt-oid">Order #${o.num} · ${o.id.toUpperCase().slice(0, 10)}</div></div><div class="rcpt-body"><div class="rcpt-meta"><div class="rcpt-mr"><span>Date</span><strong>${ds}</strong></div><div class="rcpt-mr"><span>Time</span><strong>${ts}</strong></div><div class="rcpt-mr"><span>Guest</span><strong>${o.guest}</strong></div><div class="rcpt-mr"><span>Table</span><strong>${o.tableName}</strong></div><div class="rcpt-mr"><span>Server</span><strong>${o.staffName}</strong></div></div><div class="rcpt-items-hd"><span>Dish</span><span>Qty</span><span>Amount</span></div>${rows}<div class="rcpt-sums"><div class="rcpt-sr"><span>Subtotal</span><span>RS ${o.subtotal.toFixed(0)}</span></div>${o.discount > 0 ? `<div class="rcpt-sr" style="color:#059669"><span>Discount</span><span>-RS ${o.discount.toFixed(0)}</span></div>` : ""}<div class="rcpt-sr"><span>Tax</span><span>RS ${o.tax.toFixed(0)}</span></div><div class="rcpt-sr grand"><span class="rsl">Total</span><span class="rsv">RS ${o.total.toFixed(0)}</span></div></div><div class="rcpt-pay-row"><span>Payment</span><strong>${o.payMethod}</strong></div>${o.note ? `<div style="margin-top:8px;padding:6px 10px;background:#f0ece4;border-radius:5px;font-size:.7rem;color:#7a7268">Note: ${o.note}</div>` : ""}</div><div class="rcpt-foot"><div class="rcpt-dots">· · · · · · ·</div><div class="rcpt-thanks">Thank you for visiting!</div><div class="rcpt-sub-msg">Please come again</div></div></div>`;
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

/* ═══════════════════════════
   ORDER HISTORY
═══════════════════════════ */
function renderHistory() {
  const feed = document.getElementById("history-feed"),
    q = (document.getElementById("q-orders") || {}).value || "";
  const list = [...DB.orders]
    .reverse()
    .filter(
      (o) =>
        o.guest.toLowerCase().includes(q.toLowerCase()) ||
        String(o.num).includes(q),
    );
  if (!list.length) {
    feed.innerHTML =
      '<div style="text-align:center;padding:60px;color:var(--soft);font-family:var(--ff-display);font-size:1.1rem;font-style:italic">No orders yet</div>';
    return;
  }
  feed.innerHTML = list
    .map((o) => {
      const d = new Date(o.createdAt);
      const items = o.items.map((i) => i.name).join(", ");
      return `<div class="oh-item"><div class="oh-num"><div class="oh-n">#${o.num}</div><div class="oh-d">${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div></div><div class="oh-body"><div class="oh-guest">${o.guest}</div><div class="oh-items-txt">${items.slice(0, 65)}${items.length > 65 ? "…" : ""}</div><div class="oh-tags"><span class="badge b-amber">${o.tableName}</span><span class="badge b-green">${o.payMethod}</span><span class="badge b-gray">${o.items.reduce((s, i) => s + i.qty, 0)} items</span>${o.staffName && o.staffName !== "—" ? `<span class="badge b-blue">${o.staffName}</span>` : ""}</div></div><div class="oh-right"><div class="oh-total">RS ${o.total.toFixed(0)}</div><div class="oh-time">${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div><div class="oh-acts"><button class="btn btn-sm btn-outline" onclick="viewRcpt('${o.id}')">Receipt</button></div></div></div>`;
    })
    .join("");
}

async function clearHistory() {
  if (!DB.orders.length) return;
  const ok = await swalConfirm(
    "Clear All History?",
    "This cannot be undone.",
    "Clear All",
    "warning",
  );
  if (!ok) return;
  DB.orders = [];
  ORDER_NUM = 1;
  save("orders");
  renderHistory();
  toast("Cleared", "info");
}

/* ═══════════════════════════
   DASHBOARD
═══════════════════════════ */
function renderDash() {
  const today = new Date().toDateString();
  const tod = DB.orders.filter(
    (o) => new Date(o.createdAt).toDateString() === today,
  );
  const todR = tod.reduce((s, o) => s + o.total, 0);
  const totR = DB.orders.reduce((s, o) => s + o.total, 0);
  const avg = DB.orders.length ? totR / DB.orders.length : 0;
  document.getElementById("dash-stats").innerHTML =
    `<div class="stat-card"><div class="stat-bg">💰</div><div class="stat-n"><span class="cur">RS </span>${todR.toFixed(0)}</div><div class="stat-l">Today Revenue</div></div><div class="stat-card"><div class="stat-bg">📜</div><div class="stat-n">${tod.length}</div><div class="stat-l">Today Orders</div></div><div class="stat-card"><div class="stat-bg">◈</div><div class="stat-n"><span class="cur">RS </span>${totR.toFixed(0)}</div><div class="stat-l">Total Revenue</div></div><div class="stat-card"><div class="stat-bg">✦</div><div class="stat-n"><span class="cur">RS </span>${avg.toFixed(0)}</div><div class="stat-l">Avg Order</div></div>`;
  document.getElementById("dash-today-n").textContent = tod.length;
  const te = document.getElementById("dash-today");
  if (!tod.length) {
    te.innerHTML =
      '<div style="color:var(--soft);font-size:.82rem;padding:12px 0;font-style:italic">No orders today</div>';
  } else
    te.innerHTML = [...tod]
      .reverse()
      .slice(0, 7)
      .map((o) => {
        const d = new Date(o.createdAt);
        return `<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border)"><span style="font-size:.66rem;color:var(--soft);white-space:nowrap">${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span><span style="flex:1;font-family:var(--ff-display);font-size:.92rem">${o.guest}</span><span style="font-family:var(--ff-display);font-size:.95rem;color:var(--amber3)">RS ${o.total.toFixed(0)}</span></div>`;
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
            `<div class="perf-item"><div class="perf-row"><span>${n}</span><span>${d.q}× · RS ${d.r.toFixed(0)}</span></div><div class="perf-track"><div class="perf-fill" style="width:${(d.r / mx) * 100}%"></div></div></div>`,
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
            `<div class="perf-item"><div class="perf-row"><span>${n}</span><span style="color:var(--amber3)">RS ${d.r.toFixed(0)}</span></div><div class="perf-track"><div class="perf-fill" style="width:${(d.r / mc) * 100}%"></div></div></div>`,
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
            `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)"><div><div style="font-family:var(--ff-display);font-size:.93rem">${n}</div><div style="font-size:.65rem;color:var(--soft)">${d.n} order${d.n !== 1 ? "s" : ""}</div></div><div style="text-align:right"><div style="font-family:var(--ff-display);font-size:1.05rem;color:var(--amber3)">RS ${d.r.toFixed(0)}</div></div></div>`,
        )
        .join("");
}

function renderMaster() {
  renderItemsTable();
  renderCatsTable();
  renderStaffTable();
}

/* ═══════════════════════════
   REFRESH POS
═══════════════════════════ */
function refreshPOS() {
  buildCatBar();
  renderMenu();
  syncTable();
  syncServer();
  if (TAB_ID) {
    const tab = DB.tabs.find((t) => t.id === TAB_ID);
    if (tab) {
      CART = [...tab.items];
      document.getElementById("f-guest").value = tab.guest || "";
      document.getElementById("f-table").value = tab.tableId || "";
      document.getElementById("f-server").value = tab.staffId || "";
      document.getElementById("f-note").value = tab.note || "";
      document.getElementById("op-ref").textContent =
        "Tab: " + tab.id.slice(-8).toUpperCase();
    }
  }
  renderCart();
  syncBadge();
  renderTabsStrip();
  updateKotBtn();
}

/* ═══════════════════════════
   CLOCK
═══════════════════════════ */
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

/* ═══════════════════════════
   INIT
═══════════════════════════ */
function initApp() {
  loadDB();
  tick();
  setInterval(tick, 30000);
  if (DB.tabs.length > 0) {
    TAB_ID = DB.tabs[DB.tabs.length - 1].id;
    CART = [...DB.tabs[DB.tabs.length - 1].items];
  } else {
    const tab = getOrCreateTab();
    TAB_ID = tab.id;
  }
  refreshPOS();
  renderDash();
}

/* ── App boot ── */
window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  // Check saved session
  const session = LS.get("session");
  if (session && session.username) {
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
  // Show login
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app-wrap").style.display = "none";
});
