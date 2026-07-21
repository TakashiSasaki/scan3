import React from 'react';
import { SurfaceStatus } from '../router/surfaceTypes';

interface SurfacePlaceholderProps {
  title: string;
  status: SurfaceStatus;
  description: string;
  details?: React.ReactNode;
}

export function SurfacePlaceholder({ title, status, description, details }: SurfacePlaceholderProps) {
  return (
    <div className="surface-placeholder">
      <h1 className="surface-title">{title}</h1>
      <div className="surface-status-badge">
        Status: {status}
      </div>
      <p className="surface-description">{description}</p>
      {details && (
        <div className="surface-details">
          {details}
        </div>
      )}
    </div>
  );
}
