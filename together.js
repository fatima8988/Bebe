import { auth, provider, db } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const ALLOWED_EMAILS = [
  "mi423ma@gmail.com",
  "niclaskuzio@icloud.com"
].map(e => e.toLowerCase());

// ---------- Elements ----------
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const who = document.getElementById("who");
const appArea = document.getElementById("appArea");
const todayDateEl = document.getElementById("todayDate");

const todayReminderEl = document.getElementById("todayReminder");
const remixBtn = document.getElementById("remixBtn");

const letterBox = document.getElementById("letterBox");
const collageEl = document.getElementById("collage");

const songTitleEl = document.getElementById("songTitle");
const songLinkEl = document.getElementById("songLink");
const addSongBtn = document.getElementById("addSongBtn");
const songsListEl = document.getElementById("songsList");

// ---------- State ----------
let reminders = [];
let reminderOffset = 0;

// ---------- Helpers ----------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function stockholmTodayKey() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function stockholmPrettyDate() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Stockholm",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickTodayReminder() {
  if (!reminders.length) return "Add your first reminder 💗";
  const base = hashString(stockholmTodayKey());
  const idx = (base + reminderOffset) % reminders.length;
  return reminders[idx]?.text || "💗";
}

// ---------- Auth ----------
loginBtn.onclick = async () => {
  try { await signInWithPopup(auth, provider); }
  catch (e) { console.error(e); who.textContent = "Sign in failed 😭"; }
};

logoutBtn.onclick = async () => signOut(auth);

// ---------- Listeners ----------
function listenReminders() {
  const q = query(collection(db, "dailyReminders"), orderBy("createdAt", "desc"));
  onSnapshot(q, snap => {
    reminders = [];
    snap.forEach(d => reminders.push({ id: d.id, ...d.data() }));
    todayReminderEl.textContent = pickTodayReminder();
  });
}

function listenLetters() {
  const q = query(collection(db, "letters"), orderBy("createdAt", "desc"));
  onSnapshot(q, snap => {
    let pinned = null;
    let latest = null;

    snap.forEach(d => {
      const data = d.data();
      if (!latest) latest = data;
      if (!pinned && data.pinned) pinned = data;
    });

    const show = pinned || latest;
    if (!show) {
      letterBox.innerHTML = `<div class="subtle">Write your first letter 💌</div>`;
      return;
    }

    letterBox.innerHTML = `
      ${show.title ? `<div class="letterMiniTitle">${escapeHtml(show.title)}</div>` : ""}
      <div class="letterMiniBody">${escapeHtml(show.body || "")}</div>
      <div class="subtle" style="margin-top:10px;">
        ${escapeHtml(show.authorName || "")}
      </div>
      ${show.pinned ? `<div class="miniBadge">Pinned 💗</div>` : ""}
    `;
  });
}

function listenMemories() {
  const q = query(collection(db, "memories"), orderBy("createdAt", "desc"));
  onSnapshot(q, snap => {
    const imgs = [];
    snap.forEach(d => {
      const m = d.data();
      if (m.imageUrl) imgs.push(m.imageUrl);
    });

    const top = imgs.slice(0, 18);

    if (!top.length) {
      collageEl.innerHTML = `<div class="subtle">Add photos in Memories 🌸</div>`;
      return;
    }

    collageEl.innerHTML = top.map(url => `
      <div class="collageItem">
        <img src="${escapeHtml(url)}" alt="memory" loading="lazy"
          onerror="this.parentElement.style.display='none';" />
      </div>
    `).join("");
  });
}

function listenSongs() {
  const q = query(collection(db, "songs"), orderBy("createdAt", "desc"));
  onSnapshot(q, snap => {
    songsListEl.innerHTML = "";
    if (snap.empty) {
      songsListEl.innerHTML = `<div class="subtle" style="text-align:center;">Add your first song 🎶</div>`;
      return;
    }

    snap.forEach(d => {
      const s = d.data();
      const row = document.createElement("div");
      row.className = "songRow";

      const title = escapeHtml(s.title || "Song");
      const link = (s.link || "").trim();

      row.innerHTML = `
        <div class="songInfo">
          <div class="songTitle">${title}</div>
          ${link ? `<a class="songLink" href="${escapeHtml(link)}" target="_blank" rel="noopener">open link</a>` : ""}
        </div>
        <button class="deleteBtn" title="Delete">🗑</button>
      `;

      row.querySelector(".deleteBtn").onclick = async () => {
        if (!confirm("Delete this song? 💔")) return;
        await deleteDoc(doc(db, "songs", d.id));
      };

      songsListEl.appendChild(row);
    });
  });
}

addSongBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const email = (user.email || "").toLowerCase();
  if (!ALLOWED_EMAILS.includes(email)) return;

  const title = songTitleEl.value.trim();
  const link = songLinkEl.value.trim();

  if (!title) return;

  await addDoc(collection(db, "songs"), {
    title,
    link,
    authorId: user.uid,
    authorName: user.displayName || email,
    createdAt: serverTimestamp()
  });

  songTitleEl.value = "";
  songLinkEl.value = "";
};

// ---------- Boot ----------
todayDateEl.textContent = stockholmPrettyDate();

remixBtn.onclick = () => {
  reminderOffset++;
  todayReminderEl.textContent = pickTodayReminder();
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
    return;
  }

  who.textContent = `Signed in as ${user.displayName || email}`;
  appArea.classList.remove("hidden");
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");

  listenReminders();
  listenLetters();
  listenMemories();
  listenSongs();
});
