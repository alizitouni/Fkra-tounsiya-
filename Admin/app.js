fkraSeedIfEmpty();
fkraCheckAutoArchive();

const root = document.getElementById("app-root");
let currentTab = "inquiries";

function render() {
  const session = fkraCurrentSession();
  if (!session) {
    renderLogin();
  } else {
    renderShell(session);
  }
}

function renderLogin() {
  root.innerHTML = `
    <div class="admin-login">
      <h2>Fkra Tounsiya — Admin</h2>
      <p>Sign in to manage drops, products and inquiries.</p>
      <input type="email" id="login-email" placeholder="Email">
      <input type="password" id="login-password" placeholder="Password">
      <button id="login-btn">Sign in</button>
      <div class="form-msg err" id="login-msg"></div>
      <div class="admin-hint">
        Beta demo accounts —<br>
        owner@fkra.tn / owner123<br>
        manager@fkra.tn / manager123<br>
        staff@fkra.tn / staff123
      </div>
    </div>
  `;
  document.getElementById("login-btn").addEventListener("click", () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const admin = fkraLogin(email, password);
    if (admin) {
      render();
    } else {
      document.getElementById("login-msg").textContent = "Invalid email or password.";
    }
  });
}

function renderShell(session) {
  const items = [
    { key: "inquiries", label: "Inquiries", perm: "view_inquiries" },
    { key: "essentials", label: "Essentials", perm: "edit_products" },
    { key: "drop", label: "New Drop", perm: "manage_drops" },
    { key: "archive", label: "Archive", perm: "manage_archive" },
    { key: "admins", label: "Admin Accounts", perm: "manage_admins" }
  ].filter(i => fkraCan(session.role, i.perm));

  if (!items.find(i => i.key === currentTab)) currentTab = items[0]?.key || "inquiries";

  root.innerHTML = `
    <div class="admin-shell">
      <div class="admin-sidebar">
        <div class="brand">FKRA_TOUNSIYA</div>
        ${items.map(i => `<a href="#" data-tab="${i.key}" class="${i.key === currentTab ? "active" : ""}">${i.label}</a>`).join("")}
        <div class="who">
          Signed in as<br><strong style="color:#fff">${session.name}</strong> (${session.role})
          <div class="logout" id="logout-btn">Sign out</div>
        </div>
      </div>
      <div class="admin-main" id="admin-main"></div>
    </div>
  `;

  root.querySelectorAll("[data-tab]").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      currentTab = a.dataset.tab;
      renderShell(session);
    });
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    fkraLogout();
    render();
  });

  const main = document.getElementById("admin-main");
  if (currentTab === "inquiries") renderInquiries(main, session);
  else if (currentTab === "essentials") renderProductSection(main, session, "essentials");
  else if (currentTab === "drop") renderDropTab(main, session);
  else if (currentTab === "archive") renderArchiveTab(main, session);
  else if (currentTab === "admins") renderAdminsTab(main, session);
}

/* ---------------- Inquiries ---------------- */
function renderInquiries(main, session) {
  const canManage = fkraCan(session.role, "manage_inquiries");
  const list = fkraGetInquiries();
  main.innerHTML = `
    <h1>Inquiries</h1>
    <div class="sub">${list.length} total — customer contact requests from product pages.</div>
    <table class="admin-table">
      <tr><th>Item</th><th>Customer</th><th>Location</th><th>Note</th><th>Status</th>${canManage ? "<th></th>" : ""}</tr>
      ${list.map(q => `
        <tr>
          <td>${q.productName}<br><span style="color:#999">${q.color || ""} / ${q.size || ""}</span></td>
          <td>${q.name}<br><span style="color:#999">${q.phone}</span><br><span style="color:#999">${q.address}</span></td>
          <td>${q.city}, ${q.state}</td>
          <td>${q.note ? q.note : "<span style='color:#ccc'>—</span>"}</td>
          <td><span class="tag status-${q.status === "handled" ? "handled" : "new"}">${q.status}</span></td>
          ${canManage ? `<td>
            ${q.status !== "handled" ? `<button class="btn-sm" data-mark="${q.id}">Mark handled</button>` : ""}
            <button class="btn-sm danger" data-del="${q.id}">Remove</button>
          </td>` : ""}
        </tr>
      `).join("") || `<tr><td colspan="6" style="color:#999">No inquiries yet.</td></tr>`}
    </table>
  `;
  if (canManage) {
    main.querySelectorAll("[data-mark]").forEach(btn => btn.addEventListener("click", () => {
      fkraUpdateInquiry(btn.dataset.mark, { status: "handled" });
      renderInquiries(main, session);
    }));
    main.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => {
      fkraDeleteInquiry(btn.dataset.del);
      renderInquiries(main, session);
    }));
  }
}

