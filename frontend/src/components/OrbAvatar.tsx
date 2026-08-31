export default function OrbAvatar() {
  return (
    <div className="orb-frame" data-testid="ai-orb-avatar" aria-label="AION asistan avatarı">
      <div className="orb-halo" aria-hidden="true" />
      <img
        className="orb-image"
        src="https://static.prod-images.emergentagent.com/jobs/51639b5d-d00b-4e5c-a188-32c797f66670/images/109d69873d77f32c0490de3bf54b90def36a9ee0e32b256cbdf52f3fa1e21188.jpeg"
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}