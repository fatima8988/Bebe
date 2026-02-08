import { auth, provider, db } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const ALLOWED_EMAILS = [
  "mi423ma@gmail.com",
  "Niclaskuzio@icloud.com"
];

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const who = document.getElementById("who");
const appArea = document.getElementById("appArea");

const typeEl = document.getElementById("type");
const textEl = document.getElementById("text");
const addBtn = document.getElementById("addBtn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");

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
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function formatDate(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderItem(item, id) {
  const div = document.createElement("div");
  div.className = "hiddenItem";

  const tag = item.type === "hard" ? "🫧 Hard thing" : "🌷 Soft confession";

  div.innerHTML = `
    <div class="hiddenTop">
      <span class="hiddenTag">${tag}</span>
      <span class="hiddenMeta">${escapeHtml(item.authorName || "")}${item.createdAt ? " • " + formatDate(item.createdAt) : ""}</span>
    </div>

    <div class="hiddenBody locked" data-id="${id}">
      ${escapeHtml(item.text || "")}
    </div>

    <div class="hiddenActions">
      <button class="revealBtn">Reveal 💗</button>
      <button class="deleteBtn" title="Delete">🗑</button>
    </div>
    const delBtn = div.querySelector(".deleteBtn");

delBtn.onclick = async () => {
  if (!confirm("Delete this hidden message? 💔")) return;
  await deleteDoc(doc(db, "hiddenMessages", id));
};

  `;

  const body = div.querySelector(".hiddenBody");
  const revealBtn = div.querySelector(".revealBtn");
  const delBtn = div.querySelector(".deleteBtn");

  revealBtn.onclick = () => {
    body.classList.toggle("locked");
    revealBtn.textContent = body.classList.contains("locked") ? "Reveal 💗" : "Hide 🔒";
  };

  delBtn.onclick = async () => {
    if (!confirm("Delete this hidden message?")) return;
    await deleteDoc(doc(db, "hiddenMessages", id));
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
