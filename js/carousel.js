/*
  fkraInitCarousel — turns a track of cards into a looping horizontal
  carousel with prev/next arrows, matching the sketch (arrows on far
  left/right, cards scrolling between them, wraps around infinitely).
*/
function fkraInitCarousel(trackEl, prevBtn, nextBtn) {
  const originals = Array.from(trackEl.children);
  if (originals.length === 0) return;

  // Clone the first and last card to create the illusion of infinite loop.
  const firstClone = originals[0].cloneNode(true);
  const lastClone = originals[originals.length - 1].cloneNode(true);
  trackEl.appendChild(firstClone);
  trackEl.insertBefore(lastClone, originals[0]);

  let index = 1; // start on the first "real" card (position 1, since clone sits at 0)
  let cardWidth = 0;

  function measure() {
    const card = trackEl.children[0];
    const style = getComputedStyle(trackEl);
    const gap = parseFloat(style.gap || style.columnGap || 0);
    cardWidth = card.getBoundingClientRect().width + gap;
    jumpTo(index, false);
  }

  function jumpTo(i, animate = true) {
    trackEl.style.transition = animate ? "transform 0.35s ease" : "none";
    trackEl.style.transform = `translateX(${-i * cardWidth}px)`;
  }

  function next() {
    index++;
    jumpTo(index);
  }
  function prev() {
    index--;
    jumpTo(index);
  }

  trackEl.addEventListener("transitionend", () => {
    const total = trackEl.children.length;
    if (index >= total - 1) {
      index = 1;
      jumpTo(index, false);
    } else if (index <= 0) {
      index = total - 2;
      jumpTo(index, false);
    }
  });

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);
  window.addEventListener("resize", measure);
  measure();
}
