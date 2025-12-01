import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import type { Gym, GymFormData } from '@/types';

function validateAndCleanPhone(phone: string): { isValid: boolean; cleaned: string; error?: string } {
  if (!phone || phone.trim() === '') {
    return { isValid: false, cleaned: '', error: 'Phone number is required' };
  }
  
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0091')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('091')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length >= 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  
  if (cleaned.length > 10) {
    return { isValid: false, cleaned: '', error: 'Phone number has extra digits. Please enter only 10 digits.' };
  }
  
  if (cleaned.length !== 10) {
    return { isValid: false, cleaned: '', error: `Phone must be exactly 10 digits. You entered ${cleaned.length} digits.` };
  }
  
  if (!/^[6-9]/.test(cleaned)) {
    return { isValid: false, cleaned: '', error: 'Indian mobile numbers must start with 6, 7, 8, or 9' };
  }
  
  return { isValid: true, cleaned };
}

export default function Gyms() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);
  const [formData, setFormData] = useState<GymFormData>({
    name: '',
    owner: '',
    email: '',
    phone: '',
    plan: 'starter',
    status: 'active',
    address: '',
    logoUrl: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gyms, isLoading } = useQuery<Gym[]>({
    queryKey: ['/api/gyms'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: GymFormData) => {
      console.log('Creating gym with data:', data);
      const response = await api.post('/gyms', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Gym created successfully' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GymFormData }) => {
      console.log('Updating gym with data:', data);
      const response = await api.put(`/gyms/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Gym updated successfully' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/gyms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      toast({ title: 'Success', description: 'Gym deleted successfully' });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/gyms/${id}/suspend`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gyms'] });
      toast({ title: 'Success', description: 'Gym status updated' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      owner: '',
      email: '',
      phone: '',
      plan: 'starter',
      status: 'active',
      address: '',
      logoUrl: '',
    });
    setEditingGym(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const phoneValidation = validateAndCleanPhone(formData.phone);
    if (!phoneValidation.isValid) {
      toast({
        title: 'Invalid Phone Number',
        description: phoneValidation.error,
        variant: 'destructive',
      });
      return;
    }
    
    const cleanedFormData = {
      ...formData,
      phone: '+91' + phoneValidation.cleaned,
    };
    
    if (editingGym) {
      updateMutation.mutate({ id: editingGym.id, data: cleanedFormData });
    } else {
      createMutation.mutate(cleanedFormData);
    }
  };

  const handleEdit = (gym: Gym) => {
    setEditingGym(gym);
    setFormData({
      name: gym.name,
      owner: gym.owner,
      email: gym.email,
      phone: gym.phone,
      plan: gym.plan,
      status: gym.status,
      address: gym.address,
      logoUrl: gym.logoUrl || '',
    });
    setIsDialogOpen(true);
  };

  const filteredGyms = gyms?.filter(
    (gym) =>
      gym.name.toLowerCase().includes(search.toLowerCase()) ||
      gym.owner.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getGymInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-gyms-title">Gyms Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage gym accounts and subscriptions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} data-testid="button-add-gym">
              <Plus className="mr-2 h-4 w-4" />
              Add Gym
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingGym ? 'Edit Gym' : 'Add New Gym'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Gym Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="input-gym-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner">Owner Name</Label>
                  <Input
                    id="owner"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    required
                    data-testid="input-owner-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    data-testid="input-phone"
                    placeholder="10-digit mobile number (e.g., 9876543210)"
                  />
                  <p className="text-xs text-muted-foreground">+91 will be added automatically</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select
                    value={formData.plan}
                    onValueChange={(value) => setFormData({ ...formData, plan: value })}
                  >
                    <SelectTrigger data-testid="select-plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  data-testid="input-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoImage">Gym Logo (Optional)</Label>
                <div className="flex items-center gap-4">
                  {formData.logoUrl && (
                    <div className="relative">
                      <img 
                        src={formData.logoUrl} 
                        alt="Logo preview"
                        className="h-20 w-20 rounded object-cover border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="logoImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const fileSizeKB = file.size / 1024;
                          
                          if (fileSizeKB < 10) {
                            toast({
                              title: 'Image too small',
                              description: 'Image must be at least 10KB in size',
                              variant: 'destructive',
                            });
                            e.target.value = '';
                            return;
                          }
                          
                          if (fileSizeKB > 30) {
                            toast({
                              title: 'Image too large',
                              description: 'Image must not exceed 30KB in size',
                              variant: 'destructive',
                            });
                            e.target.value = '';
                            return;
                          }
                          
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({ ...formData, logoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      data-testid="input-logo-image"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Select an image file (PNG, JPG, GIF) between 10KB and 30KB
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-gym">
                  {editingGym ? 'Update' : 'Create'} Gym
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Gyms</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search gyms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gym Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredGyms && filteredGyms.length > 0 ? (
                filteredGyms.map((gym) => (
                  <TableRow key={gym.id} data-testid={`row-gym-${gym.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {gym.logoUrl ? (
                          <>
                            <img 
                              src={gym.logoUrl} 
                              alt={`${gym.name} logo`}
                              className="h-10 w-10 rounded-full object-cover border-2 border-muted"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center border-2 border-muted" style={{ display: 'none' }}>
                              <span className="text-sm font-semibold text-primary">
                                {getGymInitials(gym.name)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-muted">
                            <span className="text-sm font-semibold text-primary">
                              {getGymInitials(gym.name)}
                            </span>
                          </div>
                        )}
                        <span>{gym.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{gym.owner}</TableCell>
                    <TableCell className="capitalize">{gym.plan}</TableCell>
                    <TableCell>{getStatusBadge(gym.status)}</TableCell>
                    <TableCell>{gym.members}</TableCell>
                    <TableCell>{formatCurrency(gym.revenue)}/mo</TableCell>
                    <TableCell>{formatDate(gym.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${gym.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(gym)} data-testid={`button-edit-${gym.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => suspendMutation.mutate(gym.id)}
                            data-testid={`button-suspend-${gym.id}`}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            {gym.status === 'suspended' ? 'Activate' : 'Suspend'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(gym.id)}
                            className="text-destructive"
                            data-testid={`button-delete-${gym.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No gyms found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
