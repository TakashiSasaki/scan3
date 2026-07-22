import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { interpretLegacyScannedIdentifier } from './identifierInterpretation';
import { getLegacyNdefReaderConstructor, LegacyNdefReader } from './legacyWebNfc';

type ScannerState = 'idle' | 'starting' | 'scanning' | 'detected' | 'stopping' | 'error' | 'unsupported';
type NfcState = 'idle' | 'starting' | 'scanning' | 'detected' | 'stopping' | 'error' | 'unsupported';
type LegacyAcquisitionSource = 'qr' | 'nfc';

export function LegacyQrScanner() {
  const navigate = useNavigate();
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [nfcState, setNfcState] = useState<NfcState>('idle');
  const [nfcError, setNfcError] = useState<string | null>(null);

  const [decodedText, setDecodedText] = useState<string | null>(null);
  const [acquisitionSource, setAcquisitionSource] = useState<LegacyAcquisitionSource | null>(null);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const startPromiseRef = useRef<Promise<any> | null>(null);
  
  const mountedRef = useRef<boolean>(false);
  const opGenRef = useRef<number>(0);
  const detectionHandledRef = useRef<boolean>(false);

  const nfcReaderRef = useRef<LegacyNdefReader | null>(null);
  const nfcAbortControllerRef = useRef<AbortController | null>(null);
  const nfcSessionGenerationRef = useRef<number>(0);
  const nfcReadingHandledRef = useRef<boolean>(false);
  
  const containerId = "legacy-qr-reader";

  const interpretation = decodedText !== null ? interpretLegacyScannedIdentifier(decodedText) : null;

  useEffect(() => {
    mountedRef.current = true;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerState('unsupported');
    }

    if (!getLegacyNdefReaderConstructor()) {
      setNfcState('unsupported');
    }
    
    return () => {
      mountedRef.current = false;
      opGenRef.current += 1; // invalidate pending starts
      nfcSessionGenerationRef.current += 1;
      
      if (nfcAbortControllerRef.current) {
        nfcAbortControllerRef.current.abort();
      }
      if (nfcReaderRef.current) {
        nfcReaderRef.current.onreading = null;
        nfcReaderRef.current.onreadingerror = null;
      }
      nfcReaderRef.current = null;
      nfcAbortControllerRef.current = null;

      const cleanup = async () => {
        try {
          if (startPromiseRef.current) {
            await startPromiseRef.current.catch(() => {});
          }
          if (html5QrCodeRef.current?.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          if (html5QrCodeRef.current) {
            (html5QrCodeRef.current as any).clear();
          }
        } catch (err) {
          console.warn("Scanner cleanup error:", err);
        } finally {
          html5QrCodeRef.current = null;
          startPromiseRef.current = null;
        }
      };
      cleanup();
    };
  }, []);

  const stopAndClear = async (targetState: ScannerState) => {
    opGenRef.current += 1;
    
    try {
      if (startPromiseRef.current) {
        await startPromiseRef.current.catch(() => {});
      }
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      if (html5QrCodeRef.current) {
        (html5QrCodeRef.current as any).clear();
      }
    } catch (err: any) {
      console.warn("Camera stop/clear error:", err);
      if (mountedRef.current && targetState !== 'unsupported') {
        setErrorMsg(err?.message || "Failed to stop camera.");
        setScannerState('error');
        return;
      }
    } finally {
      html5QrCodeRef.current = null;
      startPromiseRef.current = null;
    }

    if (mountedRef.current) {
      setScannerState(targetState);
    }
  };

  const startScanner = async () => {
    if (nfcState === 'starting' || nfcState === 'scanning') {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerState('unsupported');
      return;
    }

    opGenRef.current += 1;
    const currentOp = opGenRef.current;
    detectionHandledRef.current = false;
    
    setScannerState('starting');
    setErrorMsg(null);
    setDecodedText(null);
    setAcquisitionSource(null);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false
        });
      }

      startPromiseRef.current = html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (text) => {
          if (currentOp !== opGenRef.current || !mountedRef.current || detectionHandledRef.current) return;
          detectionHandledRef.current = true;
          setDecodedText(text);
          setAcquisitionSource('qr');
          stopAndClear('detected');
        },
        (errorMessage) => {
          // ignore scan errors (mostly no qr code found in frame)
        }
      );

      await startPromiseRef.current;
      
      if (mountedRef.current && currentOp === opGenRef.current) {
        setScannerState('scanning');
      }
    } catch (err: any) {
      console.error("Camera start error:", err);
      if (mountedRef.current && currentOp === opGenRef.current) {
        setErrorMsg(err?.message || "Failed to start camera. Please check permissions.");
        setScannerState('error');
      }
    }
  };

  const stopScanner = () => {
    if (scannerState === 'idle' || scannerState === 'stopping') return;
    if (mountedRef.current) setScannerState('stopping');
    stopAndClear('idle');
  };

  const restartScanner = () => {
    startScanner();
  };

  const releaseNfcSession = (reader: LegacyNdefReader | null, controller: AbortController) => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
    if (reader) {
      reader.onreading = null;
      reader.onreadingerror = null;
    }
    if (nfcReaderRef.current === reader) {
      nfcReaderRef.current = null;
    }
    if (nfcAbortControllerRef.current === controller) {
      nfcAbortControllerRef.current = null;
    }
  };

  const startNfcScanner = async () => {
    if (nfcState === 'starting' || nfcState === 'scanning' || nfcState === 'stopping') return;

    const constructor = getLegacyNdefReaderConstructor();
    if (!constructor) {
      setNfcState('unsupported');
      return;
    }

    if (scannerState === 'starting' || scannerState === 'scanning' || scannerState === 'stopping') {
      await stopAndClear('idle');
    }

    nfcSessionGenerationRef.current += 1;
    const currentGen = nfcSessionGenerationRef.current;
    nfcReadingHandledRef.current = false;
    
    setNfcError(null);
    setDecodedText(null);
    setAcquisitionSource(null);
    setNfcState('starting');

    const abortController = new AbortController();
    nfcAbortControllerRef.current = abortController;

    let reader: LegacyNdefReader | null = null;
    try {
      reader = new constructor();
      nfcReaderRef.current = reader;

      reader.onreading = (event) => {
        if (!mountedRef.current) return;
        if (currentGen !== nfcSessionGenerationRef.current) return;
        if (nfcReadingHandledRef.current) return;
        nfcReadingHandledRef.current = true;
        
        setDecodedText(event.serialNumber);
        setAcquisitionSource('nfc');
        setNfcState('detected');
        
        releaseNfcSession(reader, abortController);
      };

      reader.onreadingerror = (event) => {
        if (currentGen !== nfcSessionGenerationRef.current) return;
        releaseNfcSession(reader, abortController);
        if (mountedRef.current) {
          setNfcError("NFC reading error occurred.");
          setNfcState('error');
        }
      };

      await reader.scan({ signal: abortController.signal });

      if (mountedRef.current && currentGen === nfcSessionGenerationRef.current) {
        setNfcState('scanning');
      }
    } catch (err: unknown) {
      releaseNfcSession(reader, abortController);
      
      if (!mountedRef.current) return;
      if (currentGen !== nfcSessionGenerationRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      
      let msg = "Failed to start NFC scan.";
      if (err instanceof Error) {
        msg = err.message;
      }
      console.warn("NFC scan failure:", err);
      setNfcError(msg);
      setNfcState('error');
    }
  };
  const cancelNfcScanner = () => {
    nfcSessionGenerationRef.current += 1;
    setNfcState('stopping');
    if (nfcAbortControllerRef.current) {
      nfcAbortControllerRef.current.abort();
    }
    if (nfcReaderRef.current) {
      nfcReaderRef.current.onreading = null;
      nfcReaderRef.current.onreadingerror = null;
    }
    nfcReaderRef.current = null;
    nfcAbortControllerRef.current = null;
    if (mountedRef.current) {
      setNfcState('idle');
    }
  };

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-header">
        <span className="qr-scanner-status">Status: {scannerState}</span>
        <div className="qr-scanner-controls">
          {(scannerState === 'idle' || scannerState === 'error') && nfcState !== 'starting' && nfcState !== 'scanning' ? (
            <button className="qr-btn" onClick={startScanner}>Start Camera</button>
          ) : null}
          {scannerState === 'scanning' || scannerState === 'starting' ? (
            <button className="qr-btn qr-btn-stop" onClick={stopScanner}>Stop Camera</button>
          ) : null}
          {scannerState === 'detected' && nfcState !== 'starting' && nfcState !== 'scanning' && nfcState !== 'stopping' ? (
            <button className="qr-btn" onClick={restartScanner}>Scan Again</button>
          ) : null}
        </div>
      </div>

      {scannerState === 'unsupported' && (
        <div className="qr-error">
          <strong>Unsupported Environment:</strong> Camera APIs (getUserMedia) are not available in this browser or context.
        </div>
      )}

      <div 
        id={containerId} 
        className="qr-scanner-viewport" 
        style={{ display: (scannerState === 'scanning' || scannerState === 'starting' || scannerState === 'stopping') ? 'block' : 'none' }}
      ></div>

      <div className="nfc-scanner-section">
        <div className="qr-scanner-header" style={{ marginTop: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
          <span className="qr-scanner-status">NFC Status: {nfcState}</span>
          <div className="qr-scanner-controls">
            {(nfcState === 'idle' || nfcState === 'error' || nfcState === 'detected') ? (
              <button className="qr-btn" onClick={startNfcScanner}>Start NFC Scan</button>
            ) : null}
            {nfcState === 'scanning' || nfcState === 'starting' ? (
              <button className="qr-btn qr-btn-stop" onClick={cancelNfcScanner}>Cancel NFC Scan</button>
            ) : null}
          </div>
        </div>
        {nfcState === 'unsupported' && (
          <div className="qr-error">
            <strong>Unsupported Environment:</strong> Web NFC is not available in this browser or context.
          </div>
        )}
        {nfcState === 'error' && nfcError && (
          <div className="qr-error">
            <strong>NFC Error:</strong> {nfcError}
          </div>
        )}
        <div className="qr-notice" style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
          Web NFC requires a supported browser, Android device, NFC hardware, and secure context.
        </div>
      </div>

      {decodedText !== null && interpretation && (
        <div className="qr-result">
          <div className="qr-result-field">
            <strong>Acquisition Source:</strong> {acquisitionSource === 'qr' ? 'QR code' : acquisitionSource === 'nfc' ? 'NFC serial number' : 'unknown'}
          </div>
          <div className="qr-result-field">
            <strong>Decoded Text (Raw):</strong>
            <pre>{interpretation.rawValue}</pre>
          </div>
          <div className="qr-result-field">
            <strong>Interpretation Method:</strong> {interpretation.method}
          </div>
          <div className="qr-result-field">
            <strong>Candidate Value:</strong> {interpretation.candidateValue}
          </div>
          <div className="qr-result-field">
            <strong>Normalized Legacy Identifier:</strong>{' '}
            {interpretation.usable ? interpretation.normalizedIdentifier : '(empty)'}
          </div>
          <div className="qr-result-field">
            <strong>Usability:</strong> {interpretation.usable ? 'usable' : 'empty'}
          </div>
          {!interpretation.usable && (
            <div className="qr-notice">
              No usable legacy identifier was produced.
            </div>
          )}
          {interpretation.usable && (
            <div style={{ marginTop: '1rem' }}>
              <button
                className="qr-btn"
                onClick={() => navigate(`/app/legacy/item/${encodeURIComponent(interpretation.normalizedIdentifier)}`)}
              >
                Open Legacy Item
              </button>
            </div>
          )}
        </div>
      )}

      {scannerState === 'error' && errorMsg && (
        <div className="qr-error">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}
    </div>
  );
}

