import { auth, provider, db } from "./firebase.js";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

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
  "Niclaskuzio844@gmail.com"
].map((e) => e.toLowerCase());

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const who = document.getElementById("who");
const appArea = document.getElementById("appArea");

const typeEl = document.getElementById("type");
const textEl = document.getElementById("text");
const addBtn = document.getElementById("addBtn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function formatDate(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ---------- Redirect return handler (mobile) ---------- */
getRedirectResult(auth).catch((e) => {
  if (e?.code && e.code !== "auth/no-auth-event") {
    console.error("Redirect result error:", e);
    who.textContent = `${e?.code || ""} — ${e?.message || "Unknown error"}`;
  }
});

/* ---------- Auth ---------- */
loginBtn.onclick = async () => {
  try {
    if (isMobile()) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
  } catch (e) {
    console.error("Sign-in error:", e);
    who.textContent = `${e?.code || ""} — ${e?.message || "Unknown error"}`;
  }
};

logoutBtn.onclick = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error(e);
  }
};

function renderItem(item, id) {
  const div = document.createElement("div");
  div.className = "hiddenItem";

  const tag = item.type === "hard" ? "🫧 Hard thing" : "🌷 Soft confession";

  div.innerHTML = `
    <div class="hiddenTop">
      <span class="hiddenTag">${tag}</span>
      <span class="hiddenMeta">
        ${escapeHtml(item.authorName || "")}
        ${item.createdAt ? " • " + formatDate(item.createdAt) : ""}
      </span>
    </div>

    <div class="hiddenBody locked">${escapeHtml(item.text || "")}</div>

    <div class="hiddenActions">
      <button class="revealBtn">Reveal 💗</button>
      <button class="deleteBtn" title="Delete">🗑</button>
    </div>
  `;

  const body = div.querySelector(".hiddenBody");
  const revealBtn = div.querySelector(".revealBtn");
  const delBtn = div.querySelector(".deleteBtn");

  revealBtn.onclick = () => {
    body.classList.toggle("locked");
    revealBtn.textContent = body.classList.contains("locked") ? "Reveal 💗" : "Hide 🔒";
  };

  delBtn.onclick = async () => {
    if (!confirm("Delete this hidden message? 💔")) return;
    try {
      await deleteDoc(doc(db, "hiddenMessages", id));
    } catch (e) {
      console.error(e);
      alert("Could not delete 😭");
    }
  };

  return div;
}

function startListener() {
  const q = query(collection(db, "hiddenMessages"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    listEl.innerHTML = "";
    snap.forEach((d) => listEl.appendChild(renderItem(d.data(), d.id)));
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    who.textContent = "";
    appArea.classList.add("hidden");
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    return;
  }

  const email = (user.email || "").toLowerCase();
  if (!ALLOWED_EMAILS.includes(email)) {
    who.textContent = `Signed in as ${email} (not allowed)`;
    appArea.classList.add("hidden");
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    return;
  }

  who.textContent = `Signed in as ${user.displayName || email}`;
  appArea.classList.remove("hidden");
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");

  startListener();
});

addBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const email = (user.email || "").toLowerCase();
  if (!ALLOWED_EMAILS.includes(email)) return;

  const type = typeEl.value;
  const text = textEl.value.trim();

  if (!text) {
    setStatus("Write something first 💗");
    return;
  }

  try {
    setStatus("Locking… 🔒");

    await addDoc(collection(db, "hiddenMessages"), {
      type,
      text,
      authorId: user.uid,
      authorName: user.displayName || email,
      createdAt: serverTimestamp()
    });

    textEl.value = "";
    setStatus("Locked 🔒");
    setTimeout(() => setStatus(""), 1500);
  } catch (e) {
    console.error(e);
    setStatus("Something went wrong 😭");
  }
};