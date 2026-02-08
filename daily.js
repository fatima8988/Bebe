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

/** ✅ Allowed emails (case-insensitive) */
const ALLOWED_EMAILS = [
  "mi423ma@gmail.com",
  "niclaskuzio@icloud.com"
].map(e => e.toLowerCase());

/** ✅ Elements (make sure daily.html has these IDs) */
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const who = document.getElementById("who");
const appArea = document.getElementById("appArea");

const dateEl = document.getElementById("date");      // <input type="date" id="date">
const textEl = document.getElementById("text");      // <input id="text">
const addBtn = document.getElementById("addBtn");    // <button id="addBtn">
const statusEl = document.getElementById("status");  // <span id="status">

const todayBox = document.getElementById("todayBox");    // <div id="todayBox">
const newPickBtn = document.getElementById("newPickBtn");// <button id="newPickBtn">
const listEl = document.getElementById("list");          // <div id="list">

/** Local cache */
let remindersCache = [];
let randomOffset = 0;

/** ---------- Auth buttons ---------- */
loginBtn.onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error("Sign-in error:", e);
    who.textContent = `${e?.code || ""} — ${e?.message || "Unknown error"}`;
  }
};

logoutBtn.onclick = async () => signOut(auth);

/** ---------- Helpers ---------- */
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

/** Stockholm date key: YYYY-MM-DD */
function dayKeyStockholm() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (t) => parts.find(p => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Simple deterministic hash */
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Pick "today's" reminder:
 * 1) if any reminder scheduled for today's date -> pick from those
 * 2) else pick deterministically from unscheduled ones
 */
function pickToday(reminders) {
  if (!reminders.length) return "Add your first reminder 💗";

  const today = dayKeyStockholm();

  const scheduled = reminders.filter(r => (r.date || "") === today);
  if (scheduled.length) {
    const idx = randomOffset % scheduled.length;
    return scheduled[idx]?.text || "💗";
  }

  const unscheduled = reminders.filter(r => !(r.date || "").trim());
  if (!unscheduled.length) return "No unscheduled reminders left 💗";

  const base = hashString(today);
  const idx = (base + randomOffset) % unscheduled.length;
  return unscheduled[idx]?.text || "💗";
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
      <div class="dailyText">
        ${escapeHtml(r.text || "")}
        ${r.date ? `<div class="dailyDate">📅 ${escapeHtml(r.date)}</div>` : ""}
      </div>
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

/** ---------- Firestore listener ---------- */
function startListener() {
  const q = query(collection(db, "dailyReminders"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    remindersCache = [];
    snap.forEach((d) => remindersCache.push({ id: d.id, ...d.data() }));

    renderToday();
    renderList(remindersCache);
  });
}

/** ---------- Auth state ---------- */
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
    return;
  }

  who.textContent = `Signed in as ${user.displayName || email}`;
  appArea.classList.remove("hidden");
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");

  startListener();
});

/** ---------- Add reminder ---------- */
addBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const email = (user.email || "").toLowerCase();
  if (!ALLOWED_EMAILS.includes(email)) return;

  const text = textEl.value.trim();
  const date = (dateEl?.value || "").trim(); // "" or "YYYY-MM-DD"

  if (!text) {
    setStatus("Write something first 💗");
    return;
  }

  try {
    setStatus("Saving…");
    await addDoc(collection(db, "dailyReminders"), {
      text,
      date, // empty means unscheduled
      authorId: user.uid,
      authorName: user.displayName || email,
      createdAt: serverTimestamp()
    });

    textEl.value = "";
    if (dateEl) dateEl.value = "";
    setStatus("Saved 💗");
    setTimeout(() => setStatus(""), 1200);
  } catch (e) {
    console.error(e);
    setStatus("Something went wrong 😭");
  }
};

/** ---------- Pick another ---------- */
newPickBtn.onclick = () => {
  randomOffset++;
  renderToday();
};
