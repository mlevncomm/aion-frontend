interface OrbAvatarProps {
  activity?: "idle" | "typing" | "sending";
}

export default function OrbAvatar({ activity = "idle" }: OrbAvatarProps) {
  return (
    <div
      className={`orb-frame is-${activity}`}
      data-activity={activity}
      data-testid="ai-orb-avatar"
      aria-label="AION asistan avatarı"
    >
      <span className="orb-wave" aria-hidden="true" />
      <div className="orb-mask">
        <div className="orb-halo" aria-hidden="true" />
        <img
          className="orb-image"
          src="https://static.prod-images.emergentagent.com/jobs/51639b5d-d00b-4e5c-a188-32c797f66670/images/4b028f877a3d67e5ae10295d2a6f5004405cb352c10892826036a0fc0ca2909e.jpeg"
          alt=""
          aria-hidden="true"
        />
      </div>
    </div>
  );
}