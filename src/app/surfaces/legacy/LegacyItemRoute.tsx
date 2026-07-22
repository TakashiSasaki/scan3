import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sanitizeLegacyItemId } from './identifierInterpretation';

export const LegacyItemRoute: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();

  const normalizedIdentifier = identifier ? sanitizeLegacyItemId(identifier) : '';

  if (!normalizedIdentifier) {
    return (
      <div className="surface-placeholder">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Legacy Item</h2>
        <div style={{ color: 'red', marginBottom: '1rem' }}>Invalid or empty legacy identifier.</div>
        <button
          className="qr-btn"
          onClick={() => navigate('/app/legacy')}
        >
          Back to Legacy Scanner
        </button>
      </div>
    );
  }

  return (
    <div className="surface-placeholder">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Legacy Item</h2>
      
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: '600' }}>Route Identifier</h3>
        <div style={{ color: '#333', fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '0.5rem', borderRadius: '4px' }}>{identifier}</div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: '600' }}>Normalized Legacy Identifier</h3>
        <div style={{ color: '#333', fontFamily: 'monospace', backgroundColor: '#f0f0f0', padding: '0.5rem', borderRadius: '4px' }}>{normalizedIdentifier}</div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: '600' }}>Lookup Status</h3>
        <div style={{ color: '#c2410c', backgroundColor: '#fff7ed', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fed7aa' }}>
          Item lookup is not connected yet.
        </div>
      </div>

      <button
        className="qr-btn"
        onClick={() => navigate('/app/legacy')}
      >
        Back to Legacy Scanner
      </button>
    </div>
  );
};
