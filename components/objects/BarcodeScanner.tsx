"use client";

import { useState, useRef, useEffect } from "react";
import { Barcode as BarcodeScannerIcon, X, Camera } from "lucide-react";
import styles from "./BarcodeScanner.module.css";

// Props du composant
export interface BarcodeScannerProps {
  onScan: (barcode: string) => void;  // Callback quand un code-barres est scanné
  onError?: (error: string) => void;  // Callback en cas d'erreur
  fallbackText?: string;  // Texte pour le champ de fallback
  showFallback?: boolean;  // Afficher le champ de saisie manuelle
}

export default function BarcodeScanner({
  onScan,
  onError,
  fallbackText = "Ou entrez le code-barres manuellement",
  showFallback = true,
}: BarcodeScannerProps) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Vérifier si BarcodeDetector est supporté
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // @ts-expect-error - BarcodeDetector peut ne pas être défini dans les types globaux
        const supported = "BarcodeDetector" in window;
        setIsSupported(supported);
        
        if (supported) {
          // @ts-expect-error - BarcodeDetector peut ne pas être défini dans les types globaux
          barcodeDetectorRef.current = new BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
          });
        }
      } catch (error) {
        setIsSupported(false);
      }
    };
    checkSupport();
  }, []);

  // Démarrer le scan
  const startScanning = async () => {
    try {
      setIsScanning(true);
      setScanError(null);
      setScannedBarcode(null);
      
      if (!barcodeDetectorRef.current) {
        throw new Error("BarcodeDetector non disponible");
      }

      // Accéder à la caméra
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },  // Caméra arrière
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Démarrer la détection continue
      const detectBarcode = async () => {
        if (!barcodeDetectorRef.current || !videoRef.current) return;

        try {
          const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0) {
            const barcode = barcodes[0].rawValue;
            setScannedBarcode(barcode);
            onScan(barcode);
            stopScanning();
          } else {
            requestAnimationFrame(detectBarcode);
          }
        } catch (error) {
          // Ignorer les erreurs de détection (ex: pas de code_barres détecté)
        }
      };

      requestAnimationFrame(detectBarcode);
    } catch (error: any) {
      const errorMessage = error.message || "Impossible d'accéder à la caméra";
      setScanError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false);
    }
  };

  // Arrêter le scan
  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  // Nettoyer au démontage
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  // Soumettre le code-barres manuel
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      setScannedBarcode(manualBarcode);
      onScan(manualBarcode);
      setManualBarcode("");
    }
  };

  // Afficher le message approprié selon l'état
  const renderMessage = () => {
    if (isSupported === null) {
      return <div className={`${styles.message} ${styles.messageInfo}`}>Vérification du support du scanner...</div>;
    }
    if (isSupported === false) {
      return (
        <div className={`${styles.message} ${styles.messageWarning}`}>
          <p>Le scanner de codes-barres n'est pas supporté sur cet appareil.</p>
          <p>Utilisez le champ de saisie manuelle ci-dessous.</p>
        </div>
      );
    }
    if (scanError) {
      return <div className={`${styles.message} ${styles.messageError}`}>{scanError}</div>;
    }
    return null;
  };

  return (
    <div className={styles.container}>
      {renderMessage()}

      {/* Mode caméra (si supporté et pas de fallback forcé) */}
      {!useFallback && isSupported && !showFallback && (
        <div className={styles.previewContainer}>
          <video
            ref={videoRef}
            playsInline
            muted
            className={styles.preview}
          />
          {isScanning && <div className={styles.scanZone} />}
          
          <div className={styles.actions}>
            {!isScanning ? (
              <button
                className={`${styles.btn} ${styles.btnPrimary} ${styles.detectBtn}`}
                onClick={startScanning}
              >
                <Camera size={20} />
                Scanner un code-barres
              </button>
            ) : (
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={stopScanning}
              >
                <X size={20} />
                Arrêter
              </button>
            )}
          </div>

          {scannedBarcode && (
            <div className={styles.barcodeDisplay}>
              Code détecté : {scannedBarcode}
            </div>
          )}
        </div>
      )}

      {/* Mode caméra + fallback */}
      {!useFallback && isSupported && showFallback && (
        <>
          <div className={styles.previewContainer}>
            <video
              ref={videoRef}
              playsInline
              muted
              className={styles.preview}
            />
            {isScanning && <div className={styles.scanZone} />}
            
            <div className={styles.actions}>
              {!isScanning ? (
                <button
                  className={`${styles.btn} ${styles.btnPrimary} ${styles.detectBtn}`}
                  onClick={startScanning}
                >
                  <Camera size={20} />
                  Scanner un code-barres
                </button>
              ) : (
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={stopScanning}
                >
                  <X size={20} />
                  Arrêter
                </button>
              )}
            </div>

            {scannedBarcode && (
              <div className={styles.barcodeDisplay}>
                Code détecté : {scannedBarcode}
              </div>
            )}
          </div>

          <div className={styles.fallbackIntro}>
            <span>ou </span>
            <span
              className={styles.fallbackLink}
              onClick={() => setUseFallback(true)}
            >
              {fallbackText}
            </span>
          </div>
        </>
      )}

      {/* Fallback manuel (si pas de support ou guardians l'utilisateur a choisi le fallback) */}
      {(useFallback || !isSupported) && (
        <form onSubmit={handleManualSubmit} className={styles.fallbackContainer}>
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Entrez le code-barres ici..."
            className={styles.input}
            autoFocus
          />
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
            <BarcodeScannerIcon size={20} />
            Valider
          </button>
        </form>
      )}

      {/* Bouton pour revenir au scanner */}
      {useFallback && isSupported && showFallback && (
        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => setUseFallback(false)}
          >
            <Camera size={20} />
            Utiliser le scanner
          </button>
        </div>
      )}
    </div>
  );
}
