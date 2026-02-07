import { auth, provider, db } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const ALLOWED_EMAILS = [
  "mi423ma@gmail.com",
  "Niclaskuzio@icloud.com"
];

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
    const code = e?.code || "";
    const msg = e?.message || "Unknown error";
    document.getElementById("who").textContent = `${code} — ${msg}`;
  }
};

logoutBtn.onclick = async () => signOut(auth);

function setStatus(msg) { statusEl.textContent = msg; }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function renderMemory(mem) {
  const div = document.createElement("div");
  div.className = "card";
  div.style.width = "260px";

  const img = mem.imageUrl
    ? `<img src="${mem.imageUrl}" style="width:100%; border-radius:16px; margin-bottom:10px;" />`
    : "";

  div.innerHTML = `
    <h3 style="margin-top:0;">${escapeHtml(mem.title || "Memory")}</h3>
    ${img}
    <p style="margin:0; white-space:pre-wrap;">${escapeHtml(mem.description || "")}</p>
    <p style="margin-top:10px; font-size:12px; opacity:0.7;">${escapeHtml(mem.authorName || "")}</p>
  `;
  return div;
}

function startListener() {
  const q = query(collection(db, "memories"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    listEl.innerHTML = "";
    snap.forEach((doc) => listEl.appendChild(renderMemory(doc.data())));
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    who.textContent = "";
    appArea.classList.add("hidden");
    return;
  }

  const email = user.email || "";
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

  const email = user.email || "";
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
