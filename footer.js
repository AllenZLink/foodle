/* Foodle shared footer — injects markup into <div id="site-footer-slot"></div>.
   Detects whether the page is in a subfolder so links resolve correctly. */
(function () {
  const path = window.location.pathname;
  const inSub = /\/(hourly|unlimited)\/?$/.test(path) || /\/(hourly|unlimited)\/index\.html$/.test(path);
  const base = inSub ? "../" : "";

  const html = `
<footer class="site-footer">
  <div class="foot-wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <div class="foot-logo"><span class="brand-mark">●</span> <span class="foot-logo-name">Foodle</span></div>
        <p class="foot-desc">A daily food-themed word game. Three modes, three lengths, one slow-burn obsession.</p>
      </div>
      <nav class="foot-nav">
        <h4>Play</h4>
        <a href="${base}index.html">Daily</a>
        <a href="${base}hourly/">Hourly</a>
        <a href="${base}unlimited/">Unlimited</a>
      </nav>
      <nav class="foot-nav">
        <h4>Wordle helpers</h4>
        <a href="${base}wordle-hint-today.html">Today's hint &amp; answer</a>
        <a href="${base}hints-date.html">Archive by date</a>
      </nav>
      <nav class="foot-nav">
        <h4>About</h4>
        <a href="${base}privacy-policy.html">Privacy Policy</a>
        <a href="${base}terms-and-conditions.html">Terms &amp; Conditions</a>
        <a href="mailto:hello@foodle.game">Contact</a>
      </nav>
    </div>
    <div class="foot-meta">
      <span>© 2026 Foodle</span>
      <span class="foot-dot">·</span>
      <span>Made with butter, salt &amp; a little patience.</span>
      <span class="foot-dot">·</span>
      <span>Independent project — not affiliated with The New York Times.</span>
    </div>
  </div>
</footer>`;

  function inject() {
    const slot = document.getElementById("site-footer-slot");
    if (slot) slot.outerHTML = html;
    else document.body.insertAdjacentHTML("beforeend", html);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else inject();
})();
