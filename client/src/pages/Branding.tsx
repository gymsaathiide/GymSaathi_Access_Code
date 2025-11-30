import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Palette, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import type { Gym, BrandingConfig } from '@/types';

export default function Branding() {
  const [selectedGymId, setSelectedGymId] = useState<string>('');
  const [config, setConfig] = useState<Partial<BrandingConfig>>({
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    accentColor: '#f59e0b',
    companyName: '',
    customDomain: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gyms } = useQuery<Gym[]>({
    queryKey: ['/api/gyms'],
  });

  const { data: brandingData } = useQuery<BrandingConfig>({
    queryKey: ['/api/branding', selectedGymId],
    enabled: !!selectedGymId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<BrandingConfig>) => {
      const response = await api.post(`/branding/${selectedGymId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/branding', selectedGymId] });
      toast({ title: 'Success', description: 'Branding configuration saved' });
    },
  });

  const handleSave = () => {
    if (!selectedGymId) {
      toast({ 
        title: 'Error', 
        description: 'Please select a gym first',
        variant: 'destructive'
      });
      return;
    }
    saveMutation.mutate(config);
  };

  const handleGymChange = (gymId: string) => {
    setSelectedGymId(gymId);
    if (brandingData) {
      setConfig(brandingData);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-branding-title">White-Label Branding</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize branding and appearance for each gym
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Gym</CardTitle>
              <CardDescription>Choose a gym to configure branding</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedGymId} onValueChange={handleGymChange}>
                <SelectTrigger data-testid="select-gym">
                  <SelectValue placeholder="Select a gym..." />
                </SelectTrigger>
                <SelectContent>
                  {gyms?.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id}>
                      {gym.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>Configure company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={config.companyName || ''}
                  onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                  placeholder="Enter company name"
                  data-testid="input-company-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customDomain">Custom Domain</Label>
                <Input
                  id="customDomain"
                  value={config.customDomain || ''}
                  onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
                  placeholder="gym.example.com"
                  data-testid="input-custom-domain"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={config.logoUrl || ''}
                  onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  data-testid="input-logo-url"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>Customize brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="w-20 h-10"
                    data-testid="input-primary-color"
                  />
                  <Input
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                    className="w-20 h-10"
                    data-testid="input-secondary-color"
                  />
                  <Input
                    value={config.secondaryColor}
                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                    className="w-20 h-10"
                    data-testid="input-accent-color"
                  />
                  <Input
                    value={config.accentColor}
                    onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleSave} 
            className="w-full" 
            disabled={!selectedGymId || saveMutation.isPending}
            data-testid="button-save-branding"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </div>

        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>See how your branding looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 border rounded-lg p-6" style={{ borderColor: config.primaryColor }}>
                <div className="flex items-center gap-4">
                  {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="h-12 w-12 rounded" />
                  ) : (
                    <div 
                      className="h-12 w-12 rounded flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      {config.companyName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: config.primaryColor }}>
                      {config.companyName || 'Company Name'}
                    </h3>
                    {config.customDomain && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {config.customDomain}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div 
                    className="h-10 rounded flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    Primary Button
                  </div>
                  <div 
                    className="h-10 rounded flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: config.secondaryColor }}
                  >
                    Secondary Button
                  </div>
                  <div 
                    className="h-10 rounded flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: config.accentColor }}
                  >
                    Accent Button
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config.primaryColor }} />
                    <span className="text-sm">Primary: {config.primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config.secondaryColor }} />
                    <span className="text-sm">Secondary: {config.secondaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config.accentColor }} />
                    <span className="text-sm">Accent: {config.accentColor}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
