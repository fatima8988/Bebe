document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openBtn");
  const intro = document.getElementById("intro");
  const main = document.getElementById("main");

  if (!openBtn || !intro || !main) {
    console.error("Missing elements:", { openBtn, intro, main });
    return;
  }

  // ✅ If you've already entered the universe in this tab/session, skip intro
  if (sessionStorage.getItem("enteredUniverse") === "yes") {
    intro.classList.add("hidden");
    main.classList.remove("hidden");
  }

  openBtn.addEventListener("click", () => {
    intro.classList.add("hidden");
    main.classList.remove("hidden");

    // ✅ Remember for this tab/session (so "back home" goes straight to universe)
    sessionStorage.setItem("enteredUniverse", "yes");
  });
});

// FLOATING HEARTS (debug-visible)
(() => {
  const layer = document.querySelector(".hearts");
  if (!layer) {
    console.log("No .hearts element found");
    return;
  }
  console.log("Hearts running ✅");

  const hearts = ["💗","💕","💖","💘","❤️"];

  function spawn() {
    const h = document.createElement("div");
    h.className = "heart";
    h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    h.style.left = Math.random() * 100 + "vw";
    h.style.animationDuration = (4 + Math.random() * 4) + "s";
    layer.appendChild(h);
    setTimeout(() => h.remove(), 9000);
  }

  setInterval(spawn, 350);
  for (let i = 0; i < 10; i++) spawn();
})();