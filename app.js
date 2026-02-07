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
