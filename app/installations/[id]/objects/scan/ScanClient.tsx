"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Check, AlertTriangle, Loader2, Barcode, Eye, EyeOff, Camera, CameraOff } from "lucide-react";
import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser";
import { performCompleteScan } from "@/lib/actions/ObjectActions";
import { SimplifiedDirectoryItem, ScanStatus } from "@/lib/types/scanTypes";
import ScanDetailsForm from "@/components/objects/ScanDetailsForm";
import styles from "./Scan.module.css";

interface ScanClientProps {
  installationId: string;
  installationName: string;
}

type ScannerError = {
  type: 'camera' | 'permission' | 'scanning' | 'not_found' | 'unknown';
  message: string;
};

// Formats de codes-barres supportés
const SUPPORTED_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODABAR,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.AZTEC,
  BarcodeFormat.PDF_417,
];

export default function ScanClient({ installationId, installationName }: ScanClientProps) {
  const router = useRouter();
  
  // Détecter Safari/iOS une fois pour éviter de recalculer à chaque render
  const isSafari = typeof window !== 'undefined' ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent) : false;
  const isIOS = typeof window !== 'undefined' ? /iPad|iPhone|iPod/.test(navigator.userAgent) || (
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  ) : false;
  const isMobileSafari = isSafari && isIOS;

  // État du scanner
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [error, setError] = useState<ScannerError | null>(null);
  
  // Résultat du scan
  const [scanResult, setScanResult] = useState<{
    foundInDirectory: boolean;
    directoryItem?: SimplifiedDirectoryItem | null;
    foundInInstallation: boolean;
    currentQuantity: number;
    objectId?: string;
  } | null>(null);

  // Configuration du scanner
  const [scannerConfig, setScannerConfig] = useState({
    facingMode: 'environment' as 'user' | 'environment',
    torchOn: false,
  });

  // État pour les caméras disponibles
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  // Références
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<any>(null);

  // État du formulaire de détails
  const [showDetailsForm, setShowDetailsForm] = useState(false);

  // Nettoyer le scanner
  const cleanupScanner = useCallback(() => {
    // Arrêter le scanner continu
    if (scannerControlsRef.current) {
      try {
        scannerControlsRef.current.stop();
      } catch (e) {
        console.log("Erreur lors de l'arret du scanner:", e);
      }
      scannerControlsRef.current = null;
    }

    // Arrêter le stream vidéo
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Vider la référence vidéo
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Note: isScanning a été supprimé, on utilise scanStatus à la place
  }, []);

  // Démarrer le scanner
  const startScanner = useCallback(async () => {
    try {
      setScanStatus('scanning');
      setError(null);

      // Nettoyer d'abord
      cleanupScanner();

      if (typeof window === 'undefined' || !window.navigator) {
        throw new Error("Erreur de chargement de la page");
      }

      // 🆕 FALLBACK POUR L'ANCIENNE API (navigator.getUserMedia)
      const getUserMedia =
        navigator.mediaDevices?.getUserMedia ||
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia;

      if (!getUserMedia) {
        throw new Error(
          "Votre navigateur ne supporte pas l'accès à la caméra. " +
          "Mettez à jour votre navigateur ou utilisez la saisie manuelle."
        );
      }

      // Utiliser isMobileSafari déjà calculé au niveau du composant

      // ⚡ FORCER LA DEMANDE DE PERMISSION ICI
      let mediaStream: MediaStream | undefined;
      
      try {
        // Utiliser deviceId si disponible, sinon facingMode
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };

        // Ajouter deviceId si disponible
        if (currentDeviceId) {
          videoConstraints.deviceId = { exact: currentDeviceId };
        } else if (isMobileSafari) {
          // Sur iOS/Safari, forcer facingMode: 'environment' par défaut
          videoConstraints.facingMode = { ideal: scannerConfig.facingMode };
        } else {
          // Fallback vers facingMode si pas de deviceId
          videoConstraints.facingMode = scannerConfig.facingMode;
        }

        mediaStream = await getUserMedia.call(navigator.mediaDevices || navigator, {
          video: videoConstraints,
        });
      } catch (mediaError) {
        const errorMessage = mediaError instanceof Error ? mediaError.message : String(mediaError);
        
        // Si c'est une erreur de permission refusée
        if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
          throw new Error(
            (typeof window !== 'undefined' && isMobileSafari)
              ? "L'accès à la caméra a été refusé. Allez dans Réglages > Garde-Manger > Caméra pour l'autoriser."
              : "L'accès à la caméra a été refusé. Cliquez sur l'icône 🔒 dans la barre d'adresse pour autoriser l'accès."
          );
        }
        
        // Sinon, réessayer avec des contraintes minimalistes
        try {
          const fallbackConstraints: MediaTrackConstraints = {
            width: { ideal: 640 },
            height: { ideal: 480 },
          };

          if (currentDeviceId) {
            fallbackConstraints.deviceId = { exact: currentDeviceId };
          } else {
            fallbackConstraints.facingMode = { ideal: scannerConfig.facingMode };
          }

          mediaStream = await getUserMedia.call(navigator.mediaDevices || navigator, {
            video: fallbackConstraints,
          });
        } catch (secondError) {
          // Si ça échoue une deuxième fois, c'est que la caméra n'est pas disponible
          throw new Error(
            (typeof window !== 'undefined' && isMobileSafari)
              ? "Impossible d'accéder à la caméra sur Safari iOS. Essayez Chrome ou Firefox sur mobile."
              : "Impossible d'accéder à la caméra. Vérifiez que votre appareil en a une et qu'elle n'est pas utilisée."
          );
        }
      }

      if (!mediaStream) {
        throw new Error("Impossible de récupérer le flux vidéo.");
      }

      streamRef.current = mediaStream;

      // Assigner le stream à la vidéo
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(e => {
          console.error("Erreur lecture vidéo:", e);
        });
      }

      // Initialiser le codeReader si ce n'est pas déjà fait
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
        codeReaderRef.current.possibleFormats = SUPPORTED_FORMATS;
      }

      // Démarrer la détection avec la méthode scan
      if (videoRef.current && codeReaderRef.current) {
        setScannedBarcode(null);
        
        scannerControlsRef.current = codeReaderRef.current.scan(
          videoRef.current,
          (result, err) => {
            if (result && result.getText() !== scannedBarcode) {
              const barcodeText = result.getText();
              console.log(`Code detecte: ${barcodeText}`);
              stopScanner();
              handleScanComplete(barcodeText);
            }
            if (err) {
              console.error("Erreur de decodage:", err);
            }
          }
        );
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      let errorType: ScannerError['type'] = 'unknown';
      
      if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
        errorType = 'permission';
      } else if (
        errorMessage.includes('camera') ||
        errorMessage.includes('video') || 
        errorMessage.includes('MediaStream') ||
        errorMessage.includes('getUserMedia')
      ) {
        errorType = 'camera';
      }

      setError({
        type: errorType,
        message: errorMessage,
      });
      setScanStatus('error');
      cleanupScanner();
    }
  }, [scannerConfig.facingMode, cleanupScanner, scannedBarcode]);

  // Arrêter le scanner
  const stopScanner = useCallback(() => {
    cleanupScanner();
    setScanStatus('idle');
  }, [cleanupScanner]);

  // Gérer le résultat complet du scan
  const handleScanComplete = useCallback(async (barcode: string) => {
    try {
      setScannedBarcode(barcode);
      setScanStatus('processing');

      const result = await performCompleteScan(installationId, barcode);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || "Erreur de scan");
      }

      setScanResult(result.data);

      // Toujours afficher le formulaire de détails, quelle que soit la situation
      setShowDetailsForm(true);

      setScanStatus('found');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError({
        type: 'scanning',
        message: `Erreur lors de la recherche: ${errorMessage}`,
      });
      setScanStatus('error');
      startScanner();
    }
  }, [installationId, startScanner]);

  // Gestion des modales
  const handleActionSuccess = useCallback(() => {
    router.refresh();
    setTimeout(() => {
      router.push(`/installations/${installationId}?scan=success`);
    }, 500);
  }, [installationId, router]);

  const handleCloseDetailsForm = useCallback(() => {
    setShowDetailsForm(false);
    setScannedBarcode(null);
    setScanResult(null);
    startScanner();
  }, [startScanner]);

  const handleRetry = useCallback(() => {
    setScannedBarcode(null);
    setScanResult(null);
    setError(null);
    startScanner();
  }, [startScanner]);

  // Basculer la caméra
  const toggleCamera = useCallback(async () => {
    // Désactiver uniquement si aucune caméra n'est disponible ET pas sur iOS
    if (availableCameras.length === 0 && !isMobileSafari) return;
    
    stopScanner();
    
    // Basculer le facingMode (user ↔ environment)
    const newFacingMode = scannerConfig.facingMode === 'environment' ? 'user' : 'environment';
    setScannerConfig(prev => ({ ...prev, facingMode: newFacingMode }));
    
    // Trouver une caméra avec le nouveau facingMode
    let nextCamera = availableCameras.find(
      (device) => (device as { facingMode?: 'user' | 'environment' }).facingMode === newFacingMode
    );
    
    // Si aucune caméra ne correspond, utiliser la première disponible ou forcer le facingMode
    if (!nextCamera && availableCameras.length > 0) {
      nextCamera = availableCameras.find(
        (device) => device.deviceId !== currentDeviceId
      );
    }
    
    // Mettre à jour currentDeviceId (ou le mettre à null pour forcer le facingMode)
    if (nextCamera) {
      setCurrentDeviceId(nextCamera.deviceId);
    } else {
      setCurrentDeviceId(null); // Fallback : pas de deviceId → on utilisera facingMode
    }
    
    // Redémarrer le scanner avec la nouvelle caméra
    setTimeout(startScanner, 200);
  }, [stopScanner, startScanner, availableCameras, currentDeviceId, scannerConfig.facingMode, isMobileSafari]);

  // Basculer la lampe torche
  const toggleTorch = useCallback(() => {
    if (!streamRef.current) return;
    
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack && videoTrack.applyConstraints) {
      const capabilities = videoTrack.getCapabilities?.();
      
      if (capabilities && 'torch' in capabilities) {
        const newTorchState = !scannerConfig.torchOn;
        setScannerConfig(prev => ({ ...prev, torchOn: newTorchState }));
        
        // Utiliser any pour éviter les problèmes de type avec torch
        const constraints = { advanced: [{ torch: newTorchState }] as any };
        videoTrack.applyConstraints(constraints).catch(console.error);
      }
    }
  }, [scannerConfig.torchOn]);

  // Messages d'erreur
  const getErrorMessage = (type: ScannerError['type'], defaultMessage: string): string => {
    const messages: Record<ScannerError['type'], string> = {
      camera: "Impossible d'acceder a la camera. Verifiez que votre appareil a une camera.",
      permission: "Permission refusee. Veuillez autoriser l'acces a la camera pour utiliser le scanner.",
      scanning: "Erreur lors du scan. Veuillez reessayer.",
      not_found: "Aucun code-barres detecte. Essayez de mieux cadrer le code.",
      unknown: defaultMessage,
    };
    return messages[type] || defaultMessage;
  };

  // Initialiser le reader et lister les caméras disponibles
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    codeReaderRef.current.possibleFormats = SUPPORTED_FORMATS;

    // Lister les caméras disponibles au chargement
    const listCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === "videoinput");
        
        // 🔹 Ajouter facingMode personnalisé à chaque caméra
        const camerasWithFacingMode = await Promise.all(
          videoDevices.map(async (device) => {
            const label = device.label?.toLowerCase() || "";
            let facingMode: 'user' | 'environment' | 'unknown' = 'unknown';
            
            // 🔹 Deviner facingMode à partir du label
            if (label.includes('back') || label.includes('arrière') || label.includes('rear')) {
              facingMode = 'environment';
            } else if (label.includes('front') || label.includes('avant') || label.includes('selfie')) {
              facingMode = 'user';
            }
            
            // 🔹 Si on n'a pas pu deviner, essayer un stream temporaire
            if (facingMode === 'unknown' && device.deviceId) {
              try {
                const testStream = await navigator.mediaDevices.getUserMedia({
                  video: { deviceId: { exact: device.deviceId } },
                });
                const videoTrack = testStream.getVideoTracks()[0];
                const settings = videoTrack.getSettings();
                if (settings.facingMode) {
                  facingMode = settings.facingMode as 'user' | 'environment';
                }
                testStream.getTracks().forEach(track => track.stop());
              } catch (e) {
                console.warn("Impossible de détecter facingMode pour:", device.deviceId, e);
              }
            }
            
            return { ...device, facingMode };
          })
        );
        
        setAvailableCameras(camerasWithFacingMode);
        
        // 🔹 Trouver la caméra arrière par défaut
        const defaultCamera = camerasWithFacingMode.find(
          (device) => (device as { facingMode?: 'user' | 'environment' }).facingMode === 'environment'
        ) || camerasWithFacingMode[0];
        
        if (defaultCamera) {
          setCurrentDeviceId(defaultCamera.deviceId);
          // Mettre à jour facingMode dans la config
          const deviceFacingMode = (defaultCamera as { facingMode?: 'user' | 'environment' }).facingMode;
          if (deviceFacingMode) {
            setScannerConfig(prev => ({ ...prev, facingMode: deviceFacingMode }));
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des caméras:", error);
      }
    };

    listCameras();

    return () => {
      cleanupScanner();
    };
  }, [cleanupScanner]);

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Barcode size={24} />
          Scanner un objet
        </h1>
        <p className={styles.subtitle}>
          Installation: <span className={styles.installationName}>{installationName}</span>
        </p>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.scannerContainer}>
          {scanStatus === 'idle' && (
            <div className={styles.startScannerContainer}>
              <button onClick={startScanner} className={styles.startScannerButton}>
                <Barcode size={32} />
                Démarrer le scanner
              </button>
              <p className={styles.startScannerHint}>
                Pointez votre caméra vers un code-barres pour commencer
              </p>
              
              {/* Alternative : Saisie manuelle du code-barres */}
              <div className={styles.manualEntryContainer}>
                <p className={styles.manualEntryTitle}>Ou entrez manuellement un code-barres :</p>
                <div className={styles.manualEntryInputWrapper}>
                  <input
                    type="text"
                    placeholder="Ex: 3001234567890"
                    className={styles.manualEntryInput}
                    onKeyPress={async (e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget;
                        const barcode = input.value.trim();
                        if (barcode) {
                          setScannedBarcode(barcode);
                          await handleScanComplete(barcode);
                          input.value = '';
                        }
                      }
                    }}
                  />
                  <Barcode size={24} className={styles.manualEntryIcon} />
                </div>
              </div>
            </div>
          )}
          {scanStatus === 'scanning' && !scannedBarcode && (
            <div className={styles.scannerWrapper}>
              <video
                ref={videoRef}
                className={styles.videoPreview}
                playsInline={true} // Explicit pour Safari
                muted
                autoPlay
              />
              
              <div className={styles.scannerOverlay}>
                <div className={styles.scannerFrame} />
                <p className={styles.scannerHint}>
                  Pointez votre camera vers un code-barres ou QR code
                </p>
              </div>
              
              <div className={styles.scannerControls}>
                <button
                  onClick={toggleCamera}
                  className={styles.controlButton}
                  title={`Basculer vers caméra ${scannerConfig.facingMode === 'environment' ? 'avant' : 'arrière'}`}
                  disabled={availableCameras.length === 0 && !isMobileSafari}
                >
                  {scannerConfig.facingMode === 'environment' ? <Camera size={20} /> : <Camera size={20} style={{ transform: 'scaleX(-1)' }} />}
                  <span className={styles.cameraLabel}>
                    {scannerConfig.facingMode === 'environment' ? 'Arrière' : 'Avant'}
                  </span>
                </button>
                
                {scannerConfig.facingMode === 'environment' && (
                  <button
                    onClick={toggleTorch}
                    className={`${styles.controlButton} ${scannerConfig.torchOn ? styles.controlButtonActive : ''}`}
                    title={scannerConfig.torchOn ? "Éteindre la lampe" : "Allumer la lampe"}
                    disabled={!streamRef.current || scanStatus !== 'scanning'}
                  >
                    {scannerConfig.torchOn ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                )}
              </div>
            </div>
          )}

          {scanStatus === 'processing' && (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p>Recherche du produit...</p>
              <p className={styles.barcodeDisplay}>
                Code: <strong>{scannedBarcode}</strong>
              </p>
            </div>
          )}

          {error && scanStatus === 'error' && (
            <div className={styles.errorContainer}>
              {error.type === 'permission' && (
                <div className={styles.permissionError}>
                  <AlertTriangle size={48} className={styles.errorIcon} />
                  <h3>Permission requise</h3>
                  <p>{error.message}</p>
                  <p className={styles.permissionHint}>
                    Pour autoriser l'acces a la camera sur mobile :
                    <br />- Sur iOS : Allez dans Reglares {'>'} Garde-Manger {'>'} Camera
                    <br />- Sur Android : Maintenez l icone de cadenas dans la barre d adresse
                  </p>
                </div>
              )}
              
              {error.type !== 'permission' && (
                <>
                  <AlertTriangle size={48} className={styles.errorIcon} />
                  <h3>Erreur</h3>
                  <p>{error.message}</p>
                </>
              )}
              
              <div className={styles.errorActions}>
                <button onClick={handleRetry} className={styles.retryButton}>
                  <Barcode size={16} />
                  Reessayer
                </button>
                <button 
                  onClick={() => router.push(`/installations/${installationId}`)}
                  className={styles.cancelButtonInError}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            cleanupScanner();
            router.push(`/installations/${installationId}`);
          }}
          className={styles.cancelButton}
        >
          <X size={16} />
          Annuler et revenir
        </button>
      </main>

      {showDetailsForm && scanResult && scannedBarcode && (
        <ScanDetailsForm
          installationId={installationId}
          directoryItem={scanResult.directoryItem || null}
          barcode={scannedBarcode}
          currentQuantity={scanResult.currentQuantity}
          onClose={handleCloseDetailsForm}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}
