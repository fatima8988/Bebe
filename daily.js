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

const textEl = document.getElementById("text");
const addBtn = document.getElementById("addBtn");
const statusEl = document.getElementById("status");

const todayBox = document.getElementById("todayBox");
const newPickBtn = document.getElementById("newPickBtn");
const listEl = document.getElementById("list");

let remindersCache = [];
let randomOffset = 0;

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

// “day key” by local device date (good enough for you two)
function dayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickToday(reminders) {
  if (!reminders.length) return "Add your first reminder 💗";
  const base = hashString(dayKey());
  const idx = (base + randomOffset) % reminders.length;
  return reminders[idx]?.text || "💗";
}

function renderToday() {
  todayBox.textContent = pickToday(remindersCache);
}

function renderList(reminders) {
  listEl.innerHTML = "";

  reminders.forEach((r) => {
    const row = document.createElement("div");
    row.className = "dailyRow";
    row.innerHTML = `
      <div class="dailyText">${escapeHtml(r.text || "")}</div>
      <button class="deleteBtn" title="Delete">🗑</button>
    `;

    row.querySelector(".deleteBtn").onclick = async () => {
      if (!confirm("Delete this reminder? 💔")) return;
      try {
        await deleteDoc(doc(db, "dailyReminders", r.id));
      } catch (e) {
        console.error(e);
        alert("Could not delete 😭");
      }
    };

    listEl.appendChild(row);
  });
}

function startListener() {
  const q = query(collection(db, "dailyReminders"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    remindersCache = [];
    snap.forEach((d) => remindersCache.push({ id: d.id, ...d.data() }));
    renderToday();
    renderList(remindersCache);
  });
}

/* ---------- AUTH ---------- */

// Handle redirect return (mobile)
getRedirectResult(auth).catch((e) => {
  // Ignore “no redirect in progress” type states, show real errors
  if (e?.code && e.code !== "auth/no-auth-event") {
    console.error("Redirect result error:", e);
    who.textContent = `${e?.code || ""} — ${e?.message || "Unknown error"}`;
  }
});

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

/* ---------- APP ---------- */

addBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const email = (user.email || "").toLowerCase();
  if (!ALLOWED_EMAILS.includes(email)) return;

  const text = textEl.value.trim();
  if (!text) {
    setStatus("Write something first 💗");
    return;
  }

  try {
    setStatus("Saving…");
    await addDoc(collection(db, "dailyReminders"), {
      text,
      authorId: user.uid,
      authorName: user.displayName || email,
      createdAt: serverTimestamp()
    });

    textEl.value = "";
    setStatus("Saved 💗");
    setTimeout(() => setStatus(""), 1200);
  } catch (e) {
    console.error(e);
    setStatus("Something went wrong 😭");
  }
};

newPickBtn.onclick = () => {
  randomOffset++;
  renderToday();
};