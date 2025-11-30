import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { LeadForm } from '@/components/LeadForm';
import { ConvertLeadDialog } from '@/components/ConvertLeadDialog';
import { LeadDetailDrawer } from '@/components/LeadDetailDrawer';
import { PageHeader } from '@/components/layout';
import { Search, Plus, Edit, Trash2, UserCheck, Users, Phone, ThumbsUp, CheckCircle, XCircle, Copy, Link2, ExternalLink } from 'lucide-react';
import { format, isPast } from 'date-fns';
import type { Lead } from '@shared/schema';

interface GymInfo {
  id: string;
  slug: string | null;
}

export default function Leads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['/api/leads', { status: statusFilter !== 'all' ? statusFilter : undefined, source: sourceFilter !== 'all' ? sourceFilter : undefined, search: searchQuery || undefined }],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: gymInfo } = useQuery<GymInfo>({
    queryKey: ['/api/gym/info'],
    enabled: user?.role === 'admin',
  });

  const deleteMutation = useMutation({
    mutationFn: async (leadId: string) => {
      await apiRequest('DELETE', `/api/leads/${leadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'], exact: false });
      toast({
        title: 'Success',
        description: 'Lead deleted successfully',
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

  const generateSlugMutation = useMutation({
    mutationFn: async () => {
      if (!gymInfo?.id) throw new Error('Gym not found');
      const response = await apiRequest('POST', `/api/gyms/${gymInfo.id}/generate-slug`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/gym/info'] });
      copyEnquiryLink(data.slug);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDelete = async (leadId: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteMutation.mutate(leadId);
    }
  };

  const copyEnquiryLink = (slug?: string | null) => {
    const gymSlug = slug || gymInfo?.slug || gymInfo?.id;
    if (!gymSlug) {
      toast({
        title: 'Error',
        description: 'Could not generate enquiry link',
        variant: 'destructive',
      });
      return;
    }

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/enquiry/${gymSlug}`;
    
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: 'Link Copied!',
        description: 'Share this link on Instagram, WhatsApp, or your website. New enquiries will appear here automatically.',
      });
    }).catch(() => {
      toast({
        title: 'Copy Failed',
        description: `Enquiry link: ${link}`,
        variant: 'destructive',
      });
    });
  };

  const handleCopyEnquiryLink = () => {
    if (gymInfo?.slug) {
      copyEnquiryLink(gymInfo.slug);
    } else {
      generateSlugMutation.mutate();
    }
  };

  const stats = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter(l => l.status === 'contacted').length;
    const interested = leads.filter(l => l.status === 'interested').length;
    const converted = leads.filter(l => l.status === 'converted').length;
    const lost = leads.filter(l => l.status === 'lost').length;
    const newLeads = leads.filter(l => l.status === 'new').length;

    return { total, contacted, interested, converted, lost, newLeads };
  }, [leads]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30';
      case 'contacted':
        return 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20';
      case 'interested':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30';
      case 'converted':
        return 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30';
      case 'lost':
        return 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30';
      default:
        return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  const getSourceLabel = (source: string | null) => {
    if (!source) return 'N/A';
    const labels: Record<string, string> = {
      'walk_in': 'Walk-in',
      'referral': 'Referral',
      'online': 'Online',
      'social_media': 'Social Media',
      'Website form': 'Website',
      'Instagram': 'Instagram',
      'Facebook': 'Facebook',
      'Google': 'Google',
      'other': 'Other',
    };
    return labels[source] || source;
  };

  const isFollowUpOverdue = (followUpDate: string | Date | null) => {
    if (!followUpDate) return false;
    const date = typeof followUpDate === 'string' ? new Date(followUpDate) : followUpDate;
    return isPast(date) && date.toDateString() !== new Date().toDateString();
  };

  const canEdit = user?.role === 'admin' || user?.role === 'trainer';
  const canConvert = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & Visitors"
        description="Track and convert potential customers into gym members"
      >
        {user?.role === 'admin' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleCopyEnquiryLink}
                  disabled={generateSlugMutation.isPending}
                  className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy Enquiry Form Link</span>
                  <span className="sm:hidden">Get Link</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-[hsl(220,26%,16%)] border-white/10 text-white">
                <p>Share this link on Instagram, WhatsApp, or your website. New enquiries come here automatically.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {canEdit && (
          <Button 
            onClick={() => setIsAddDialogOpen(true)} 
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-add-lead"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="cursor-pointer bg-card-dark border-white/5 hover:bg-white/5 transition-colors" onClick={() => setStatusFilter('all')}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="stat-total-leads">{stats.total}</div>
            <p className="text-xs text-white/50">
              {stats.newLeads} new
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer bg-card-dark border-white/5 hover:bg-white/5 transition-colors" onClick={() => setStatusFilter('contacted')}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Contacted</CardTitle>
            <Phone className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="stat-contacted">{stats.contacted}</div>
            <p className="text-xs text-white/50">
              Initial contact made
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer bg-card-dark border-white/5 hover:bg-white/5 transition-colors" onClick={() => setStatusFilter('interested')}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Interested</CardTitle>
            <ThumbsUp className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="stat-interested">{stats.interested}</div>
            <p className="text-xs text-white/50">
              Showed interest
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer bg-card-dark border-white/5 hover:bg-white/5 transition-colors" onClick={() => setStatusFilter('converted')}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Converted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400" data-testid="stat-converted">{stats.converted}</div>
            <p className="text-xs text-white/50">
              Became members
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer bg-card-dark border-white/5 hover:bg-white/5 transition-colors" onClick={() => setStatusFilter('lost')}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Lost</CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400" data-testid="stat-lost">{stats.lost}</div>
            <p className="text-xs text-white/50">
              Not interested
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card-dark border-white/5">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-white">Lead Directory</CardTitle>
          <CardDescription className="text-white/50">View and manage all potential gym members</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                placeholder="Search leads by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500/50"
                data-testid="input-search-leads"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,26%,16%)] border-white/10">
                <SelectItem value="all" className="text-white/80 focus:bg-white/10 focus:text-white">All Statuses</SelectItem>
                <SelectItem value="new" className="text-white/80 focus:bg-white/10 focus:text-white">New</SelectItem>
                <SelectItem value="contacted" className="text-white/80 focus:bg-white/10 focus:text-white">Contacted</SelectItem>
                <SelectItem value="interested" className="text-white/80 focus:bg-white/10 focus:text-white">Interested</SelectItem>
                <SelectItem value="converted" className="text-white/80 focus:bg-white/10 focus:text-white">Converted</SelectItem>
                <SelectItem value="lost" className="text-white/80 focus:bg-white/10 focus:text-white">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white" data-testid="select-source-filter">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,26%,16%)] border-white/10">
                <SelectItem value="all" className="text-white/80 focus:bg-white/10 focus:text-white">All Sources</SelectItem>
                <SelectItem value="walk_in" className="text-white/80 focus:bg-white/10 focus:text-white">Walk-in</SelectItem>
                <SelectItem value="referral" className="text-white/80 focus:bg-white/10 focus:text-white">Referral</SelectItem>
                <SelectItem value="online" className="text-white/80 focus:bg-white/10 focus:text-white">Online</SelectItem>
                <SelectItem value="Website form" className="text-white/80 focus:bg-white/10 focus:text-white">Website Form</SelectItem>
                <SelectItem value="Instagram" className="text-white/80 focus:bg-white/10 focus:text-white">Instagram</SelectItem>
                <SelectItem value="Facebook" className="text-white/80 focus:bg-white/10 focus:text-white">Facebook</SelectItem>
                <SelectItem value="social_media" className="text-white/80 focus:bg-white/10 focus:text-white">Social Media</SelectItem>
                <SelectItem value="other" className="text-white/80 focus:bg-white/10 focus:text-white">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-white/5" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center" data-testid="text-no-leads">
              <p className="text-white/50">No leads found</p>
              {user?.role === 'admin' && (
                <p className="text-sm text-white/40 mt-2">
                  Share your enquiry form link to start collecting leads!
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-white/5">
                    <TableHead className="text-white/60">Name</TableHead>
                    <TableHead className="hidden md:table-cell text-white/60">Email</TableHead>
                    <TableHead className="text-white/60">Phone</TableHead>
                    <TableHead className="hidden sm:table-cell text-white/60">Source</TableHead>
                    <TableHead className="text-white/60">Status</TableHead>
                    <TableHead className="hidden lg:table-cell text-white/60">Follow-up Date</TableHead>
                    <TableHead className="text-right text-white/60">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      data-testid={`row-lead-${lead.id}`}
                      className="cursor-pointer border-white/5 hover:bg-white/5"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <TableCell className="font-medium text-white">{lead.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-white/70">{lead.email || '-'}</TableCell>
                      <TableCell className="text-white/70">{lead.phone}</TableCell>
                      <TableCell className="hidden sm:table-cell text-white/70">{getSourceLabel(lead.source)}</TableCell>
                      <TableCell>
                        <Badge 
                          className={getStatusBadgeClass(lead.status)}
                          data-testid={`badge-status-${lead.id}`}
                        >
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {lead.followUpDate ? (
                          <span
                            className={isFollowUpOverdue(lead.followUpDate) ? 'text-red-400 font-medium' : 'text-white/70'}
                            data-testid={`text-follow-up-${lead.id}`}
                          >
                            {format(new Date(lead.followUpDate), 'MMM dd, yyyy')}
                            {isFollowUpOverdue(lead.followUpDate) && ' (Overdue)'}
                          </span>
                        ) : (
                          <span className="text-white/40">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-white/10 text-white/60 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLead(lead);
                              }}
                              data-testid={`button-edit-lead-${lead.id}`}
                              title="Edit lead"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canConvert && lead.status !== 'converted' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-green-500/10 text-white/60 hover:text-green-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConvertingLead(lead);
                              }}
                              data-testid={`button-convert-lead-${lead.id}`}
                              title="Convert to member"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-red-500/10 text-white/60 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(lead.id);
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-lead-${lead.id}`}
                              title="Delete lead"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <LeadDetailDrawer
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onConvert={(lead) => setConvertingLead(lead)}
        canConvert={canConvert}
      />

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Enter the lead details below</DialogDescription>
          </DialogHeader>
          <LeadForm
            onSuccess={() => {
              setIsAddDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/leads'], exact: false });
            }}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>Update lead information</DialogDescription>
          </DialogHeader>
          {editingLead && (
            <LeadForm
              lead={editingLead}
              onSuccess={() => {
                setEditingLead(null);
                queryClient.invalidateQueries({ queryKey: ['/api/leads'], exact: false });
              }}
              onCancel={() => setEditingLead(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConvertLeadDialog
        lead={convertingLead}
        open={!!convertingLead}
        onOpenChange={(open) => !open && setConvertingLead(null)}
        onSuccess={() => setConvertingLead(null)}
      />
    </div>
  );
}
