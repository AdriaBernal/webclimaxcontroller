// ─────────────────────────────────────────────
// session.js — Gestió de la UI de sessió
//
// S'executa a TOTES les pàgines.
// Gestiona el nav (nom d'usuari, logout), els botons CTA
// i la visibilitat dels enllaços per rol.
//
// No cal modificar-lo: funciona amb el token que login.js
// guarda al localStorage.
// ─────────────────────────────────────────────

function obtenirUsuari() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function tancarSessio() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Substitueix l'element del nav "Inicia Sessió" pel nom + dropdown
function actualitzarNav(user) {
  const navLoginItem = document.getElementById("nav-login-item");
  if (!navLoginItem) return;
  navLoginItem.outerHTML = `
    <li class="nav-item dropdown" id="nav-user-dropdown">
      <a class="nav-link dropdown-toggle" href="#" role="button"
         data-bs-toggle="dropdown" aria-expanded="false">
        ${user.nom}
      </a>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><span class="dropdown-item-text text-muted small">${user.rol}</span></li>
        <li><hr class="dropdown-divider"></li>
        <li>
          <button class="dropdown-item text-danger" id="logout-btn">
            Tancar sessió
          </button>
        </li>
      </ul>
    </li>`;
  document.getElementById("logout-btn").addEventListener("click", tancarSessio);
}

function actualitzarCTA(user) {
  const ctaBtn = document.getElementById("cta-main-btn");
  if (!ctaBtn) return;
  ctaBtn.textContent = "Anar al Dashboard";
  ctaBtn.href = user.rol === "Admin" ? "manageusers.html" : "dashboard.html";
}

function actualitzarNavDashboard(user) {
  const dashboardLink    = document.getElementById("dashboard-link");
  const manageUsersLink  = document.getElementById("manage-users-link");
  if (user.rol === "Admin") {
    if (dashboardLink)   dashboardLink.classList.add("d-none");
    if (manageUsersLink) manageUsersLink.classList.remove("d-none");
  } else {
    if (dashboardLink)   dashboardLink.classList.remove("d-none");
    if (manageUsersLink) manageUsersLink.classList.add("d-none");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const user = obtenirUsuari();
  if (user) {
    actualitzarNav(user);
    actualitzarCTA(user);
    actualitzarNavDashboard(user);
  }
});
