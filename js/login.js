// ─────────────────────────────────────────────
// UTILITATS
// ─────────────────────────────────────────────

function mostrarError(missatge) {
  const errorEl = document.getElementById("error-msg");
  errorEl.textContent = missatge;
  errorEl.classList.remove("d-none");
}

function amagarError() {
  document.getElementById("error-msg").classList.add("d-none");
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────

async function ferLogin(e) {
  // Pas 1: evitem que el formulari recarregui la pàgina
  e.preventDefault();
  amagarError();

  // Pas 2: recollim els valors dels inputs
  const usuari   = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  // Pas 3: validació bàsica al client (no enviem res buit al servidor)
  if (!usuari || !password) {
    mostrarError("Omple tots els camps.");
    return;
  }

  // Pas 4: bloquejem el botó mentre esperem resposta
  const btn = document.querySelector("button[type='submit']");
  btn.disabled = true;
  btn.textContent = "Carregant...";

  try {
    // Pas 5: petició POST al backend
    // TODO: descomentar quan el backend estigui llest i eliminar el bloc de prova
    /*
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuari, password })
    });

    if (!response.ok) {
      // El backend ha retornat 401 Unauthorized o similar
      mostrarError("Usuari o contrasenya incorrectes. Torna-ho a provar.");
      return;
    }

    const data = await response.json();
    // data té: { token, id, nom, rol }
    */

    // ── BLOC DE PROVA (eliminar quan hi hagi backend) ──
    const usuarisDeProva = [
      { id: 1, nom: "Joan",   usuari: "jherrero",  password: "jherrero",    rol: "Admin" },
      { id: 2, nom: "Carles", usuari: "puchi",      password: "independencia", rol: "Pagès" },
      { id: 3, nom: "Oriol",  usuari: "ojunq",      password: "urnes",       rol: "Pagès" },
    ];

    const trobat = usuarisDeProva.find(
      (u) => u.usuari === usuari && u.password === password
    );

    if (!trobat) {
      mostrarError("Usuari o contrasenya incorrectes. Torna-ho a provar.");
      return;
    }

    const data = {
      token: "token-de-prova-" + trobat.id,
      id:    trobat.id,
      nom:   trobat.nom,
      rol:   trobat.rol,
    };
    // ── FI DEL BLOC DE PROVA ──

    // Pas 6: guardem el token i les dades de l'usuari al localStorage
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify({
      id:  data.id,
      nom: data.nom,
      rol: data.rol,
    }));

    // Pas 7: redirigim segons el rol
    if (data.rol === "Admin") {
      window.location.href = "manageusers.html";
    } else {
      window.location.href = "dashboard.html";
    }

  } catch (error) {
    // Això s'executa si hi ha un error de xarxa (servidor caigut, sense internet...)
    // És diferent d'un error de credencials: aquí el servidor ni ha respost
    mostrarError("No s'ha pogut connectar amb el servidor. Torna-ho a provar.");
    console.error(error);
  } finally {
    // Pas 8: tant si ha anat bé com malament, restaurem el botó
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {

  // Si l'usuari ja té sessió iniciada, no té sentit que estigui aquí
  const token = localStorage.getItem("token");
  if (token) {
    window.location.href = "dashboard.html";
    return;
  }

  document.querySelector("form").addEventListener("submit", ferLogin);
});