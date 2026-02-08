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

/* ---------- Allowed emails ---------- */
const ALLOWED_EMAILS = [
  "mi423ma@gmail.com",
  "niclaskuzio@icloud.com"
].map(e => e.toLowerCase());

/* ---------- Elements ---------- */
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

/* ---------- State ---------- */
let remindersCache = [];
let randomOffset = 0;

/* ---------- Auth ---------- */
loginBtn.onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error(e);
    who.textContent = "Sign in failed 😭";
  }
};

logoutBtn.onclick = async () => signOut(auth);

/* ---------- Helpers ---------- */
function setStatus(msg) {
  statusEl.textContent = msg;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

/* Stable daily key (Stockholm time) */
function dayKey() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const get = t => parts.find(p => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/* Deterministic hash */
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/* Pick today’s reminder */
function pickToday(reminders) {
  if (!reminders.length) return "Add your first reminder 💗";

  const base = hashString(dayKey());
  const idx = (base + randomOffset) % reminders.length;
  return reminders[idx]?.text || "💗";
}

/* ---------- Render ---------- */
function renderToday() {
  todayBox.textContent = pickToday(remindersCache);
}

function renderList(reminders) {
  listEl.innerHTML = "";

  reminders.forEach(r => {
    const row = document.createElement("div");
    row.className = "dailyRow";

    row.innerHTML = `
      <div class="dailyText">${escapeHtml(r.text || "")}</div>
      <button class="deleteBtn" title="Delete">🗑</button>
    `;

    row.querySelector(".deleteBtn").onclick = async () => {
      if (!confirm("Delete this reminder? 💔")) return;
      await deleteDoc(doc(db, "dailyReminders", r.id));
    };

    listEl.appendChild(row);
  });
}

/* ---------- Firestore ---------- */
function startListener() {
  const q = query(
    collection(db, "dailyReminders"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {
    remindersCache = [];
    snap.forEach(d => remindersCache.push({ id: d.id, ...d.data() }));
    renderToday();
    renderList(remindersCache);
  });
}

/* ---------- Auth state ---------- */
onAuthStateChanged(auth, user => {
  if (!user) {
    appArea.classList.add("hidden");
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    who.textContent = "";
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
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");

  startListener();
});

/* ---------- Add reminder ---------- */
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

/* ---------- Pick another ---------- */
newPickBtn.onclick = () => {
  randomOffset++;
  renderToday();
};
