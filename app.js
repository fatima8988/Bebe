document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openBtn");
  const intro = document.getElementById("intro");
  const main = document.getElementById("main");

  if (!openBtn || !intro || !main) {
    console.error("Missing elements:", { openBtn, intro, main });
    return;
  }

  openBtn.addEventListener("click", () => {
    intro.classList.add("hidden");
    main.classList.remove("hidden");
  });
});
// Floating hearts
(function floatingHearts() {
  const layer = document.querySelector(".hearts");
  if (!layer) return;

  const hearts = ["💗", "💕", "💖", "💘", "❤️"];

  function spawn() {
    const h = document.createElement("div");
    h.className = "heart";
    h.textContent = hearts[Math.floor(Math.random() * hearts.length)];

    const left = Math.random() * 100;       // vw
    const size = 14 + Math.random() * 18;   // px
    const duration = 5 + Math.random() * 6; // seconds
    const drift = (Math.random() * 2 - 1) * 40; // px side drift

    h.style.left = left + "vw";
    h.style.fontSize = size + "px";
    h.style.animationDuration = duration + "s";
    h.style.transform = `translateX(${drift}px)`;

    layer.appendChild(h);
    setTimeout(() => h.remove(), duration * 1000);
  }

  // Spawn a few at start + then continuously
  for (let i = 0; i < 8; i++) spawn();
  setInterval(spawn, 700);
})();
// Sparkles on click
document.addEventListener("click", (e) => {
  const s = document.createElement("div");
  s.textContent = "✨";
  s.style.position = "fixed";
  s.style.left = e.clientX + "px";
  s.style.top = e.clientY + "px";
  s.style.transform = "translate(-50%, -50%)";
  s.style.pointerEvents = "none";
  s.style.opacity = "0.9";
  s.style.transition = "all 700ms ease";
  s.style.zIndex = "9999";

  document.body.appendChild(s);

  requestAnimationFrame(() => {
    s.style.top = (e.clientY - 40) + "px";
    s.style.opacity = "0";
    s.style.filter = "blur(0.5px)";
  });

  setTimeout(() => s.remove(), 750);
});
