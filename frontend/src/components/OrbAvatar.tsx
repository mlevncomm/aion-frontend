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
};

function updatePointer(event: PointerEvent<HTMLElement>) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
  const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));

  target.style.setProperty("--orb-pointer-x", `${(x * 10).toFixed(2)}px`);
  target.style.setProperty("--orb-pointer-y", `${(y * 8).toFixed(2)}px`);
  target.style.setProperty("--orb-tilt-x", `${(-y * 4.4).toFixed(2)}deg`);
  target.style.setProperty("--orb-tilt-y", `${(x * 5.4).toFixed(2)}deg`);
  target.style.setProperty("--orb-light-x", `${(48 + x * 18).toFixed(1)}%`);
  target.style.setProperty("--orb-light-y", `${(38 + y * 14).toFixed(1)}%`);
  target.style.setProperty("--orb-spec-x", `${(x * 4).toFixed(2)}px`);
  target.style.setProperty("--orb-spec-y", `${(y * 3).toFixed(2)}px`);
}

function resetPointer(event: PointerEvent<HTMLElement>) {
  const target = event.currentTarget;
  for (const [name, value] of [
    ["--orb-pointer-x", "0px"],
    ["--orb-pointer-y", "0px"],
    ["--orb-tilt-x", "0deg"],
    ["--orb-tilt-y", "0deg"],
    ["--orb-light-x", "48%"],
    ["--orb-light-y", "38%"],
    ["--orb-spec-x", "0px"],
    ["--orb-spec-y", "0px"],
  ]) target.style.setProperty(name, value);
}

function PearlArtwork() {
  return (
    <svg className="pearl-orb-svg" viewBox="0 0 400 400" role="presentation" aria-hidden="true">
      <defs>
        <clipPath id="aionPearlClip"><circle cx="200" cy="200" r="194" /></clipPath>
        <radialGradient id="aionPearlBase" cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="26%" stopColor="#eef4ff" />
          <stop offset="52%" stopColor="#c6d6ff" />
          <stop offset="75%" stopColor="#9c7ee8" />
          <stop offset="100%" stopColor="#5266d8" />
        </radialGradient>
        <linearGradient id="aionPearlRibbonA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdfdff" stopOpacity=".96" />
          <stop offset="28%" stopColor="#b6d7ff" stopOpacity=".88" />
          <stop offset="58%" stopColor="#ffffff" stopOpacity=".92" />
          <stop offset="82%" stopColor="#c17bea" stopOpacity=".76" />
          <stop offset="100%" stopColor="#526ee5" stopOpacity=".72" />
        </linearGradient>
        <linearGradient id="aionPearlRibbonB" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4ee6" stopOpacity=".84" />
          <stop offset="32%" stopColor="#f1c9ff" stopOpacity=".72" />
          <stop offset="60%" stopColor="#f8fbff" stopOpacity=".92" />
          <stop offset="100%" stopColor="#64c8f2" stopOpacity=".64" />
        </linearGradient>
        <filter id="aionPearlFlow" x="-35%" y="-35%" width="170%" height="170%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.021" numOctaves="2" seed="17" result="noise">
            <animate attributeName="baseFrequency" dur="12s" values="0.008 0.021;0.012 0.016;0.007 0.024;0.008 0.021" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="34" xChannelSelector="R" yChannelSelector="G">
            <animate attributeName="scale" dur="8s" values="28;48;34;42;28" repeatCount="indefinite" />
          </feDisplacementMap>
        </filter>
        <filter id="aionPearlBlur"><feGaussianBlur stdDeviation="11" /></filter>
        <filter id="aionPearlSoft"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>

      <g clipPath="url(#aionPearlClip)">
        <circle cx="200" cy="200" r="194" fill="url(#aionPearlBase)" />
        <ellipse className="pearl-blob pearl-blob-one" cx="104" cy="270" rx="122" ry="100" fill="#80d7f4" opacity=".42" filter="url(#aionPearlBlur)" />
        <ellipse className="pearl-blob pearl-blob-two" cx="308" cy="105" rx="132" ry="115" fill="#8353e6" opacity=".55" filter="url(#aionPearlBlur)" />
        <ellipse className="pearl-blob pearl-blob-three" cx="302" cy="310" rx="118" ry="92" fill="#b068e5" opacity=".34" filter="url(#aionPearlBlur)" />

        <g filter="url(#aionPearlFlow)" className="pearl-ribbon-field">
          <path d="M-22 232 C48 118 82 92 126 112 C173 133 147 231 192 239 C235 247 230 120 292 99 C337 84 388 121 438 165 L438 430 L-22 430 Z" fill="url(#aionPearlRibbonA)" opacity=".88" />
          <path d="M-30 322 C42 263 76 202 129 198 C193 194 171 318 230 318 C284 318 291 219 354 204 C390 196 420 212 438 224 L438 430 L-30 430 Z" fill="url(#aionPearlRibbonB)" opacity=".74" />
          <path d="M66 -20 C112 45 119 126 156 151 C198 179 234 113 268 64 C300 17 344 3 414 25 L414 -20 Z" fill="#c8a5f5" opacity=".5" />
          <path d="M78 30 C136 65 128 177 183 189 C235 201 255 99 320 73" fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="25" strokeLinecap="round" filter="url(#aionPearlSoft)" />
          <path d="M61 71 C132 104 112 218 178 236 C248 255 278 151 350 132" fill="none" stroke="#b8cfff" strokeOpacity=".42" strokeWidth="18" strokeLinecap="round" />
        </g>

        <ellipse cx="147" cy="92" rx="86" ry="42" fill="#ffffff" opacity=".24" filter="url(#aionPearlSoft)" transform="rotate(-22 147 92)" />
        <circle cx="200" cy="200" r="191" fill="none" stroke="#ffffff" strokeOpacity=".24" strokeWidth="2" />
        <circle cx="200" cy="200" r="184" fill="none" stroke="#8e64df" strokeOpacity=".17" strokeWidth="5" />
      </g>
    </svg>
  );
}

