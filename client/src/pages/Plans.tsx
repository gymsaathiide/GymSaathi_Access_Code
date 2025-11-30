import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Clock, IndianRupee } from 'lucide-react';
import type { MembershipPlan } from '@shared/schema';

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  duration: number;
  durationType: 'days' | 'months' | 'years';
  isActive: boolean;
}

const initialFormData: PlanFormData = {
  name: '',
  description: '',
  price: 0,
  duration: 1,
  durationType: 'months',
  isActive: true,
};

export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(initialFormData);

  const { data: plans = [], isLoading } = useQuery<MembershipPlan[]>({
    queryKey: ['/api/membership-plans'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const response = await apiRequest('POST', '/api/membership-plans', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/membership-plans'] });
      toast({ title: 'Success', description: 'Plan created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlanFormData }) => {
      const response = await apiRequest('PATCH', `/api/membership-plans/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/membership-plans'] });
      toast({ title: 'Success', description: 'Plan updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/membership-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/membership-plans'] });
      toast({ title: 'Success', description: 'Plan deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (plan?: MembershipPlan) => {
    if (plan) {
      setEditingPlan(plan);
      const duration = plan.duration;
      let durationType: 'days' | 'months' | 'years' = 'days';
      let durationValue = duration;
      
      if (duration % 365 === 0) {
        durationType = 'years';
        durationValue = duration / 365;
      } else if (duration % 30 === 0) {
        durationType = 'months';
        durationValue = duration / 30;
      }
      
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: parseFloat(plan.price),
        duration: durationValue,
        durationType,
        isActive: plan.isActive === 1,
      });
    } else {
      setEditingPlan(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
    setFormData(initialFormData);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Plan name is required', variant: 'destructive' });
      return;
    }
    if (formData.price <= 0) {
      toast({ title: 'Error', description: 'Price must be greater than 0', variant: 'destructive' });
      return;
    }
    if (formData.duration <= 0) {
      toast({ title: 'Error', description: 'Duration must be greater than 0', variant: 'destructive' });
      return;
    }

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the plan "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDuration = (days: number) => {
    if (days % 365 === 0) {
      const years = days / 365;
      return `${years} ${years === 1 ? 'Year' : 'Years'}`;
    }
    if (days % 30 === 0) {
      const months = days / 30;
      return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    }
    return `${days} ${days === 1 ? 'Day' : 'Days'}`;
  };

  const canEdit = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Membership Plans</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage membership plans for your gym
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Plan
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>Manage your gym's membership plans</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No plans created yet</p>
              {canEdit && (
                <p className="text-sm mt-2">Click "Add Plan" to create your first membership plan</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatDuration(plan.duration)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        {parseFloat(plan.price).toLocaleString('en-IN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive === 1 ? 'default' : 'secondary'}>
                        {plan.isActive === 1 ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {plan.description || '-'}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(plan.id, plan.name)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'Update the membership plan details'
                : 'Add a new membership plan for your gym'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Monthly Basic, Annual Premium"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (INR) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  className="pl-10"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationType">Period</Label>
                <Select
                  value={formData.durationType}
                  onValueChange={(value: 'days' | 'months' | 'years') =>
                    setFormData({ ...formData, durationType: value })
                  }
                >
                  <SelectTrigger id="durationType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of what's included..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Make this plan available for selection
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingPlan
                ? 'Update Plan'
                : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
