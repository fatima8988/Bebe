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
const bodyEl = document.getElementById("body");
const pinnedEl = document.getElementById("pinned");
const addBtn = document.getElementById("addBtn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("lettersList");

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

function formatDate(ts) {
  // Firestore Timestamp -> JS Date
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderLetter(letter) {
  const div = document.createElement("div");
  div.className = "letter";

  const badge = letter.pinned ? `<span class="badge">Pinned 💗</span>` : "";
  const title = letter.title ? `<h3>${escapeHtml(letter.title)}</h3>` : "";
  const date = `<div class="meta">${escapeHtml(letter.authorName || "")}${letter.createdAt ? " • " + formatDate(letter.createdAt) : ""}</div>`;

  div.innerHTML = `
    <div class="letterTop">
      ${badge}
      ${date}
    </div>
    ${title}
    <p class="letterBody">${escapeHtml(letter.body || "")}</p>
  `;
  return div;
}

function startListener() {
  // Note: We sort by pinned first (desc), then createdAt desc.
  // For this to work well long-term, you may be prompted to create a Firestore index (it will give you a link).
  const q = query(collection(db, "letters"), orderBy("pinned", "desc"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    listEl.innerHTML = "";
    snap.forEach((doc) => listEl.appendChild(renderLetter(doc.data())));
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
  const body = bodyEl.value.trim();
  const pinned = !!pinnedEl.checked;

  if (!title && !body) {
    setStatus("Write something first 💗");
    return;
  }

  try {
    setStatus("Saving…");
    await addDoc(collection(db, "letters"), {
      title,
      body,
      pinned,
      authorId: user.uid,
      authorName: user.displayName || email,
      createdAt: serverTimestamp()
    });

    titleEl.value = "";
    bodyEl.value = "";
    pinnedEl.checked = false;

    setStatus("Saved 💌");
    setTimeout(() => setStatus(""), 1500);
  } catch (e) {
    console.error(e);
    setStatus("Something went wrong 😭");
  }
};
