import { playLogoBuild } from "./logo-build.js";

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- entrances ----------

const GROUPS = [
  { kind: "rr-rise", base: 0, selector: ".trip .trip-head" },
  { kind: "rr-pop", base: 60, selector: ".trip .chips > li" },
  { kind: "rr-card", base: 120, selector: ".trip .tiles > li" },
];

export function enter(root) {
  for (const group of GROUPS) {
    root.querySelectorAll(group.selector).forEach((el, i) => {
      el.classList.add(group.kind);
      el.style.setProperty("--i", i);
      el.style.setProperty("--base", `${group.base}ms`);
    });
  }
  playLogoBuild(root.querySelector("[data-logo-build]"));
}

// ---------- dialogs ----------

export function closeDialog(dialog, value) {
  if (!dialog.open || dialog.classList.contains("closing")) return;
  if (reduceMotion()) return dialog.close(value);
  dialog.classList.add("closing");
  const finish = () => {
    dialog.classList.remove("closing");
    dialog.close(value);
  };
  const onEnd = (event) => {
    if (event.animationName !== "rr-dialog-out" || event.pseudoElement) return;
    dialog.removeEventListener("animationend", onEnd);
    finish();
  };
  dialog.addEventListener("animationend", onEnd);
  setTimeout(() => dialog.open && dialog.classList.contains("closing") && finish(), 250);
}

export function wireDialogs(dialogs) {
  for (const dialog of dialogs) {
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDialog(dialog);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog(dialog);
    });
    dialog.addEventListener("submit", (event) => {
      if (event.target.method !== "dialog") return;
      event.preventDefault();
      closeDialog(dialog, event.submitter?.value);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      if (!inside) closeDialog(dialog);
    });
  }
}

// ---------- small touches ----------

export function shake(el) {
  if (!el || reduceMotion() || !el.animate) return;
  el.animate(
    [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(7px)" },
      { transform: "translateX(-5px)" }, { transform: "translateX(3px)" }, { transform: "translateX(0)" }],
    { duration: 380, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
  );
}

export function staggerMenu(nav) {
  [...nav.children].forEach((el, i) => el.style.setProperty("--i", i));
}