/* ---------------- Essentials / product CRUD ---------------- */
function renderProductSection(main, session, section) {
  const canEdit = fkraCan(session.role, "edit_products");
  const list = fkraGetProducts().filter(p => p.section === section);
  main.innerHTML = `
    <h1>Essentials</h1>
    <div class="sub">Always-available basics. These never expire or auto-archive.</div>
    ${canEdit ? renderProductForm(section) : ""}
    <div class="admin-card">
      <table class="admin-table">
        <tr><th>Name</th><th>Price</th><th>Colors</th><th>Sizes</th>${canEdit ? "<th></th>" : ""}</tr>
        ${list.map(p => `
          <tr>
            <td>${p.name}</td><td>${p.price} DT</td><td>${p.colors.join(", ")}</td><td>${p.sizes.join(", ")}</td>
            ${canEdit ? `<td><button class="btn-sm danger" data-del="${p.id}">Remove</button></td>` : ""}
          </tr>
        `).join("") || `<tr><td colspan="5" style="color:#999">No items yet.</td></tr>`}
      </table>
    </div>
  `;
  if (canEdit) {
    document.getElementById("product-form").addEventListener("submit", (e) => {
      e.preventDefault();
      addProductFromForm(section);
      renderProductSection(main, session, section);
    });
    main.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => {
      fkraDeleteProduct(btn.dataset.del);
      renderProductSection(main, session, section);
    }));
  }
}

function renderProductForm(section, extraLabel) {
  return `
    <form class="admin-card" id="product-form">
      <div class="admin-form-row">
        <div><label>Name</label><input type="text" id="p-name" required></div>
        <div><label>Price (DT)</label><input type="number" id="p-price" required></div>
        <div><label>Colors (comma-separated)</label><input type="text" id="p-colors" placeholder="Black, White"></div>
        <div><label>Sizes (comma-separated)</label><input type="text" id="p-sizes" placeholder="S, M, L, XL"></div>
      </div>
      <button type="submit" class="btn-sm primary">Add item</button>
    </form>
  `;
}

function addProductFromForm(section) {
  const name = document.getElementById("p-name").value.trim();
  const price = parseFloat(document.getElementById("p-price").value);
  const colors = document.getElementById("p-colors").value.split(",").map(s => s.trim()).filter(Boolean);
  const sizes = document.getElementById("p-sizes").value.split(",").map(s => s.trim()).filter(Boolean);
  if (!name || isNaN(price)) return;
  fkraUpsertProduct({
    id: section + "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4),
    section, name, price,
    colors: colors.length ? colors : ["Default"],
    sizes: sizes.length ? sizes : ["One Size"]
  });
}

