import { type CSSProperties, type PointerEvent } from "react";

interface OrbAvatarProps {
  activity?: "idle" | "typing" | "sending" | "listening" | "speaking";
  onClick?: () => void;
}

type OrbStyle = CSSProperties & {
  "--orb-pointer-x"?: string;
  "--orb-pointer-y"?: string;
  "--orb-tilt-x"?: string;
  "--orb-tilt-y"?: string;
  "--orb-light-x"?: string;
  "--orb-light-y"?: string;
  "--orb-spec-x"?: string;
  "--orb-spec-y"?: string;
  "--orb-floor-y"?: string;
};

function updatePointer(event: PointerEvent<HTMLElement>) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
  const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));

  target.style.setProperty("--orb-pointer-x", `${(x * 15).toFixed(2)}px`);
  target.style.setProperty("--orb-pointer-y", `${(y * 15).toFixed(2)}px`);
  target.style.setProperty("--orb-tilt-x", `${(-y * 8).toFixed(2)}deg`);
  target.style.setProperty("--orb-tilt-y", `${(x * 9).toFixed(2)}deg`);
  target.style.setProperty("--orb-light-x", `${(50 + x * 25).toFixed(1)}%`);
  target.style.setProperty("--orb-light-y", `${(42 + y * 20).toFixed(1)}%`);
  target.style.setProperty("--orb-spec-x", `${(x * 3.2).toFixed(2)}px`);
  target.style.setProperty("--orb-spec-y", `${(y * 2.4).toFixed(2)}px`);
  target.style.setProperty("--orb-floor-y", `${(-y * 1.6).toFixed(2)}px`);
}

function resetPointer(event: PointerEvent<HTMLElement>) {
  const target = event.currentTarget;
  target.style.setProperty("--orb-pointer-x", "0px");
  target.style.setProperty("--orb-pointer-y", "0px");
  target.style.setProperty("--orb-tilt-x", "0deg");
  target.style.setProperty("--orb-tilt-y", "0deg");
  target.style.setProperty("--orb-light-x", "50%");
  target.style.setProperty("--orb-light-y", "42%");
  target.style.setProperty("--orb-spec-x", "0px");
  target.style.setProperty("--orb-spec-y", "0px");
  target.style.setProperty("--orb-floor-y", "0px");
}

export default function OrbAvatar({ activity = "idle", onClick }: OrbAvatarProps) {
  const baseStyle: OrbStyle = {
    "--orb-pointer-x": "0px",
    "--orb-pointer-y": "0px",
    "--orb-tilt-x": "0deg",
    "--orb-tilt-y": "0deg",
    "--orb-light-x": "50%",
    "--orb-light-y": "42%",
    "--orb-spec-x": "0px",
    "--orb-spec-y": "0px",
    "--orb-floor-y": "0px",
  };

  const orbContent = (
    <>
      <span className="orb-reactive-aura orb-reactive-aura-one" aria-hidden="true" />
      <span className="orb-reactive-aura orb-reactive-aura-two" aria-hidden="true" />
      <span className="orb-reactive-ring orb-reactive-ring-one" aria-hidden="true" />
      <span className="orb-reactive-ring orb-reactive-ring-two" aria-hidden="true" />
      <span className="orb-pulse" aria-hidden="true" />
      <span className="orb-wave" aria-hidden="true" />

      <span className="orb-reactive-shell" aria-hidden="true">
        <span className="orb-mask">
          <span className="orb-reactive-depth" />
          <span className="orb-reactive-color orb-reactive-color-one" />
          <span className="orb-reactive-color orb-reactive-color-two" />
          <span className="orb-reactive-color orb-reactive-color-three" />
          <span className="orb-reactive-color orb-reactive-color-four" />
          <span className="orb-reactive-flow orb-reactive-flow-one" />
          <span className="orb-reactive-flow orb-reactive-flow-two" />
          <span className="orb-reactive-core" />
          <span className="orb-reactive-glass" />
          <span className="orb-reactive-specular" />
          <span className="orb-reactive-shadow" />
        </span>
      </span>

      <span className="orb-reactive-floor" aria-hidden="true" />
    </>
  );

  const shared = {
    className: `orb-frame orb-reactive is-${activity}${onClick ? " is-interactive" : ""}`,
    "data-activity": activity,
    "data-testid": "ai-orb-avatar",
    onPointerMove: updatePointer,
    onPointerLeave: resetPointer,
    onPointerCancel: resetPointer,
    style: baseStyle,
  };

  if (onClick) {
    return (
      <button
        type="button"
        {...shared}
        onClick={onClick}
        aria-label="AION ile konuşmak için dokun"
        aria-pressed={activity === "listening"}
      >
        {orbContent}
      </button>
    );
  }

  return (
    <div
      {...shared}
      aria-label="AION asistan avatarı"
    >
      {orbContent}
    </div>
  );
}
