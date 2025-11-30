import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Phone, Mail, MessageCircle, UserCheck, Clock, Target, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Lead } from '@shared/schema';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvert: (lead: Lead) => void;
  canConvert: boolean;
}

export function LeadDetailDrawer({ lead, open, onOpenChange, onConvert, canConvert }: LeadDetailDrawerProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(lead?.notes || '');

  const statusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/leads/${leadId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'], exact: false });
      toast({
        title: 'Status Updated',
        description: 'Lead status has been updated successfully',
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

  const notesMutation = useMutation({
    mutationFn: async ({ leadId, notes }: { leadId: string; notes: string }) => {
      const response = await apiRequest('PATCH', `/api/leads/${leadId}`, { notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'], exact: false });
      toast({
        title: 'Notes Saved',
        description: 'Lead notes have been saved successfully',
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

  if (!lead) return null;

  const handleStatusChange = (status: string) => {
    statusMutation.mutate({ leadId: lead.id, status });
  };

  const handleSaveNotes = () => {
    notesMutation.mutate({ leadId: lead.id, notes });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-gray-100 text-gray-800';
      case 'interested': return 'bg-yellow-100 text-yellow-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceLabel = (source: string | null) => {
    if (!source) return 'Unknown';
    const labels: Record<string, string> = {
      'walk_in': 'Walk-in',
      'referral': 'Referral',
      'online': 'Online',
      'social_media': 'Social Media',
      'Website form': 'Website Form',
      'Instagram': 'Instagram',
      'Facebook': 'Facebook',
      'Google': 'Google Search',
    };
    return labels[source] || source;
  };

  const formatPhoneForCall = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('91') ? digits : `91${digits}`;
  };

  const getWhatsAppLink = (phone: string, name: string) => {
    const cleanPhone = formatPhoneForCall(phone);
    const message = encodeURIComponent(`Hi ${name}, this is regarding your enquiry at our gym. How can I help you?`);
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {lead.name}
            <Badge className={getStatusColor(lead.status)}>
              {lead.status}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Lead created {lead.createdAt ? format(new Date(lead.createdAt), 'MMM dd, yyyy') : 'N/A'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="default" className="gap-2 flex-1 sm:flex-none">
              <a href={`tel:${lead.phone}`}>
                <Phone className="h-4 w-4" />
                Call
              </a>
            </Button>
            <Button asChild className="gap-2 flex-1 sm:flex-none" style={{ backgroundColor: '#25D366' }}>
              <a href={getWhatsAppLink(lead.phone, lead.name)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
            {lead.email && (
              <Button asChild variant="outline" className="gap-2 flex-1 sm:flex-none">
                <a href={`mailto:${lead.email}`}>
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="font-medium">{lead.phone}</span>
              </div>
              {lead.email && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="font-medium text-sm">{lead.email}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Lead Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Goal
                </span>
                <span className="font-medium">{lead.goal || lead.interestedPlan || 'Not specified'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Source</span>
                <span className="font-medium">{getSourceLabel(lead.source)}</span>
              </div>
              {lead.channel && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Channel</span>
                  <span className="font-medium capitalize">{lead.channel}</span>
                </div>
              )}
              {lead.preferredChannel && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Preferred Contact</span>
                  <span className="font-medium capitalize">{lead.preferredChannel}</span>
                </div>
              )}
              {lead.preferredTime && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Best Time
                  </span>
                  <span className="font-medium capitalize">{lead.preferredTime}</span>
                </div>
              )}
              {lead.followUpDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Follow-up Date</span>
                  <span className="font-medium">{format(new Date(lead.followUpDate), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {lead.message && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Message</h3>
                <p className="text-sm bg-muted p-3 rounded-md">{lead.message}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Quick Status Update</h3>
            <Select
              value={lead.status}
              onValueChange={handleStatusChange}
              disabled={statusMutation.isPending || lead.status === 'converted'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Notes</h3>
            <Textarea
              placeholder="Add notes about this lead..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveNotes}
              disabled={notesMutation.isPending || notes === (lead.notes || '')}
            >
              {notesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Notes'
              )}
            </Button>
          </div>

          {canConvert && lead.status !== 'converted' && (
            <>
              <Separator />
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => {
                  onOpenChange(false);
                  onConvert(lead);
                }}
              >
                <UserCheck className="h-4 w-4" />
                Convert to Member
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
