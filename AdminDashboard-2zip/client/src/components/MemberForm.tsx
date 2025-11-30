import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, X } from 'lucide-react';
import type { Member, MembershipPlan } from '@shared/schema';
import { z } from 'zod';
import React, { useRef, useState, useEffect } from 'react';

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

const memberFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  medicalInfo: z.string().optional(),
  status: z.enum(['active', 'expired', 'frozen', 'cancelled']).optional(),
  photoUrl: z.string().optional(),
  planId: z.string().optional(),
});

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

type MemberFormValues = z.infer<typeof memberFormSchema>;

interface MemberFormProps {
  member?: Member;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MemberForm({ member, onSuccess, onCancel }: MemberFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!member;
  const canEdit = user?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: plans = [] } = useQuery<MembershipPlan[]>({
    queryKey: ['/api/membership-plans'],
  });

  const { data: currentMembership, isLoading: membershipLoading, isSuccess: membershipSuccess, isError: membershipError } = useQuery<{ planId: string } | null>({
    queryKey: ['/api/members', member?.id, 'membership'],
    queryFn: async () => {
      if (!member?.id) return null;
      const res = await apiRequest('GET', `/api/members/${member.id}/membership`);
      if (!res.ok) {
        if (res.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch membership data');
      }
      return res.json();
    },
    enabled: isEditing && !!member?.id,
    retry: 2,
  });

  const membershipReady = !isEditing || membershipSuccess;

  const activePlans = plans.filter(p => p.isActive === 1);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      name: member?.name || '',
      email: member?.email || '',
      phone: member?.phone || '',
      address: member?.address || '',
      dateOfBirth: member?.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '',
      gender: member?.gender || '',
      emergencyContactName: member?.emergencyContactName || '',
      emergencyContactPhone: member?.emergencyContactPhone || '',
      medicalInfo: member?.medicalInfo || '',
      status: member?.status || 'active',
      photoUrl: member?.photoUrl || '',
      planId: '',
    },
  });

  const [initialPlanId, setInitialPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (membershipSuccess) {
      if (currentMembership?.planId) {
        form.setValue('planId', currentMembership.planId);
        setInitialPlanId(currentMembership.planId);
      } else {
        form.setValue('planId', 'no-plan');
        setInitialPlanId('no-plan');
      }
    }
  }, [currentMembership, membershipSuccess, form]);

  const mutation = useMutation({
    mutationFn: async (data: MemberFormValues) => {
      const url = isEditing ? `/api/members/${member!.id}` : '/api/members';
      const method = isEditing ? 'PATCH' : 'POST';
      
      const { planId, ...otherData } = data;
      
      const payload: Record<string, unknown> = {
        ...otherData,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
      };

      if (isEditing) {
        if (initialPlanId !== null && planId !== initialPlanId) {
          payload.planId = planId;
        }
      } else {
        if (planId && planId !== 'no-plan') {
          payload.planId = planId;
        }
      }

      const response = await apiRequest(method, url, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Member ${isEditing ? 'updated' : 'created'} successfully`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewImage(base64);
        form.setValue('photoUrl', base64);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive",
      });
    }
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    form.setValue('photoUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const onSubmit = (data: MemberFormValues) => {
    const phoneValidation = validateAndCleanPhone(data.phone);
    if (!phoneValidation.isValid) {
      toast({
        title: 'Invalid Phone Number',
        description: phoneValidation.error,
        variant: 'destructive',
      });
      return;
    }
    
    let emergencyPhoneFormatted = data.emergencyContactPhone || '';
    if (data.emergencyContactPhone && data.emergencyContactPhone.trim() !== '') {
      const emergencyPhoneValidation = validateAndCleanPhone(data.emergencyContactPhone);
      if (!emergencyPhoneValidation.isValid) {
        toast({
          title: 'Invalid Emergency Contact Phone',
          description: emergencyPhoneValidation.error,
          variant: 'destructive',
        });
        return;
      }
      emergencyPhoneFormatted = '+91' + emergencyPhoneValidation.cleaned;
    }
    
    const cleanedData = {
      ...data,
      phone: '+91' + phoneValidation.cleaned,
      emergencyContactPhone: emergencyPhoneFormatted,
    };
    mutation.mutate(cleanedData);
  };

  const currentImage = previewImage || form.watch('photoUrl');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!canEdit && (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            You are viewing this member in read-only mode. Contact an admin to make changes.
          </div>
        )}
        
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={currentImage || undefined} alt={form.watch('name') || 'Member'} />
              <AvatarFallback className="text-2xl">
                {getInitials(form.watch('name') || 'Member')}
              </AvatarFallback>
            </Avatar>

            {currentImage && canEdit && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90"
              >
                <Camera className="h-4 w-4" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
          {canEdit && (
            <p className="text-sm text-muted-foreground">
              Click the camera icon to upload a profile photo
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} disabled={!canEdit} data-testid="input-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} disabled={!canEdit} data-testid="input-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter 10-digit mobile number (e.g., 9876543210 or +91 98765 43210)" 
                    {...field} 
                    disabled={!canEdit} 
                    data-testid="input-phone"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">+91 will be added automatically. Enter any format - we'll clean it up!</p>
              </FormItem>
            )}
          />

          {!isEditing && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Minimum 8 characters" 
                      {...field} 
                      disabled={!canEdit} 
                      data-testid="input-password" 
                    />
                  </FormControl>
                  <FormDescription>
                    This will be the member's login password
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="planId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Membership Plan</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''} disabled={!canEdit}>
                  <FormControl>
                    <SelectTrigger data-testid="select-plan">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="no-plan">{isEditing ? 'Remove Plan' : 'No Plan (Add Later)'}</SelectItem>
                    {activePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {formatDuration(plan.duration)} - ₹{parseFloat(plan.price).toLocaleString('en-IN')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {isEditing 
                    ? 'Change or update the membership plan. Selecting a new plan will create a new membership starting today.'
                    : 'Select a membership plan for this member'
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={!canEdit} data-testid="input-date-of-birth" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEdit}>
                  <FormControl>
                    <SelectTrigger data-testid="select-gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {isEditing && (
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEdit}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="frozen">Frozen</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Full address" {...field} disabled={!canEdit} data-testid="input-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="emergencyContactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency Contact Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} disabled={!canEdit} data-testid="input-emergency-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergencyContactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency Contact Phone</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="10-digit mobile number" 
                    {...field} 
                    disabled={!canEdit} 
                    data-testid="input-emergency-phone"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="medicalInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medical Information</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any medical conditions, allergies, or special requirements..."
                  {...field}
                  disabled={!canEdit}
                  data-testid="input-medical-info"
                />
              </FormControl>
              <FormDescription>
                This information will be kept confidential and used only in emergencies
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEditing && membershipError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Failed to load membership data. Please close and try again.
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={mutation.isPending}
            data-testid="button-cancel"
          >
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit && (
            <Button type="submit" disabled={mutation.isPending || !membershipReady || membershipError} data-testid="button-submit">
              {mutation.isPending ? 'Saving...' : membershipLoading ? 'Loading...' : isEditing ? 'Update Member' : 'Add Member'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
