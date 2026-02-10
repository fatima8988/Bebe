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
  "niclaskuzio844@gmail.com"
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

function renderLetter(letter, id) {
  const div = document.createElement("div");
  div.className = "letter";

  div.innerHTML = `
    <div class="letterTop">
      ${letter.pinned ? `<span class="badge">Pinned 💗</span>` : ""}
      <div class="meta">
        ${escapeHtml(letter.authorName || "")}
        ${letter.createdAt ? " • " + formatDate(letter.createdAt) : ""}
        <button class="deleteBtn" title="Delete letter">🗑</button>
    </div>
    ${letter.title ? `<h3>${escapeHtml(letter.title)}</h3>` : ""}
    <p class="letterBody">${escapeHtml(letter.body || "")}</p>
  `;

  const delBtn = div.querySelector(".deleteBtn");
  delBtn.onclick = async () => {
    if (!confirm("Delete this letter forever? 💔\n\n(You can always write it again.)")) return;
    try {
      await deleteDoc(doc(db, "letters", id));
    } catch (e) {
      console.error(e);
      alert("Could not delete 😭");
    }
  };

  return div; // ✅ IMPORTANT
}

function startListener() {
  const q = query(
    collection(db, "letters"),
    orderBy("pinned", "desc"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snap) => {
    listEl.innerHTML = "";
    snap.forEach((d) => {
      listEl.appendChild(renderLetter(d.data(), d.id));
    });
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

    setStatus("Sealed with love 💌✨");
    setTimeout(() => setStatus(""), 1500);
  } catch (e) {
    console.error(e);
    setStatus("Something went wrong 😭");
  }
};

// 💌 Heart burst when saving a letter (kept from you)
addBtn.addEventListener("click", () => {
  for (let i = 0; i < 12; i++) {
    const h = document.createElement("div");
    h.textContent = "💌";
    h.style.position = "fixed";
    h.style.left = Math.random() * 100 + "vw";
    h.style.top = "60vh";
    h.style.fontSize = "20px";
    h.style.transition = "transform 1.2s ease, opacity 1.2s ease";
    h.style.zIndex = "9999";
    document.body.appendChild(h);

    requestAnimationFrame(() => {
      h.style.transform = `translateY(-120px) scale(1.4)`;
      h.style.opacity = "0";
    });

    setTimeout(() => h.remove(), 1200);
  }
});
