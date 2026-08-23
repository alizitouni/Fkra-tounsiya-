/*
  FKRA_STORE — beta data layer.
  Everything here reads/writes localStorage so the site is fully clickable
  today. Each function is written so that swapping the body for a real
  Firestore call (getDocs/setDoc/onSnapshot, same pattern as Safart/Markaz)
  is a drop-in replacement — the rest of the site calls these functions,
  never localStorage directly.
*/

const FKRA_KEYS = {
  products: "fkra_products",
  inquiries: "fkra_inquiries",
  drop: "fkra_drop_meta",
  admins: "fkra_admins",
  session: "fkra_admin_session"
};

function fkraSeedIfEmpty() {
  if (!localStorage.getItem(FKRA_KEYS.products)) {
    const seed = [
      // ESSENTIALS — always available, always priced
      { id: "ess-tee-black", section: "essentials", name: "Base Tee — Black", price: 95,
        colors: ["Black", "White"], sizes: ["S", "M", "L", "XL"], img: "" },
      { id: "ess-hoodie", section: "essentials", name: "Base Hoodie", price: 180,
        colors: ["Black", "Grey"], sizes: ["S", "M", "L", "XL"], img: "" },
      { id: "ess-cap", section: "essentials", name: "Base Cap", price: 65,
        colors: ["Black"], sizes: ["One Size"], img: "" },

      // NEW DROP — named, limited-time, auto-archives on expiry
      { id: "drop-jacket", section: "drop", name: "Arc Jacket", price: 340,
        colors: ["Black", "Olive"], sizes: ["S", "M", "L"], img: "" },
      { id: "drop-cargo", section: "drop", name: "Arc Cargo", price: 210,
        colors: ["Black"], sizes: ["S", "M", "L", "XL"], img: "" },
      { id: "drop-tee", section: "drop", name: "Arc Tee", price: 120,
        colors: ["Black", "Sand"], sizes: ["S", "M", "L"], img: "" },

      // ARCHIVE — vaulted, no price, view-only unless re-introduced
      { id: "arc-s24-01", section: "archive", name: "S24 — Panel Tee", price: 90,
        colors: ["White"], sizes: ["M", "L"], img: "", vaulted: true },
      { id: "arc-ramadan-cap", section: "archive", name: "Ramadan Capsule — Cap", price: 70,
        colors: ["Black"], sizes: ["One Size"], img: "", vaulted: true },
      { id: "arc-origins", section: "archive", name: "Origins — Crewneck", price: 150,
        colors: ["Grey"], sizes: ["S", "M", "L"], img: "", vaulted: true }
    ];
    localStorage.setItem(FKRA_KEYS.products, JSON.stringify(seed));
  }

  if (!localStorage.getItem(FKRA_KEYS.drop)) {
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 3);
    endsAt.setHours(endsAt.getHours() + 12);
    localStorage.setItem(FKRA_KEYS.drop, JSON.stringify({
      name: "Winter Arc",
      endsAt: endsAt.toISOString(),
      active: true
    }));
  }

  if (!localStorage.getItem(FKRA_KEYS.inquiries)) {
    localStorage.setItem(FKRA_KEYS.inquiries, JSON.stringify([]));
  }

  if (!localStorage.getItem(FKRA_KEYS.admins)) {
    // Beta-only mock accounts. Replace with Firebase Auth + a Firestore
    // "roles" collection later, same as Markaz's owner/manager/employee model.
    const admins = [
      { email: "owner@fkra.tn", password: "owner123", role: "owner", name: "Owner" },
      { email: "manager@fkra.tn", password: "manager123", role: "manager", name: "Manager" },
      { email: "staff@fkra.tn", password: "staff123", role: "employee", name: "Staff" }
    ];
    localStorage.setItem(FKRA_KEYS.admins, JSON.stringify(admins));
  }
}

function fkraGetProducts() {
  return JSON.parse(localStorage.getItem(FKRA_KEYS.products) || "[]");
}
function fkraSaveProducts(list) {
  localStorage.setItem(FKRA_KEYS.products, JSON.stringify(list));
}
function fkraGetProduct(id) {
  return fkraGetProducts().find(p => p.id === id);
}
function fkraUpsertProduct(product) {
  const list = fkraGetProducts();
  const i = list.findIndex(p => p.id === product.id);
  if (i >= 0) list[i] = product; else list.push(product);
  fkraSaveProducts(list);
}
function fkraDeleteProduct(id) {
  fkraSaveProducts(fkraGetProducts().filter(p => p.id !== id));
}

function fkraGetDropMeta() {
  return JSON.parse(localStorage.getItem(FKRA_KEYS.drop) || "{}");
}
function fkraSaveDropMeta(meta) {
  localStorage.setItem(FKRA_KEYS.drop, JSON.stringify(meta));
}

// Auto-archive: if the drop's end date has passed, flip all "drop" items to "archive"/vaulted.
function fkraCheckAutoArchive() {
  const meta = fkraGetDropMeta();
  if (!meta.endsAt) return;
  if (meta.active && new Date(meta.endsAt) <= new Date()) {
    const list = fkraGetProducts().map(p => {
      if (p.section === "drop") {
        return { ...p, section: "archive", vaulted: true };
      }
      return p;
    });
    fkraSaveProducts(list);
    fkraSaveDropMeta({ ...meta, active: false });
  }
}

function fkraGetInquiries() {
  return JSON.parse(localStorage.getItem(FKRA_KEYS.inquiries) || "[]");
}
function fkraAddInquiry(inquiry) {
  const list = fkraGetInquiries();
  inquiry.id = "inq-" + Date.now();
  inquiry.createdAt = new Date().toISOString();
  inquiry.status = "new";
  list.unshift(inquiry);
  localStorage.setItem(FKRA_KEYS.inquiries, JSON.stringify(list));
  return inquiry;
}
function fkraUpdateInquiry(id, patch) {
  const list = fkraGetInquiries().map(q => q.id === id ? { ...q, ...patch } : q);
  localStorage.setItem(FKRA_KEYS.inquiries, JSON.stringify(list));
}
function fkraDeleteInquiry(id) {
  localStorage.setItem(FKRA_KEYS.inquiries, JSON.stringify(fkraGetInquiries().filter(q => q.id !== id)));
}

function fkraGetAdmins() {
  return JSON.parse(localStorage.getItem(FKRA_KEYS.admins) || "[]");
}
function fkraLogin(email, password) {
  const admin = fkraGetAdmins().find(a => a.email === email && a.password === password);
  if (admin) {
    sessionStorage.setItem(FKRA_KEYS.session, JSON.stringify({ email: admin.email, role: admin.role, name: admin.name }));
    return admin;
  }
  return null;
}
function fkraCurrentSession() {
  return JSON.parse(sessionStorage.getItem(FKRA_KEYS.session) || "null");
}
function fkraLogout() {
  sessionStorage.removeItem(FKRA_KEYS.session);
}

// Role permission map — mirrors the Owner / Manager / Employee tiers you use on Markaz.
const FKRA_PERMISSIONS = {
  owner: ["view_inquiries", "manage_inquiries", "edit_products", "manage_drops", "manage_archive", "manage_admins"],
  manager: ["view_inquiries", "manage_inquiries", "edit_products", "manage_drops", "manage_archive"],
  employee: ["view_inquiries", "manage_inquiries"]
};
function fkraCan(role, permission) {
  return (FKRA_PERMISSIONS[role] || []).includes(permission);
}
