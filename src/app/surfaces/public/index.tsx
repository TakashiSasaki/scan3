import DevelopmentShortcuts from '../../components/DevelopmentShortcuts';

export default function PublicSurface() {
  return (
    <div className="surface">
      <DevelopmentShortcuts />
      <h1 className="surface-title">Public Surface</h1>
      <p className="surface-status">Status: foundation</p>
      <p className="surface-description">Purpose: Public landing surface</p>
    </div>
  );
}
