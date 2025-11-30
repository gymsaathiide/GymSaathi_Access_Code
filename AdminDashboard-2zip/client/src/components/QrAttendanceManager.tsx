import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { QrCode, Download, RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type QrConfig = {
  gymId: string;
  isEnabled: boolean;
  qrData: string;
  lastRotatedAt: string;
};

export default function QrAttendanceManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const qrRef = useRef<HTMLDivElement>(null);

  const { data: config, isLoading, error } = useQuery<QrConfig>({
    queryKey: ['/api/admin/attendance/qr/config'],
  });

  const toggleMutation = useMutation({
    mutationFn: async (isEnabled: boolean) => {
      const response = await apiRequest('POST', '/api/admin/attendance/qr/toggle', { isEnabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/qr/config'] });
      toast({
        title: 'QR Attendance Updated',
        description: config?.isEnabled ? 'QR attendance has been disabled' : 'QR attendance has been enabled',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle QR attendance',
        variant: 'destructive',
      });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/attendance/qr/generate', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/qr/config'] });
      toast({
        title: 'QR Code Regenerated',
        description: 'A new QR code has been generated. Old printouts will no longer work.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate QR code',
        variant: 'destructive',
      });
    },
  });

  const downloadQrCode = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const link = document.createElement('a');
        link.download = 'gym-attendance-qr.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Failed to load QR configuration</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">QR Attendance</CardTitle>
              <CardDescription>
                Print this QR code and place it at your gym entrance
              </CardDescription>
            </div>
          </div>
          <Badge variant={config?.isEnabled ? 'default' : 'secondary'}>
            {config?.isEnabled ? (
              <><CheckCircle className="mr-1 h-3 w-3" /> Enabled</>
            ) : (
              <><XCircle className="mr-1 h-3 w-3" /> Disabled</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="qr-toggle" className="text-base">Enable QR Attendance</Label>
            <p className="text-sm text-muted-foreground">
              Members can scan this QR code to check in/out automatically
            </p>
          </div>
          <Switch
            id="qr-toggle"
            checked={config?.isEnabled || false}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
            disabled={toggleMutation.isPending}
          />
        </div>

        {config?.isEnabled && config?.qrData && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div 
              ref={qrRef}
              className="rounded-lg border bg-white p-4"
            >
              <QRCodeSVG
                value={config.qrData}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: {config.lastRotatedAt ? new Date(config.lastRotatedAt).toLocaleDateString() : 'Never'}
            </p>
          </div>
        )}

        {!config?.isEnabled && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-lg border border-dashed bg-muted/30 p-8">
              <QrCode className="h-24 w-24 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Enable QR attendance to generate a scannable code for your members
            </p>
          </div>
        )}

        {config?.isEnabled && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={downloadQrCode}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Download QR
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={regenerateMutation.isPending}
                >
                  {regenerateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate QR
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regenerate QR Code?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create a new QR code and invalidate any printed copies.
                    Members will need to scan the new code. Are you sure you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => regenerateMutation.mutate()}>
                    Regenerate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
