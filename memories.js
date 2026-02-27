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

/* =========================
   ✅ CONFIG (Cloudinary)
   =========================
   1) Create free Cloudinary account
   2) Settings → Upload → "Upload presets" → Add upload preset
      - Unsigned: ON
      - Folder: (optional) "our-little-universe"
   3) Put values here:
*/
const CLOUDINARY_CLOUD_NAME = "de0lxkvor";
const CLOUDINARY_UPLOAD_PRESET = "universe_upload";

const ALLOWED_EMAILS = [
  "mi423ma@gmail.com",
  "niclaskuzio844@gmail.com"
].map((e) => e.toLowerCase());

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
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

function okCloudinaryConfig() {
  return (
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_UPLOAD_PRESET &&
    !CLOUDINARY_CLOUD_NAME.includes("PUT_YOUR") &&
    !CLOUDINARY_UPLOAD_PRESET.includes("PUT_YOUR")
  );
}

/* =========================
   ✅ Upload file to Cloudinary
   ========================= */
async function uploadToCloudinary(file) {
  if (!okCloudinaryConfig()) {
    throw new Error("Cloudinary not configured (cloud name / upload preset).");
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();

  if (!res.ok) {
    // Cloudinary gives useful messages in data.error.message
    throw new Error(data?.error?.message || "Upload failed");
  }

  // secure_url is the https link
  return data.secure_url;
}

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const who = document.getElementById("who");
  const appArea = document.getElementById("appArea");

  const titleEl = document.getElementById("title");
  const descEl = document.getElementById("description");
  const imageFileEl = document.getElementById("imageFile");
  const imageUrlEl = document.getElementById("imageUrl");

  const addBtn = document.getElementById("addBtn");
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("memoriesList");

  const missing = [];
  if (!loginBtn) missing.push("loginBtn");
  if (!logoutBtn) missing.push("logoutBtn");
  if (!who) missing.push("who");
  if (!appArea) missing.push("appArea");
  if (!titleEl) missing.push("title");
  if (!descEl) missing.push("description");
  if (!imageFileEl) missing.push("imageFile");
  if (!imageUrlEl) missing.push("imageUrl");
  if (!addBtn) missing.push("addBtn");
  if (!statusEl) missing.push("status");
  if (!listEl) missing.push("memoriesList");

  if (missing.length) {
    console.error("Missing elements in memo.html:", missing);
    alert("Memo page missing IDs: " + missing.join(", "));
    return;
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  // Handle mobile redirect return
  getRedirectResult(auth).catch((e) => {
    if (e?.code && e.code !== "auth/no-auth-event") {
      console.error("Redirect result error:", e);
      who.textContent = `${e?.code || ""} — ${e?.message || "Unknown error"}`;
    }
  });

  loginBtn.onclick = async () => {
    try {
      if (isMobile()) await signInWithRedirect(auth, provider);
      else await signInWithPopup(auth, provider);
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

  function renderMemory(mem, id) {
    const div = document.createElement("div");
    div.className = "card";
    div.style.width = "260px";
    div.style.position = "relative";

    const imgHtml = mem.imageUrl
      ? `<img src="${escapeHtml(mem.imageUrl)}"
           style="width:100%; border-radius:16px; margin:10px 0; object-fit:cover;"
           loading="lazy"
           onerror="this.style.display='none';" />`
      : "";

    div.innerHTML = `
      <button class="deleteBtn" title="Delete"
        style="position:absolute; top:10px; right:10px;">🗑</button>

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
      snap.forEach((d) => listEl.appendChild(renderMemory(d.data(), d.id)));
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

  addBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return setStatus("Sign in first 💗");

    const email = (user.email || "").toLowerCase();
    if (!ALLOWED_EMAILS.includes(email)) return setStatus(`Not allowed: ${email}`);

    const title = titleEl.value.trim();
    const description = descEl.value.trim();
    const linkFallback = imageUrlEl.value.trim();

    // if file selected -> upload it
    const file = imageFileEl.files && imageFileEl.files[0] ? imageFileEl.files[0] : null;

    if (!title && !description && !file && !linkFallback) {
      return setStatus("Add something first 💗");
    }

    try {
      setStatus("Saving…");

      let finalImageUrl = linkFallback;

      if (file) {
        setStatus("Uploading photo…");
        finalImageUrl = await uploadToCloudinary(file);
      }

      await addDoc(collection(db, "memories"), {
        title,
        description,
        imageUrl: finalImageUrl || "",
        authorId: user.uid,
        authorName: user.displayName || email,
        createdAt: serverTimestamp()
      });

      titleEl.value = "";
      descEl.value = "";
      imageUrlEl.value = "";
      imageFileEl.value = "";

      setStatus("Saved 💗");
      setTimeout(() => setStatus(""), 1500);
    } catch (e) {
      console.error("SAVE/UPLOAD ERROR:", e);
      setStatus(e?.message || "Something went wrong 😭");
    }
  });
});