const fs = require('fs');
const file = 'src/app/surfaces/legacy/LegacyQrScanner.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `  const releaseNfcSession = (reader: LegacyNdefReader | null, controller: AbortController) => {
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
  };`;

const startIdx = content.indexOf('  const startNfcScanner = async () => {');
const endIdx = content.indexOf('  const cancelNfcScanner = () => {');
if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + replacement + '\n' + content.substring(endIdx);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Success");
} else {
  console.log("Failed to find boundaries");
}
