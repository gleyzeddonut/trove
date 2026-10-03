// Dismiss the boot splash once the storefront has loaded behind it (the
// app calls window.__troveBootReady), with a minimum on-screen time so the
// boot sequence reads and a hard cap so a slow/offline network can't hang
// it. Runs before the deferred module bundle, so the hook exists in time.
(function () {
  var boot = document.getElementById('boot');
  if (!boot) return;
  // Show the real registry size persisted by the previous session.
  try {
    var rs = parseInt(localStorage.getItem('trove.registrySize') || '', 10);
    var countEl = document.getElementById('boot-count');
    if (rs > 0 && countEl) countEl.textContent = rs.toLocaleString();
  } catch (e) {}
  var start = performance.now();
  var MIN = 2400; // floor so the animation + a cursor blink read
  var MAX = 9000; // ceiling so we never wait forever on the network
  var DWELL = 600; // how long the completed ✓ shows before fading
  var fired = false;
  function finish() {
    if (fired) return;
    fired = true;
    // Complete the last line with a green check (like the others) so the
    // boot sequence "finishes" before fading into the loaded store.
    var last = document.getElementById('boot-last');
    if (last) last.innerHTML = '<span class="boot-ico"><span class="ok">✓</span></span> storefront ready';
    // Stay up at least MIN total, and at least DWELL after the check shows.
    var wait = Math.max(DWELL, MIN - (performance.now() - start));
    setTimeout(function () {
      boot.classList.add('done');
      setTimeout(function () {
        if (boot.parentNode) boot.parentNode.removeChild(boot);
      }, 500);
    }, wait);
  }
  window.__troveBootReady = finish;
  setTimeout(finish, MAX);
})();
