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
          <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem', listStyleType: 'disc' }}>
            <li>QR acquisition is active</li>
            <li>legacy identifier interpretation is active</li>
            <li>Web NFC serial-number acquisition is active where supported</li>
            <li>Firebase connectivity is not established</li>
            <li>item resolution is not implemented</li>
          </ul>
          <LegacyQrScanner />
        </div>
      }
    />
  );
}
