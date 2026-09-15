/* Pointer-aware 3D motion. Added progressively; the shop still works without it. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const selector = 'button:not([disabled]), a[href]:not(.wa-float), label.pay-method, .product-image[role="button"]';

  function enhance(root = document) {
    root.querySelectorAll(selector).forEach(el => {
      if (el.classList.contains('motion-3d')) return;
      el.classList.add('motion-3d');
      if (el.matches('.desktop-nav a, footer a, .text-link')) el.classList.add('nav-link-3d');
      el.addEventListener('pointermove', event => {
        if (reduce.matches || !finePointer.matches) return;
        const box = el.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        el.style.setProperty('--ry', `${(x - .5) * 14}deg`);
        el.style.setProperty('--rx', `${(.5 - y) * 12}deg`);
        el.style.setProperty('--shine-x', `${x * 100}%`);
        el.style.setProperty('--shine-y', `${y * 100}%`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
      el.addEventListener('pointerdown', () => {
        if (finePointer.matches || reduce.matches) return;
        el.classList.remove('touch-pop'); void el.offsetWidth; el.classList.add('touch-pop');
      });
      el.addEventListener('animationend', () => el.classList.remove('touch-pop'));
    });
  }
  enhance();
  new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {
    if (n.nodeType === 1) { if (n.matches?.(selector)) enhance(n.parentElement); enhance(n); }
  }))).observe(document.body, { childList: true, subtree: true });
})();
