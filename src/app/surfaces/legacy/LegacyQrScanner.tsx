import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { interpretLegacyScannedIdentifier } from './identifierInterpretation';

type ScannerState = 'idle' | 'starting' | 'scanning' | 'detected' | 'stopping' | 'error' | 'unsupported';

export function LegacyQrScanner() {
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [decodedText, setDecodedText] = useState<string | null>(null);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const startPromiseRef = useRef<Promise<any> | null>(null);
  
  const mountedRef = useRef<boolean>(false);
  const opGenRef = useRef<number>(0);
  const detectionHandledRef = useRef<boolean>(false);
  
  const containerId = "legacy-qr-reader";

  const interpretation = decodedText !== null ? interpretLegacyScannedIdentifier(decodedText) : null;

  useEffect(() => {
    mountedRef.current = true;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerState('unsupported');
    }
    
    return () => {
      mountedRef.current = false;
      opGenRef.current += 1; // invalidate pending starts
      
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

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-header">
        <span className="qr-scanner-status">Status: {scannerState}</span>
        <div className="qr-scanner-controls">
          {scannerState === 'idle' || scannerState === 'error' ? (
            <button className="qr-btn" onClick={startScanner}>Start Camera</button>
          ) : null}
          {scannerState === 'scanning' || scannerState === 'starting' ? (
            <button className="qr-btn qr-btn-stop" onClick={stopScanner}>Stop Camera</button>
          ) : null}
          {scannerState === 'detected' ? (
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

      {scannerState === 'detected' && decodedText !== null && interpretation && (
        <div className="qr-result">
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
