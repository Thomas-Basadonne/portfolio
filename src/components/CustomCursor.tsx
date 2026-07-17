import { useEffect, useRef } from "react";

type CustomCursorProps = { reducedMotion: boolean };

export function CustomCursor({ reducedMotion }: CustomCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const finePointer = window.matchMedia("(pointer: fine)");
    const forcedColors = window.matchMedia("(forced-colors: active)");
    if (!cursor || !finePointer.matches || forcedColors.matches || reducedMotion) return;

    let targetX = -100;
    let targetY = -100;
    let currentX = targetX;
    let currentY = targetY;
    let frame = 0;
    let lastTime = performance.now();

    document.body.classList.add("has-custom-cursor");

    const move = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      const interactive = (event.target as HTMLElement | null)?.closest(
        "a, button, [data-cursor]",
      );
      cursor.classList.toggle("is-active", Boolean(interactive));
      cursor.classList.add("is-visible");
      if (!frame) {
        lastTime = performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    };

    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const factor = 1 - Math.exp(-18 * delta);
      currentX += (targetX - currentX) * factor;
      currentY += (targetY - currentY) * factor;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      const unsettled = Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.2;
      frame = unsettled ? window.requestAnimationFrame(tick) : 0;
    };

    const reset = () => {
      cursor.classList.remove("is-active", "is-visible");
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);
      document.body.classList.remove("has-custom-cursor");
    };
  }, [reducedMotion]);

  return (
    <div className="cursor" ref={cursorRef} aria-hidden="true">
      <span />
    </div>
  );
}
