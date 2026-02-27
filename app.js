document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openBtn");
  const intro = document.getElementById("intro");
  const main = document.getElementById("main");

  if (!intro || !main) {
    console.error("Missing #intro or #main");
    return;
  }

  function showMain() {
    intro.classList.add("hidden");
    main.classList.remove("hidden");
    sessionStorage.setItem("enteredUniverse", "yes");
  }

  function showIntro() {
    intro.classList.remove("hidden");
    main.classList.add("hidden");
    sessionStorage.removeItem("enteredUniverse");
  }

  // ✅ If coming from "back home" or you've already entered this session
  if (location.hash === "#main" || sessionStorage.getItem("enteredUniverse") === "yes") {
    showMain();
  } else {
    showIntro();
  }

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      location.hash = "main";
      showMain();
    });
  }

  // If user manually clears hash, you can optionally show intro again:
  window.addEventListener("hashchange", () => {
    if (location.hash === "#main") showMain();
  });
});

// FLOATING HEARTS
(() => {
  const layer = document.querySelector(".hearts");
  if (!layer) return;

  const hearts = ["💗", "💕", "💖", "💘", "❤️"];

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