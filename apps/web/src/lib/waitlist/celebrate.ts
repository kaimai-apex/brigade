const COLORS = ["#e8b84b", "#1a3c34", "#c45c26", "#1e4d8c", "#8f9e7a", "#fff8e7"];

/** Burst brand-colored particles from an element (button celebration). */
export function burstCelebration(origin: HTMLElement) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const rect = origin.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  // Slightly fewer / shorter travel on narrow screens so particles stay on-screen
  const narrow = window.innerWidth < 480;
  const count = narrow ? 28 : 36;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "waitlist-burst-particle";
    el.setAttribute("aria-hidden", "true");

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = (narrow ? 56 : 80) + Math.random() * (narrow ? 90 : 140);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 40;
    const size = 6 + Math.random() * 8;
    const color = COLORS[i % COLORS.length];
    const rot = `${Math.random() * 720 - 360}deg`;
    const delay = Math.random() * 40;
    const shape = i % 3;

    el.style.setProperty("--dx", `${dx}px`);
    el.style.setProperty("--dy", `${dy}px`);
    el.style.setProperty("--rot", rot);
    el.style.setProperty("--delay", `${delay}ms`);
    el.style.width = `${size}px`;
    el.style.height = shape === 1 ? `${size * 0.4}px` : `${size}px`;
    el.style.background = color;
    el.style.borderRadius = shape === 2 ? "50%" : shape === 1 ? "2px" : "1px";
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;

    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), 1200);
  }
}
