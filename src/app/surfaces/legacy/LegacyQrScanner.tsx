import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

type ScannerState = 'idle' | 'starting' | 'scanning' | 'detected' | 'stopping' | 'error' | 'unsupported';

export function LegacyQrScanner() {
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [decodedText, setDecodedText] = useState<string | null>(null);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const startPromiseRef = useRef<Promise<any> | null>(null);
  
  const containerId = "legacy-qr-reader";

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      const cleanup = async () => {
        try {
          if (startPromiseRef.current) {
            await startPromiseRef.current.catch(() => {});
          }
          if (html5QrCodeRef.current?.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current?.clear();
        } catch (err) {
          console.warn("Scanner cleanup error:", err);
        }
      };
      cleanup();
    };
  }, []);

  const startScanner = async () => {
    if (scannerState === 'starting' || scannerState === 'scanning') return;
    
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
          setDecodedText(text);
          setScannerState('detected');
          stopScanner(); // auto stop on detection
        },
        (errorMessage) => {
          // ignore scan errors (mostly no qr code found in frame)
        }
      );

      await startPromiseRef.current;
      setScannerState('scanning');
    } catch (err: any) {
      console.error("Camera start error:", err);
      setErrorMsg(err?.message || "Failed to start camera. Please check permissions.");
      setScannerState('error');
    }
  };

  const stopScanner = async () => {
    if (scannerState === 'idle' || scannerState === 'stopping') return;
    
    setScannerState('stopping');
    
    try {
      if (startPromiseRef.current) {
        await startPromiseRef.current.catch(() => {});
      }
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      if (scannerState !== 'detected') {
        setScannerState('idle');
      }
    } catch (err: any) {
      console.warn("Camera stop error:", err);
      setErrorMsg(err?.message || "Failed to stop camera.");
      setScannerState('error');
    }
  };

  const restartScanner = () => {
    setDecodedText(null);
    setErrorMsg(null);
    setScannerState('idle');
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

      <div 
        id={containerId} 
        className="qr-scanner-viewport" 
        style={{ display: (scannerState === 'scanning' || scannerState === 'starting') ? 'block' : 'none' }}
      ></div>

      {scannerState === 'detected' && decodedText && (
        <div className="qr-result">
          <strong>Decoded Text (Raw):</strong>
          <pre>{decodedText}</pre>
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
