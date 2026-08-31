export default function OrbAvatar() {
  return (
    <div className="orb-frame" data-testid="ai-orb-avatar" aria-label="AION asistan avatarı">
      <div className="orb-halo" aria-hidden="true" />
      <img
        className="orb-image"
        src="https://images.pexels.com/photos/32159928/pexels-photo-32159928.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}