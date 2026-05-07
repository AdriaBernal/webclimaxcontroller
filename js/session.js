// ─────────────────────────────────────────────
// SESSION.JS
// Gestiona la UI de sessió en totes les pàgines:
//  · Nav: substitueix "Inicia Sessió" per nom + dropdown logout
//  · CTA: canvia botons d'inici/documentació segons estat de sessió
//  · Accés: bloqueja pàgines per rol
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
      <a class="nav-link dropdown-toggle" href="#"
         role="button" data-bs-toggle="dropdown" aria-expanded="false">
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
    </li>
  `;

    document.getElementById("logout-btn").addEventListener("click", tancarSessio);
}

// Canvia el botó CTA principal (index.html i documentation.html)
function actualitzarCTA(user) {
    const ctaBtn = document.getElementById("cta-main-btn");
    if (!ctaBtn) return;

    ctaBtn.textContent = "Anar al Dashboard";
    ctaBtn.href = user.rol === "Admin" ? "manageusers.html" : "dashboard.html";
}

// Mostra/oculta l'enllaç al dashboard del nav
function actualitzarNavDashboard(user) {
    const dashboardLink = document.getElementById("dashboard-link");
    if (!dashboardLink) return;

    if (user.rol === "Admin") {
        // L'admin no necessita el dashboard de sensors
        dashboardLink.classList.add("d-none");
    } else {
        dashboardLink.classList.remove("d-none");
    }
}

// ─────────────────────────────────────────────
// PROTECCIÓ DE PÀGINES PER ROL
// Cridar des de pàgines que requereixen accés autenticat
// ─────────────────────────────────────────────

// Ús: protegirPagina("Pagès")   → només pagesos
//     protegirPagina("Admin")   → només admins
//     protegirPagina()          → qualsevol usuari autenticat
function protegirPagina(rolRequerit = null) {
    const token = localStorage.getItem("token");
    const user = obtenirUsuari();

    if (!token || !user) {
        window.location.href = "login.html";
        return null;
    }

    if (rolRequerit && user.rol !== rolRequerit) {
        // Rol incorrecte: redirigim al lloc adequat
        window.location.href = user.rol === "Admin" ? "manageusers.html" : "dashboard.html";
        return null;
    }

    return user;
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
    const user = obtenirUsuari();

    if (user) {
        actualitzarNav(user);
        actualitzarCTA(user);
        actualitzarNavDashboard(user);
    }
});