(function () {
  // menu mobile
  const btn = document.getElementById("menuBtn");
  const nav = document.getElementById("mobileNav");
  if (btn && nav) {
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", (e) => {
      if (e.target && e.target.tagName === "A") {
        nav.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ano
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();
