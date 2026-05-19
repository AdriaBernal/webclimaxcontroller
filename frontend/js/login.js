// ─────────────────────────────────────────────
// login.js — Gestió del formulari de login
//
// Ara connecta amb el backend real en lloc de les
// dades de prova hardcodejades.
// ─────────────────────────────────────────────

const API_BASE = "http://localhost:8000";

function mostrarError(missatge) {
  const errorEl = document.getElementById("error-msg");
  errorEl.textContent = missatge;
  errorEl.classList.remove("d-none");
}

function amagarError() {
  document.getElementById("error-msg").classList.add("d-none");
}

async function ferLogin(e) {
  e.preventDefault();
  amagarError();

  const usuari   = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!usuari || !password) {
    mostrarError("Omple tots els camps.");
    return;
  }

  const btn = document.querySelector("button[type='submit']");
  btn.disabled    = true;
  btn.textContent = "Carregant...";

  try {
    // Petició POST al backend amb les credencials en format JSON
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ usuari, password }),
    });

    if (!response.ok) {
      // El servidor ha retornat un error (401 credencials incorrectes, etc.)
      const errorData = await response.json().catch(() => ({}));
      mostrarError(errorData.detail || "Usuari o contrasenya incorrectes.");
      return;
    }

    const data = await response.json();
    // data té: { access_token, token_type, id, nom, cognom, rol }

    // Guardem el token i les dades de l'usuari al localStorage
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify({
      id:     data.id,
      nom:    data.nom,
      cognom: data.cognom,
      rol:    data.rol,
    }));

    // Redirigim segons el rol
    if (data.rol === "Admin") {
      window.location.href = "manageusers.html";
    } else {
      window.location.href = "dashboard.html";
    }

  } catch (error) {
    // Error de xarxa: el servidor no respon
    mostrarError("No s'ha pogut connectar amb el servidor. Comprova que el backend estigui funcionant.");
    console.error(error);
  } finally {
    btn.disabled    = false;
    btn.textContent = "Entrar";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Si l'usuari ja té sessió, el portem al dashboard directament
  const token = localStorage.getItem("token");
  if (token) {
    window.location.href = "dashboard.html";
    return;
  }
  document.querySelector("form").addEventListener("submit", ferLogin);
});
