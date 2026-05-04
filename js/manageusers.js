// Array en memòria. Quan el backend estigui llest,
// aquest array es carregarà via GET /api/users
let users = [];

// Guardem l'ID de l'usuari seleccionat globalment
// perquè els botons d'actualitzar i eliminar el necessitin
let selectedUserId = null;

// Instància del modal de Bootstrap
let deleteModal;

// ─────────────────────────────────────────────
// TOASTS (copiat de dashboard.js, podria ser
// un fitxer utils.js compartit en el futur)
// ─────────────────────────────────────────────

function mostrarToast(missatge, tipus = "success") {
  const container = document.getElementById("toast-container");
  const bgClass = tipus === "error" ? "text-bg-danger" : "text-bg-success";

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center ${bgClass} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${missatge}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto"
              data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// ─────────────────────────────────────────────
// CARREGAR USUARIS
// ─────────────────────────────────────────────

async function carregarUsuaris() {
  // TODO: substituir per fetch real quan el backend estigui llest:
  // const res = await fetch("/api/users");
  // users = await res.json();

  // Dades de prova (reflecteixen l'estructura real de la BBDD)
  users = [
    { id: 1, nom: "Joan",   cognom: "Herrero",    usuari: "jherrero", rol: "Admin" },
    { id: 2, nom: "Carlos", cognom: "Moreno", usuari: "cmoreno",    rol: "Pagès" },
    { id: 3, nom: "Felipe",  cognom: "Fernández",  usuari: "ffernandez",    rol: "Pagès" },
  ];

  omplirSelect();
}

// Omple el <select> amb els usuaris carregats
function omplirSelect() {
  const select = document.getElementById("select-usuari");

  // Netegem totes les opcions menys la primera (el placeholder)
  select.innerHTML = '<option value="">-- Selecciona un usuari --</option>';

  users.forEach((u) => {
    const option = document.createElement("option");
    option.value = u.id;
    // El text que veu l'usuari: "Joan Herrero (jherrero)"
    option.textContent = `${u.nom} ${u.cognom} (${u.usuari})`;
    select.appendChild(option);
  });
}

// ─────────────────────────────────────────────
// AUTOCOMPLETAR FORMULARI D'EDICIÓ
// ─────────────────────────────────────────────

function onSelectCanvi(e) {
  const id = parseInt(e.target.value);
  const editFields = document.getElementById("edit-fields");
  const noSelectionMsg = document.getElementById("no-selection-msg");

  if (!id) {
    // L'usuari ha tornat a seleccionar el placeholder
    editFields.classList.add("d-none");
    noSelectionMsg.classList.remove("d-none");
    selectedUserId = null;
    return;
  }

  // Busquem l'usuari al array en memòria (sense cap petició al servidor)
  const user = users.find((u) => u.id === id);
  selectedUserId = user.id;

  // Omplim els inputs
  document.getElementById("edit-nom").value    = user.nom;
  document.getElementById("edit-cognom").value = user.cognom;
  document.getElementById("edit-usuari").value = user.usuari;
  document.getElementById("edit-password").value = ""; // mai mostrem la password real
  document.getElementById("edit-rol").value    = user.rol;

  // Mostrem el formulari i amaguem el missatge d'ajuda
  editFields.classList.remove("d-none");
  noSelectionMsg.classList.add("d-none");
}

// ─────────────────────────────────────────────
// CREAR USUARI
// ─────────────────────────────────────────────

async function crearUsuari() {
  const nom      = document.getElementById("create-nom").value.trim();
  const cognom   = document.getElementById("create-cognom").value.trim();
  const usuari   = document.getElementById("create-usuari").value.trim();
  const password = document.getElementById("create-password").value;
  const rol      = document.getElementById("create-rol").value;

  // Validació bàsica: tots els camps obligatoris
  if (!nom || !cognom || !usuari || !password) {
    mostrarToast("Omple tots els camps obligatoris", "error");
    return;
  }

  // Validació: nom d'usuari ja existent (comprovem localment, el backend
  // hauria de fer la validació definitiva)
  if (users.some((u) => u.usuari === usuari)) {
    mostrarToast(`El nom d'usuari "${usuari}" ja existeix`, "error");
    return;
  }

  // TODO: substituir per crida real:
  // const res = await fetch("/api/users", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ nom, cognom, usuari, password, rol })
  // });
  // const nouUsuari = await res.json();

  // Simulem el que retornaria el backend (un ID generat)
  const nouUsuari = {
    id: Date.now(), // ID temporal fins que el backend assigni el real
    nom,
    cognom,
    usuari,
    rol,
  };

  users.push(nouUsuari);
  omplirSelect();

  // Buidem el formulari
  document.getElementById("create-nom").value     = "";
  document.getElementById("create-cognom").value  = "";
  document.getElementById("create-usuari").value  = "";
  document.getElementById("create-password").value = "";
  document.getElementById("create-rol").value     = "Pagès";

  mostrarToast(`Usuari "${usuari}" creat correctament`);
}

// ─────────────────────────────────────────────
// ACTUALITZAR USUARI
// ─────────────────────────────────────────────

async function actualitzarUsuari() {
  if (!selectedUserId) return;

  const nom      = document.getElementById("edit-nom").value.trim();
  const cognom   = document.getElementById("edit-cognom").value.trim();
  const usuari   = document.getElementById("edit-usuari").value.trim();
  const password = document.getElementById("edit-password").value; // pot estar buit
  const rol      = document.getElementById("edit-rol").value;

  if (!nom || !cognom || !usuari) {
    mostrarToast("Nom, cognom i usuari no poden estar buits", "error");
    return;
  }

  // Comprovem que el nou nom d'usuari no pertanyi a un ALTRE usuari
  const duplicat = users.find((u) => u.usuari === usuari && u.id !== selectedUserId);
  if (duplicat) {
    mostrarToast(`El nom d'usuari "${usuari}" ja l'utilitza un altre usuari`, "error");
    return;
  }

  // TODO: substituir per crida real:
  // const body = { nom, cognom, usuari, rol };
  // if (password) body.password = password; // només enviem si s'ha escrit alguna cosa
  // await fetch(`/api/users/${selectedUserId}`, {
  //   method: "PUT",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(body)
  // });

  // Actualitzem localment
  const user = users.find((u) => u.id === selectedUserId);
  user.nom    = nom;
  user.cognom = cognom;
  user.usuari = usuari;
  user.rol    = rol;

  omplirSelect();

  // Re-seleccionem el mateix usuari perquè no es perdi la selecció
  document.getElementById("select-usuari").value = selectedUserId;

  mostrarToast(`Usuari "${usuari}" actualitzat correctament`);
}

// ─────────────────────────────────────────────
// ELIMINAR USUARI
// ─────────────────────────────────────────────

function obrirModalEliminar() {
  if (!selectedUserId) return;

  const user = users.find((u) => u.id === selectedUserId);
  // Posem el nom a l'interior del modal per contextualitzar
  document.getElementById("modal-username").textContent =
    `${user.nom} ${user.cognom} (${user.usuari})`;

  deleteModal.show();
}

async function confirmarEliminacio() {
  if (!selectedUserId) return;

  const user = users.find((u) => u.id === selectedUserId);

  // TODO: substituir per crida real:
  // await fetch(`/api/users/${selectedUserId}`, { method: "DELETE" });

  // Eliminem del array local
  users = users.filter((u) => u.id !== selectedUserId);

  omplirSelect();
  deleteModal.hide();

  // Resetegem el formulari d'edició
  document.getElementById("select-usuari").value = "";
  document.getElementById("edit-fields").classList.add("d-none");
  document.getElementById("no-selection-msg").classList.remove("d-none");
  selectedUserId = null;

  mostrarToast(`Usuari "${user.usuari}" eliminat`);
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async function () {

  // TODO: verificar que l'usuari és Admin. Si no, redirigir.
  // const user = JSON.parse(localStorage.getItem("user") || "null");
  // if (!user || user.rol !== "Admin") window.location.href = "dashboard.html";

  // Inicialitzem el modal de Bootstrap
  deleteModal = new bootstrap.Modal(document.getElementById("delete-modal"));

  // Registrem tots els events
  document.getElementById("select-usuari").addEventListener("change", onSelectCanvi);
  document.getElementById("create-btn").addEventListener("click", crearUsuari);
  document.getElementById("update-btn").addEventListener("click", actualitzarUsuari);
  document.getElementById("delete-btn").addEventListener("click", obrirModalEliminar);
  document.getElementById("confirm-delete-btn").addEventListener("click", confirmarEliminacio);

  // Carreguem els usuaris (ara dades de prova, futur: API)
  await carregarUsuaris();
});