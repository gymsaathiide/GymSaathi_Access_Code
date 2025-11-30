import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Plug, Settings, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import api from '@/lib/api';
import type { Integration } from '@/types';

export default function Integrations() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'payment',
    apiKey: '',
    description: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrations } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/integrations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Integration added successfully' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({ title: 'Success', description: 'Integration removed' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/integrations/${id}/toggle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'payment',
      apiKey: '',
      description: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getTypeIcon = (type: string) => {
    const colors: Record<string, string> = {
      payment: 'text-green-600',
      email: 'text-blue-600',
      analytics: 'text-purple-600',
      storage: 'text-yellow-600',
      communication: 'text-pink-600',
    };
    return <Plug className={`h-5 w-5 ${colors[type] || 'text-gray-600'}`} />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'success',
      inactive: 'secondary',
      error: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const groupedIntegrations = integrations?.reduce((acc, integration) => {
    if (!acc[integration.type]) {
      acc[integration.type] = [];
    }
    acc[integration.type].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-integrations-title">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage third-party services and API connections
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} data-testid="button-add-integration">
              <Plus className="mr-2 h-4 w-4" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Integration</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Stripe, Mailgun, Google Analytics"
                  required
                  data-testid="input-integration-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Integration Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger data-testid="select-integration-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Enter API key"
                  required
                  data-testid="input-api-key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of integration"
                  required
                  data-testid="input-description"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-integration">
                  Add Integration
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {groupedIntegrations && Object.keys(groupedIntegrations).length > 0 ? (
          Object.entries(groupedIntegrations).map(([type, items]) => (
            <div key={type}>
              <h2 className="text-lg font-semibold capitalize mb-4">{type} Integrations</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((integration) => (
                  <Card key={integration.id} data-testid={`card-integration-${integration.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(integration.type)}
                          <div>
                            <CardTitle className="text-base">{integration.name}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {integration.description}
                            </CardDescription>
                          </div>
                        </div>
                        {getStatusBadge(integration.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {integration.lastSync && (
                        <div className="text-xs text-muted-foreground">
                          Last synced: {formatDateTime(integration.lastSync)}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={integration.status === 'active'}
                            onCheckedChange={() => toggleMutation.mutate(integration.id)}
                            data-testid={`switch-${integration.id}`}
                          />
                          <Label className="text-sm">
                            {integration.status === 'active' ? 'Active' : 'Inactive'}
                          </Label>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" data-testid={`button-settings-${integration.id}`}>
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(integration.id)}
                            data-testid={`button-delete-${integration.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plug className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No integrations configured yet</p>
              <p className="text-sm text-muted-foreground">Click "Add Integration" to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
