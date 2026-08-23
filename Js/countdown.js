function fkraStartCountdown(el, endsAtISO) {
  function tick() {
    const now = new Date();
    const end = new Date(endsAtISO);
    const diff = end - now;
    if (diff <= 0) {
      el.textContent = "DROP ENDED";
      clearInterval(timer);
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(d).padStart(2, "0")}D : ${String(h).padStart(2, "0")}H : ${String(m).padStart(2, "0")}M : ${String(s).padStart(2, "0")}S`;
  }
  tick();
  const timer = setInterval(tick, 1000);
}