export default function OrbAvatar({ activity = "idle", onClick }: OrbAvatarProps) {
  const baseStyle: OrbStyle = {
    "--orb-pointer-x": "0px",
    "--orb-pointer-y": "0px",
    "--orb-tilt-x": "0deg",
    "--orb-tilt-y": "0deg",
    "--orb-light-x": "48%",
    "--orb-light-y": "38%",
    "--orb-spec-x": "0px",
    "--orb-spec-y": "0px",
  };

  const orbContent = (
    <>
      <span className="pearl-orb-aura pearl-orb-aura-far" aria-hidden="true" />
      <span className="pearl-orb-aura pearl-orb-aura-near" aria-hidden="true" />
      <span className="pearl-orb-ring pearl-orb-ring-outer" aria-hidden="true" />
      <span className="pearl-orb-ring pearl-orb-ring-inner" aria-hidden="true" />
      <span className="pearl-orb-motes" aria-hidden="true" />
      <span className="pearl-orb-pulse" aria-hidden="true" />
      <span className="pearl-orb-stage" aria-hidden="true">
        <span className="pearl-orb-sphere">
          <PearlArtwork />
          <span className="pearl-orb-glass" />
          <span className="pearl-orb-highlight" />
          <span className="pearl-orb-edge" />
        </span>
      </span>
      <span className="pearl-orb-shadow" aria-hidden="true" />
    </>
  );

  const shared = {
    className: `orb-frame pearl-orb is-${activity}${onClick ? " is-interactive" : ""}`,
    "data-activity": activity,
    "data-testid": "ai-orb-avatar",
    onPointerMove: updatePointer,
    onPointerLeave: resetPointer,
    onPointerCancel: resetPointer,
    style: baseStyle,
  };

  if (onClick) {
    return <button type="button" {...shared} onClick={onClick} aria-label="AION ile konuşmak için dokun" aria-pressed={activity === "listening"}>{orbContent}</button>;
  }
  return <div {...shared} aria-label="AION asistan avatarı">{orbContent}</div>;
}
