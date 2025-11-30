import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Loader2, QrCode, CameraOff, LogIn, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

type ScanResult = {
  status: 'checked_in' | 'error';
  code?: string;
  message: string;
  record?: {
    id: string;
    checkInTime: string;
    checkOutTime?: string;
    status: string;
    exitType?: string;
    source: string;
  };
};

interface QrScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QrScanner({ isOpen, onClose }: QrScannerProps) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processingQr, setProcessingQr] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScannedRef = useRef<string | null>(null);

  const scanMutation = useMutation({
    mutationFn: async (qrData: string) => {
      const response = await apiRequest('POST', '/api/member/attendance/scan', { qrData });
      const data = await response.json();
      if (!response.ok) {
        throw data;
      }
      return data;
    },
    onSuccess: (data: ScanResult) => {
      setResult(data);
      stopScanner();
      setProcessingQr(false);
      lastScannedRef.current = null;
      
      toast({
        title: 'Checked In!',
        description: data.message,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/member/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/attendance/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    },
    onError: (error: any) => {
      stopScanner();
      setProcessingQr(false);
      lastScannedRef.current = null;

      if (error.code === 'ALREADY_IN_GYM') {
        setResult({
          status: 'error',
          code: 'ALREADY_IN_GYM',
          message: error.message || "You are already checked in. Use the Check Out button to leave.",
        });
        toast({
          title: 'Already Checked In',
          description: "You're already in the gym. Use the Check Out button to leave.",
        });
      } else {
        setResult({
          status: 'error',
          message: error.message || 'Failed to process QR code',
        });
        toast({
          title: 'Error',
          description: error.message || 'Failed to process QR code',
          variant: 'destructive',
        });
      }
    },
  });

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        console.log('Scanner already stopped');
      }
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setCameraError(null);
    setResult(null);
    setProcessingQr(false);
    lastScannedRef.current = null;
    
    if (!containerRef.current) return;

    try {
      scannerRef.current = new Html5Qrcode('qr-reader');
      
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (processingQr || lastScannedRef.current === decodedText || scanMutation.isPending) {
            return;
          }
          
          setProcessingQr(true);
          lastScannedRef.current = decodedText;
          scanMutation.mutate(decodedText);
        },
        () => {}
      );
      
      setScanning(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.message || 'Failed to access camera. Please ensure camera permissions are granted.');
      setScanning(false);
    }
  }, [scanMutation, processingQr]);

  useEffect(() => {
    if (isOpen && !scanning && !result) {
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scanning, result, startScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleClose = () => {
    stopScanner();
    setResult(null);
    setCameraError(null);
    setProcessingQr(false);
    lastScannedRef.current = null;
    onClose();
  };

  const handleTryAgain = () => {
    setResult(null);
    setCameraError(null);
    setProcessingQr(false);
    lastScannedRef.current = null;
    startScanner();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan Gym QR to Check In
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 pt-2">
          {!result && !cameraError && (
            <div className="relative">
              <div
                id="qr-reader"
                ref={containerRef}
                className="w-full rounded-lg overflow-hidden bg-black"
                style={{ minHeight: 300 }}
              />
              {scanning && !processingQr && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-primary rounded-lg animate-pulse" />
                </div>
              )}
              {!scanning && !processingQr && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              {processingQr && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <p className="text-white text-sm">Processing...</p>
                </div>
              )}
            </div>
          )}

          {cameraError && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-destructive/10 p-4">
                <CameraOff className="h-12 w-12 text-destructive" />
              </div>
              <div className="text-center">
                <p className="font-medium">Camera Access Denied</p>
                <p className="text-sm text-muted-foreground mt-1">{cameraError}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={handleTryAgain}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className={`rounded-full p-4 ${
                result.status === 'error' 
                  ? result.code === 'ALREADY_IN_GYM'
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : 'bg-destructive/10'
                  : 'bg-green-100 dark:bg-green-900/30'
              }`}>
                {result.status === 'error' ? (
                  result.code === 'ALREADY_IN_GYM' ? (
                    <AlertCircle className="h-12 w-12 text-amber-600" />
                  ) : (
                    <XCircle className="h-12 w-12 text-destructive" />
                  )
                ) : (
                  <LogIn className="h-12 w-12 text-green-600" />
                )}
              </div>
              <div className="text-center">
                <p className={`font-medium text-lg ${
                  result.status === 'error'
                    ? result.code === 'ALREADY_IN_GYM'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-destructive'
                    : 'text-green-700 dark:text-green-400'
                }`}>
                  {result.status === 'checked_in' ? 'Checked In!' : 
                   result.code === 'ALREADY_IN_GYM' ? 'Already In Gym' : 'Error'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                {result.record && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Check-in time: {new Date(result.record.checkInTime).toLocaleTimeString()}
                  </p>
                )}
              </div>
              <Button onClick={handleClose} className="mt-2">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
