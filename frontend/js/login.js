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
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ usuari, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      mostrarError(errorData.detail || "Usuari o contrasenya incorrectes.");
      return;
    }

    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify({
      id:     data.id,
      nom:    data.nom,
      cognom: data.cognom,
      rol:    data.rol,
    }));

    if (data.rol === "Admin") {
      window.location.href = "manageusers.html";
    } else {
      window.location.href = "dashboard.html";
    }

  } catch (error) {
    mostrarError("No s'ha pogut connectar amb el servidor. Comprova que el backend estigui funcionant.");
    console.error(error);
  } finally {
    btn.disabled    = false;
    btn.textContent = "Entrar";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  if (token) {
    window.location.href = "dashboard.html";
    return;
  }
  document.querySelector("form").addEventListener("submit", ferLogin);
});
