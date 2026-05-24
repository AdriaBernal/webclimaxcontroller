const API_BASE = "http://localhost:8000";

let users          = [];
let selectedUserId = null;
let deleteModal;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
    return null;
  }

  if (response.status === 403) {
    window.location.href = "dashboard.html";
    return null;
  }

  return response;
}

function mostrarToast(missatge, tipus = "success") {
  const container = document.getElementById("toast-container");
  const bgClass   = tipus === "error" ? "text-bg-danger" : "text-bg-success";
  const toastEl   = document.createElement("div");
  toastEl.className = `toast align-items-center ${bgClass} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${missatge}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

async function carregarUsuaris() {
  const res = await apiFetch("/api/users");
  if (!res || !res.ok) {
    mostrarToast("Error en carregar els usuaris", "error");
    return;
  }
  users = await res.json();
  omplirSelect();
}

function omplirSelect() {
  const select = document.getElementById("select-usuari");
  select.innerHTML = '<option value="">-- Selecciona un usuari --</option>';
  users.forEach((u) => {
    const option       = document.createElement("option");
    option.value       = u.id;
    option.textContent = `${u.nom || ""} ${u.cognom || ""} (${u.usuari})`.trim();
    select.appendChild(option);
  });
}

function onSelectCanvi(e) {
  const id           = parseInt(e.target.value);
  const editFields   = document.getElementById("edit-fields");
  const noSelMsg     = document.getElementById("no-selection-msg");

  if (!id) {
    editFields.classList.add("d-none");
    noSelMsg.classList.remove("d-none");
    selectedUserId = null;
    return;
  }

  const user = users.find((u) => u.id === id);
  selectedUserId = user.id;

  document.getElementById("edit-nom").value    = user.nom    || "";
  document.getElementById("edit-cognom").value = user.cognom || "";
  document.getElementById("edit-usuari").value = user.usuari;
  document.getElementById("edit-password").value = "";
  document.getElementById("edit-rol").value    = user.rol;

  editFields.classList.remove("d-none");
  noSelMsg.classList.add("d-none");
}

async function crearUsuari() {
  const nom      = document.getElementById("create-nom").value.trim();
  const cognom   = document.getElementById("create-cognom").value.trim();
  const usuari   = document.getElementById("create-usuari").value.trim();
  const password = document.getElementById("create-password").value;
  const rol      = document.getElementById("create-rol").value;

  if (!nom || !cognom || !usuari || !password) {
    mostrarToast("Omple tots els camps obligatoris", "error");
    return;
  }

  const res = await apiFetch("/api/users", {
    method: "POST",
    body:   JSON.stringify({ nom, cognom, usuari, password, rol }),
  });

  if (!res) return;

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    mostrarToast(err.detail || "Error en crear l'usuari", "error");
    return;
  }

  document.getElementById("create-nom").value     = "";
  document.getElementById("create-cognom").value  = "";
  document.getElementById("create-usuari").value  = "";
  document.getElementById("create-password").value= "";
  document.getElementById("create-rol").value     = "Pagès";

  mostrarToast(`Usuari "${usuari}" creat correctament`);
  await carregarUsuaris();
}

async function actualitzarUsuari() {
  if (!selectedUserId) return;

  const nom      = document.getElementById("edit-nom").value.trim();
  const cognom   = document.getElementById("edit-cognom").value.trim();
  const usuari   = document.getElementById("edit-usuari").value.trim();
  const password = document.getElementById("edit-password").value;
  const rol      = document.getElementById("edit-rol").value;

  if (!nom || !cognom || !usuari) {
    mostrarToast("Nom, cognom i usuari no poden estar buits", "error");
    return;
  }

  const body = { nom, cognom, usuari, rol };
  if (password) body.password = password;

  const res = await apiFetch(`/api/users/${selectedUserId}`, {
    method: "PUT",
    body:   JSON.stringify(body),
  });

  if (!res) return;

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    mostrarToast(err.detail || "Error en actualitzar l'usuari", "error");
    return;
  }

  mostrarToast(`Usuari "${usuari}" actualitzat correctament`);
  await carregarUsuaris();
  document.getElementById("select-usuari").value = selectedUserId;
}

function obrirModalEliminar() {
  if (!selectedUserId) return;
  const user = users.find((u) => u.id === selectedUserId);
  document.getElementById("modal-username").textContent =
    `${user.nom || ""} ${user.cognom || ""} (${user.usuari})`.trim();
  deleteModal.show();
}

async function confirmarEliminacio() {
  if (!selectedUserId) return;
  const user = users.find((u) => u.id === selectedUserId);

  const res = await apiFetch(`/api/users/${selectedUserId}`, {
    method: "DELETE",
  });

  if (!res) return;

  if (res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    mostrarToast(err.detail || "Error en eliminar l'usuari", "error");
    deleteModal.hide();
    return;
  }

  deleteModal.hide();
  document.getElementById("select-usuari").value = "";
  document.getElementById("edit-fields").classList.add("d-none");
  document.getElementById("no-selection-msg").classList.remove("d-none");
  selectedUserId = null;

  mostrarToast(`Usuari "${user.usuari}" eliminat`);
  await carregarUsuaris();
}

document.addEventListener("DOMContentLoaded", async function () {
  // Protegim la pàgina: només admins
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user || user.rol !== "Admin") {
    window.location.href = "dashboard.html";
    return;
  }

  deleteModal = new bootstrap.Modal(document.getElementById("delete-modal"));

  document.getElementById("select-usuari").addEventListener("change", onSelectCanvi);
  document.getElementById("create-btn").addEventListener("click",    crearUsuari);
  document.getElementById("update-btn").addEventListener("click",    actualitzarUsuari);
  document.getElementById("delete-btn").addEventListener("click",    obrirModalEliminar);
  document.getElementById("confirm-delete-btn").addEventListener("click", confirmarEliminacio);

  await carregarUsuaris();
});
