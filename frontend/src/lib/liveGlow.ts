import type { PointerEvent as ReactPointerEvent } from "react";

function positionGlow(event: ReactPointerEvent<HTMLElement>, opacity: string): void {
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--glow-x", `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty("--glow-y", `${event.clientY - bounds.top}px`);
  event.currentTarget.style.setProperty("--glow-opacity", opacity);
}

export const liveGlowHandlers = {
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => positionGlow(event, "1"),
  onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => positionGlow(event, "1"),
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => positionGlow(event, "1"),
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => positionGlow(event, "0"),
  onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => positionGlow(event, "0"),
};