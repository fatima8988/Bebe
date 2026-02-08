import { auth, provider, db } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const ALLOWED_EMAILS = [
  "mi423ma@gmail.com",
  "niclaskuzio@icloud.com"
].map(e => e.toLowerCase());

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const who = document.getElementById("who");
const appArea = document.getElementById("appArea");

const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");
const imageUrlEl = document.getElementById("imageUrl");
const addBtn = document.getElementById("addBtn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("memoriesList");

loginBtn.onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error("Sign-in error:", e);
    who.textContent = `${e?.code || ""} — ${e?.message || "Unknown error"}`;
  }
};

logoutBtn.onclick = async () => signOut(auth);

function setStatus(msg) { statusEl.textContent = msg; }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function renderMemory(mem, id) {
  const div = document.createElement("div");
  div.className = "card";
  div.style.width = "260px";
  div.style.position = "relative";

  const imgHtml = mem.imageUrl
    ? `<img src="${escapeHtml(mem.imageUrl)}"
         style="width:100%; border-radius:16px; margin:10px 0;"
         onerror="this.style.display='none';" />`
    : "";

  div.innerHTML = `
    <button class="deleteBtn" title="Delete" style="position:absolute; top:10px; right:10px;">🗑</button>

    <h3 style="margin-top:0;">${escapeHtml(mem.title || "Memory")}</h3>
    ${imgHtml}
    <p style="margin:0; white-space:pre-wrap;">${escapeHtml(mem.description || "")}</p>
    <p style="margin-top:10px; font-size:12px; opacity:0.7;">${escapeHtml(mem.authorName || "")}</p>
  `;

  div.querySelector(".deleteBtn").onclick = async () => {
    if (!confirm("Delete this memory? 💔")) return;
    try {
      await deleteDoc(doc(db, "memories", id));
    } catch (e) {
      console.error(e);
      alert("Could not delete 😭");
    }
  };

  return div;
}

function startListener() {
  const q = query(collection(db, "memories"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    listEl.innerHTML = "";
    snap.forEach((d) => {
      listEl.appendChild(renderMemory(d.data(), d.id));
    });
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    who.textContent = "";
    appArea.classList.add("hidden");
    return;
  }

  const email = (user.email || "").toLowerCase();
  if (!ALLOWED_EMAILS.includes(email)) {
    who.textContent = `Signed in as ${email} (not allowed)`;
    appArea.classList.add("hidden");
    return;
  }

  who.textContent = `Signed in as ${user.displayName || email}`;
  appArea.classList.remove("hidden");
  startListener();
});

addBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const email = (user.email || "").toLowerCase();
  if (!ALLOWED_EMAILS.includes(email)) return;

  const title = titleEl.value.trim();
  const description = descEl.value.trim();
  const imageUrl = imageUrlEl.value.trim();

  if (!title && !description && !imageUrl) {
    setStatus("Add something first 💗");
    return;
  }

  try {
    setStatus("Saving…");
    await addDoc(collection(db, "memories"), {
      title,
      description,
      imageUrl,
      authorId: user.uid,
      authorName: user.displayName || email,
      createdAt: serverTimestamp()
    });

    titleEl.value = "";
    descEl.value = "";
    imageUrlEl.value = "";
    setStatus("Saved 💗");
    setTimeout(() => setStatus(""), 1500);
  } catch (e) {
    console.error(e);
    setStatus("Something went wrong 😭");
  }
};