/* ---------------- New Drop management ---------------- */
function renderDropTab(main, session) {
  const meta = fkraGetDropMeta();
  const items = fkraGetProducts().filter(p => p.section === "drop");
  main.innerHTML = `
    <h1>New Drop</h1>
    <div class="sub">The current named, limited-time drop. Auto-archives on expiry.</div>

    <div class="admin-card">
      <div class="admin-form-row">
        <div><label>Drop name</label><input type="text" id="drop-name-input" value="${meta.name || ""}"></div>
        <div><label>Ends at</label><input type="datetime-local" id="drop-ends-input" value="${meta.endsAt ? toLocalInput(meta.endsAt) : ""}"></div>
        <div><label>Status</label><input type="text" value="${meta.active ? "Active" : "Ended / archived"}" disabled></div>
      </div>
      <button class="btn-sm primary" id="save-drop-btn">Save drop settings</button>
    </div>

    ${renderProductForm("drop")}

    <div class="admin-card">
      <table class="admin-table">
        <tr><th>Name</th><th>Price</th><th>Colors</th><th>Sizes</th><th></th></tr>
        ${items.map(p => `
          <tr>
            <td>${p.name}</td><td>${p.price} DT</td><td>${p.colors.join(", ")}</td><td>${p.sizes.join(", ")}</td>
            <td><button class="btn-sm danger" data-del="${p.id}">Remove</button></td>
          </tr>
        `).join("") || `<tr><td colspan="5" style="color:#999">No items in this drop yet.</td></tr>`}
      </table>
    </div>
  `;

  document.getElementById("save-drop-btn").addEventListener("click", () => {
    const name = document.getElementById("drop-name-input").value.trim();
    const endsInput = document.getElementById("drop-ends-input").value;
    const endsAt = endsInput ? new Date(endsInput).toISOString() : meta.endsAt;
    fkraSaveDropMeta({ name, endsAt, active: true });
    renderDropTab(main, session);
  });
  document.getElementById("product-form").addEventListener("submit", (e) => {
    e.preventDefault();
    addProductFromForm("drop");
    renderDropTab(main, session);
  });
  main.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => {
    fkraDeleteProduct(btn.dataset.del);
    renderDropTab(main, session);
  }));
}

function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------------- Archive / vault management ---------------- */
function renderArchiveTab(main, session) {
  const items = fkraGetProducts().filter(p => p.section === "archive");
  main.innerHTML = `
    <h1>Archive</h1>
    <div class="sub">Past drops. Vaulted items show no price and aren't purchasable until re-introduced.</div>
    <div class="admin-card">
      <table class="admin-table">
        <tr><th>Name</th><th>Price (if reissued)</th><th>Status</th><th></th></tr>
        ${items.map(p => `
          <tr>
            <td>${p.name}</td><td>${p.price} DT</td>
            <td><span class="tag ${p.reissued ? "essentials" : "archive"}">${p.reissued ? "Reissued — for sale" : "Vaulted"}</span></td>
            <td>
              <button class="btn-sm ${p.reissued ? "" : "primary"}" data-toggle="${p.id}">
                ${p.reissued ? "Re-vault" : "Re-introduce"}
              </button>
              <button class="btn-sm danger" data-del="${p.id}">Remove</button>
            </td>
          </tr>
        `).join("") || `<tr><td colspan="4" style="color:#999">Archive is empty.</td></tr>`}
      </table>
    </div>
  `;
  main.querySelectorAll("[data-toggle]").forEach(btn => btn.addEventListener("click", () => {
    const p = fkraGetProduct(btn.dataset.toggle);
    fkraUpsertProduct({ ...p, reissued: !p.reissued });
    renderArchiveTab(main, session);
  }));
  main.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => {
    fkraDeleteProduct(btn.dataset.del);
    renderArchiveTab(main, session);
  }));
}

/* ---------------- Admin accounts (owner only) ---------------- */
function renderAdminsTab(main, session) {
  const admins = fkraGetAdmins();
  main.innerHTML = `
    <h1>Admin Accounts</h1>
    <div class="sub">Owner / Manager / Employee access levels.</div>
    <div class="admin-card">
      <table class="admin-table">
        <tr><th>Name</th><th>Email</th><th>Role</th></tr>
        ${admins.map(a => `<tr><td>${a.name}</td><td>${a.email}</td><td>${a.role}</td></tr>`).join("")}
      </table>
    </div>
    <div class="sub">Beta note: account management writes to the mock store here. Once wired to Firebase Auth, this becomes real user creation with role claims — same pattern as Markaz.</div>
  `;
}

render();
