(function () {
  // Ano no rodapé
  var el = document.getElementById("year");
  if (el) el.textContent = String(new Date().getFullYear());

  // Menu mobile
  var btn = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");

  if (btn && nav) {
    btn.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Fecha menu ao clicar em link
    nav.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.tagName === "A") {
        nav.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    // Fecha ao clicar fora
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("open")) return;
      if (nav.contains(e.target) || btn.contains(e.target)) return;
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
  }
})();
