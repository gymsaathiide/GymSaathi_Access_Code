import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, UserCheck, UserX, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/layout';

interface Trainer {
  id: string;
  userId: string;
  gymId: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  specializations?: string;
  certifications?: string;
  experience?: number;
  bio?: string;
  photoUrl?: string;
  status?: string;
  isActive: boolean;
  createdAt: string;
}

export default function Trainers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'trainer',
    specializations: '',
    certifications: '',
    experience: '',
    bio: '',
  });

  const { data: trainers = [], isLoading } = useQuery<Trainer[]>({
    queryKey: ['/api/trainers'],
  });

  const createTrainerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          password: data.password || undefined,
          experience: data.experience ? parseInt(data.experience) : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add trainer');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainers'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: 'Trainer Added',
        description: 'The trainer has been added successfully. They will receive login credentials via email and WhatsApp.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateTrainerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> & { status?: string; isActive?: number } }) => {
      const res = await fetch(`/api/trainers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          experience: data.experience ? parseInt(data.experience as string) : undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update trainer');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainers'] });
      setIsEditDialogOpen(false);
      setSelectedTrainer(null);
      resetForm();
      toast({
        title: 'Trainer Updated',
        description: 'The trainer has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTrainerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trainers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to remove trainer');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainers'] });
      setIsDeleteDialogOpen(false);
      setSelectedTrainer(null);
      toast({
        title: 'Trainer Removed',
        description: 'The trainer has been removed from your gym.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'trainer',
      specializations: '',
      certifications: '',
      experience: '',
      bio: '',
    });
  };

  const handleEdit = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setFormData({
      name: trainer.name,
      email: trainer.email,
      password: '',
      phone: trainer.phone || '',
      role: trainer.role || 'trainer',
      specializations: trainer.specializations || '',
      certifications: trainer.certifications || '',
      experience: trainer.experience?.toString() || '',
      bio: trainer.bio || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleStatus = (trainer: Trainer) => {
    const newStatus = trainer.status === 'active' ? 'inactive' : 'active';
    updateTrainerMutation.mutate({
      id: trainer.id,
      data: { status: newStatus, isActive: newStatus === 'active' ? 1 : 0 },
    });
  };

  const activeTrainers = trainers.filter(t => t.status === 'active' || t.isActive);
  const inactiveTrainers = trainers.filter(t => t.status === 'inactive' || (!t.isActive && t.status !== 'on_leave'));

  const getStatusBadge = (trainer: Trainer) => {
    if (trainer.status === 'on_leave') {
      return <Badge variant="secondary">On Leave</Badge>;
    }
    if (trainer.status === 'active' || trainer.isActive) {
      return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    }
    return <Badge variant="destructive">Inactive</Badge>;
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'head_trainer') {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">Head Trainer</Badge>;
    }
    return <Badge variant="outline">Trainer</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainers"
        description="Manage your gym's trainers and their assignments."
      >
        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Trainer
        </Button>
      </PageHeader>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Trainer</DialogTitle>
            <DialogDescription>
              Add a trainer to your gym. They will receive login credentials via email.
            </DialogDescription>
          </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createTrainerMutation.mutate(formData); }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Leave blank to auto-generate"
                    />
                    <p className="text-xs text-white/50">Min 6 characters. Leave blank to auto-generate.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                    <p className="text-xs text-white/50">Required for WhatsApp notifications.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trainer">Trainer</SelectItem>
                      <SelectItem value="head_trainer">Head Trainer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specializations">Specializations</Label>
                    <Input
                      id="specializations"
                      value={formData.specializations}
                      onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                      placeholder="Strength, Cardio, Yoga"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience (years)</Label>
                    <Input
                      id="experience"
                      type="number"
                      min="0"
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certifications">Certifications</Label>
                  <Input
                    id="certifications"
                    value={formData.certifications}
                    onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                    placeholder="NASM, ACE, CPR Certified"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief description about the trainer..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTrainerMutation.isPending}>
                  {createTrainerMutation.isPending ? 'Adding...' : 'Add Trainer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card-dark border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Total Trainers</CardTitle>
            <Users className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{trainers.length}</div>
            <p className="text-xs text-white/50">
              {activeTrainers.length} active, {inactiveTrainers.length} inactive
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card-dark border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Active Trainers</CardTitle>
            <UserCheck className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeTrainers.length}</div>
            <p className="text-xs text-white/50">
              Currently available
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card-dark border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Head Trainers</CardTitle>
            <UserCheck className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{trainers.filter(t => t.role === 'head_trainer').length}</div>
            <p className="text-xs text-white/50">
              Senior training staff
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card-dark border-white/5">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-white">Trainer Directory</CardTitle>
          <CardDescription className="text-white/50">
            View and manage all trainers at your gym.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : trainers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Trainers Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first trainer to get started.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Trainer
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Specializations</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainers.map((trainer) => (
                  <TableRow key={trainer.id}>
                    <TableCell className="font-medium">{trainer.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {trainer.email}
                        </div>
                        {trainer.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {trainer.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(trainer.role)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {trainer.specializations || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {trainer.experience ? `${trainer.experience} years` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(trainer)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(trainer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(trainer)}
                        >
                          {trainer.status === 'active' || trainer.isActive ? (
                            <UserX className="h-4 w-4 text-orange-500" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTrainer(trainer);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Trainer</DialogTitle>
            <DialogDescription>
              Update trainer information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); selectedTrainer && updateTrainerMutation.mutate({ id: selectedTrainer.id, data: formData }); }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trainer">Trainer</SelectItem>
                      <SelectItem value="head_trainer">Head Trainer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-specializations">Specializations</Label>
                  <Input
                    id="edit-specializations"
                    value={formData.specializations}
                    onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-experience">Experience (years)</Label>
                  <Input
                    id="edit-experience"
                    type="number"
                    min="0"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-certifications">Certifications</Label>
                <Input
                  id="edit-certifications"
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea
                  id="edit-bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTrainerMutation.isPending}>
                {updateTrainerMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Trainer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedTrainer?.name} from your gym?
              This will revoke their access to the trainer portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => selectedTrainer && deleteTrainerMutation.mutate(selectedTrainer.id)}
            >
              {deleteTrainerMutation.isPending ? 'Removing...' : 'Remove Trainer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
