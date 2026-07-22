import { SurfacePlaceholder } from '../../components/SurfacePlaceholder';
import { getSurfaceById } from '../../router/getSurface';
import { LegacyQrScanner } from './LegacyQrScanner';

export function LegacySurface() {
  const surface = getSurfaceById('legacy');
  return (
    <SurfacePlaceholder
      title={surface.label}
      status={surface.status}
      description={surface.description}
      details={
        <div className="surface-details">
          <p>This is a partial reconstruction of legacy QR acquisition. Firebase connectivity is not established.</p>
          <LegacyQrScanner />
        </div>
      }
    />
  );
}
