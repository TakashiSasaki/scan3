import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { sanitizeLegacyItemId } from './identifierInterpretation';
import { createUnconfiguredLegacyItemLookupProvider, LegacyItemLookupResult } from './legacyItemLookup';
import { createFixtureLegacyItemLookupProvider } from './legacyItemFixtures';

export const LegacyItemRoute: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [lookupResult, setLookupResult] = useState<LegacyItemLookupResult | { state: 'loading' } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const normalizedIdentifier = identifier ? sanitizeLegacyItemId(identifier.toUpperCase()) : '';

  useEffect(() => {
    if (!identifier || !normalizedIdentifier) return;
    if (identifier !== normalizedIdentifier) {
      navigate(`/app/legacy/item/${encodeURIComponent(normalizedIdentifier)}${location.search}`, { replace: true });
    }
  }, [identifier, normalizedIdentifier, navigate, location.search]);

  useEffect(() => {
    if (!identifier || !normalizedIdentifier) return;
    if (identifier !== normalizedIdentifier) return;

    const abortController = new AbortController();

    const fetchItem = async () => {
      setLookupResult({ state: 'loading' });

      try {
        let provider = createUnconfiguredLegacyItemLookupProvider();

        if (import.meta.env.DEV) {
          const searchParams = new URLSearchParams(location.search);
          if (searchParams.get('lookup') === 'fixture') {
            provider = createFixtureLegacyItemLookupProvider();
          }
        }

        const result = await provider.lookup(normalizedIdentifier, { signal: abortController.signal });
        if (!abortController.signal.aborted) {
          setLookupResult(result);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        if (!abortController.signal.aborted) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setLookupResult({ state: 'error', message });
        }
      }
    };

    fetchItem();

    return () => {
      abortController.abort();
    };
  }, [identifier, normalizedIdentifier, location.search, retryCount]);

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

  if (identifier !== normalizedIdentifier) {
    return null;
  }

  const renderContent = () => {
    if (!lookupResult || lookupResult.state === 'loading') {
      return (
        <div style={{ padding: '2rem 0', textAlign: 'center', color: '#666' }}>
          Loading...
        </div>
      );
    }

    if (lookupResult.state === 'unconfigured') {
      return (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '600' }}>Provider not configured</h3>
          <div style={{ color: '#c2410c', backgroundColor: '#fff7ed', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fed7aa', marginBottom: '1rem' }}>
            No production database request was made.
          </div>
          {import.meta.env.DEV && (
            <div style={{ fontSize: '0.875rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>Try Development Fixtures:</div>
              <a href="/app/legacy/item/DEMO-ITEM-001?lookup=fixture" style={{ color: '#2563eb', textDecoration: 'underline' }}>/app/legacy/item/DEMO-ITEM-001?lookup=fixture</a>
              <a href="/app/legacy/item/MISSING-ITEM?lookup=fixture" style={{ color: '#2563eb', textDecoration: 'underline' }}>/app/legacy/item/MISSING-ITEM?lookup=fixture</a>
            </div>
          )}
        </div>
      );
    }

    if (lookupResult.state === 'not-found') {
      return (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '600', color: '#dc2626' }}>Item Not Found</h3>
          <div style={{ color: '#555', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
            The selected provider did not return an item for this identifier.
          </div>
        </div>
      );
    }

    if (lookupResult.state === 'error') {
      return (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '600', color: '#dc2626' }}>Lookup Error</h3>
          <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '4px', border: '1px solid #fecaca', marginBottom: '1rem' }}>
            {lookupResult.message}
          </div>
          <button
            style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
            onClick={() => setRetryCount(c => c + 1)}
          >
            Retry Lookup
          </button>
        </div>
      );
    }

    if (lookupResult.state === 'found') {
      const { item, source } = lookupResult;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {source === 'local-development-fixture' && (
            <div style={{ color: '#b45309', backgroundColor: '#fef3c7', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fde68a', fontSize: '0.875rem' }}>
              Warning: This is non-production fixture data.
            </div>
          )}
          <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '4px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div><strong style={{ display: 'inline-block', width: '100px' }}>Identifier:</strong> {item.id}</div>
            <div><strong style={{ display: 'inline-block', width: '100px' }}>Name:</strong> {item.name || '(none)'}</div>
            <div><strong style={{ display: 'inline-block', width: '100px' }}>Description:</strong> {item.description || '(none)'}</div>
            <div><strong style={{ display: 'inline-block', width: '100px' }}>Owner ID:</strong> {item.ownerId}</div>
            <div><strong style={{ display: 'inline-block', width: '100px' }}>Tag Type:</strong> {item.tagType || '(none)'}</div>
            <div><strong style={{ display: 'inline-block', width: '100px' }}>Created At:</strong> {item.createdAt}</div>
            <div><strong style={{ display: 'inline-block', width: '100px' }}>Updated At:</strong> {item.updatedAt}</div>
            <div><strong style={{ display: 'inline-block', width: '100px' }}>Lookup Source:</strong> {source}</div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="surface-placeholder">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Legacy Item</h2>
      
      {renderContent()}

      <button
        className="qr-btn"
        onClick={() => navigate('/app/legacy')}
      >
        Back to Legacy Scanner
      </button>
    </div>
  );
};
