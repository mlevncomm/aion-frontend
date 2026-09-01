interface OrbAvatarProps {
  activity?: "idle" | "typing" | "sending" | "listening" | "speaking";
  onClick?: () => void;
}

export default function OrbAvatar({ activity = "idle", onClick }: OrbAvatarProps) {
  const orbContent = (
    <>
      <span className="orb-wave" aria-hidden="true" />
      <div className="orb-mask">
        <div className="orb-halo" aria-hidden="true" />
        <span className="orb-fluid orb-fluid-one" aria-hidden="true" />
        <span className="orb-fluid orb-fluid-two" aria-hidden="true" />
        <span className="orb-fluid orb-fluid-three" aria-hidden="true" />
        <span className="orb-glass" aria-hidden="true" />
        <span className="orb-spectrum" aria-hidden="true">
          {Array.from({ length: 11 }, (_, index) => <i key={index} />)}
        </span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`orb-frame is-${activity} is-interactive`}
        data-activity={activity}
        data-testid="ai-orb-avatar"
        onClick={onClick}
        aria-label="AION sohbetini aç"
      >
        {orbContent}
      </button>
    );
  }

  return (
    <div
      className={`orb-frame is-${activity}`}
      data-activity={activity}
      data-testid="ai-orb-avatar"
      aria-label="AION asistan avatarı"
    >
      {orbContent}
    </div>
  );
}