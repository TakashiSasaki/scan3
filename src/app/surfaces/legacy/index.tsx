import { SurfacePlaceholder } from '../../components/SurfacePlaceholder';
import { getSurfaceById } from '../../router/getSurface';

export function LegacySurface() {
  const surface = getSurfaceById('legacy');
  return (
    <SurfacePlaceholder
      title={surface.label}
      status={surface.status}
      description={surface.description}
      details={
        <p>Target Database: Firebase / Cloud Firestore (Pending Setup)</p>
      }
    />
  );
}
