import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, Phone, MessageCircle, Dumbbell } from 'lucide-react';

interface GymInfo {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  phone: string;
  email: string;
  address: string | null;
  branding: {
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    fontFamily: string | null;
  } | null;
}

interface SubmissionResult {
  status: string;
  leadId: string;
  message: string;
  gymName: string;
  gymPhone: string;
}

export default function PublicEnquiryForm() {
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Extract gym slug from URL path: /enquiry/gymslug
  // Handle various formats: /enquiry/gymslug, /enquiry/gymslug/, /enquiry/gymslug?params
  const pathPart = location.replace(/^\/enquiry\/?/, '').split('?')[0].replace(/\/$/, '');
  const gymSlug = pathPart || null;

  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    goal: '',
    preferredChannel: 'whatsapp',
    preferredTime: 'any',
    source: '',
    message: '',
    consent: false,
    honeypot: '',
  });

  const [utmParams, setUtmParams] = useState({
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setUtmParams({
      utmSource: urlParams.get('utm_source') || '',
      utmMedium: urlParams.get('utm_medium') || '',
      utmCampaign: urlParams.get('utm_campaign') || '',
    });
  }, []);

  useEffect(() => {
    async function fetchGymInfo() {
      if (!gymSlug) {
        setError('Invalid gym link');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/public/gym/${gymSlug}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Gym not found');
        }
        const data = await response.json();
        setGymInfo(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load gym information');
      } finally {
        setLoading(false);
      }
    }

    fetchGymInfo();
  }, [gymSlug]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/public/enquiry/${gymSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...utmParams,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit enquiry');
      }
      return data;
    },
    onSuccess: (data) => {
      setSubmitted(true);
      setSubmissionResult(data);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const validateIndianPhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (!cleaned || cleaned.length === 0) {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    if (cleaned.length !== 10) {
      return { isValid: false, error: 'Phone number must be exactly 10 digits' };
    }
    
    if (!/^[6-9]/.test(cleaned)) {
      return { isValid: false, error: 'Indian mobile numbers must start with 6, 7, 8, or 9' };
    }
    
    const allSameDigit = /^(\d)\1{9}$/.test(cleaned);
    if (allSameDigit) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }
    
    const sequential = '0123456789';
    const reverseSequential = '9876543210';
    if (sequential.includes(cleaned) || reverseSequential.includes(cleaned)) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }
    
    return { isValid: true };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      toast({
        title: 'Invalid Name',
        description: 'Please enter your full name (at least 2 characters)',
        variant: 'destructive',
      });
      return;
    }

    const phoneValidation = validateIndianPhoneNumber(formData.phone);
    if (!phoneValidation.isValid) {
      toast({
        title: 'Invalid Phone',
        description: phoneValidation.error || 'Please enter a valid 10-digit Indian mobile number',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.consent) {
      toast({
        title: 'Consent Required',
        description: 'Please agree to be contacted by the gym',
        variant: 'destructive',
      });
      return;
    }

    submitMutation.mutate();
  };

  const primaryColor = gymInfo?.branding?.primaryColor || '#f97316';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Please check the link and try again, or contact the gym directly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && submissionResult) {
    const whatsappMessage = encodeURIComponent(
      `Hi! I just submitted an enquiry on your website. My name is ${formData.name} and I'm interested in joining your gym.`
    );
    const whatsappLink = `https://wa.me/91${submissionResult.gymPhone.replace(/\D/g, '')}?text=${whatsappMessage}`;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              Thank You, {formData.name}!
            </CardTitle>
            <CardDescription className="text-base">
              Your enquiry has been submitted successfully. The {submissionResult.gymName} team will contact you shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-2">Want to speed things up?</p>
              <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md text-white font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="h-4 w-4" />
                Send WhatsApp Message to Gym
              </a>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">or call directly</p>
              <a 
                href={`tel:${submissionResult.gymPhone}`}
                className="inline-flex items-center justify-center gap-2 mt-2 px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                <Phone className="h-4 w-4" />
                {submissionResult.gymPhone}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          {gymInfo?.logoUrl ? (
            <img
              src={gymInfo.logoUrl}
              alt={gymInfo.name}
              className="h-16 mx-auto mb-4 object-contain"
            />
          ) : (
            <div className="h-16 w-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <Dumbbell className="h-8 w-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{gymInfo?.name}</h1>
          {gymInfo?.address && (
            <p className="text-sm text-gray-500 mt-1">{gymInfo.address}</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Join Our Fitness Family</CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="honeypot"
                value={formData.honeypot}
                onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number *</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                    +91
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    className="rounded-l-none"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: value });
                    }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Fitness Goal</Label>
                <Select
                  value={formData.goal}
                  onValueChange={(value) => setFormData({ ...formData, goal: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                    <SelectItem value="Muscle Gain">Muscle Gain</SelectItem>
                    <SelectItem value="General Fitness">General Fitness</SelectItem>
                    <SelectItem value="Personal Training">Personal Training</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Preferred Contact Method</Label>
                <RadioGroup
                  value={formData.preferredChannel}
                  onValueChange={(value) => setFormData({ ...formData, preferredChannel: value })}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="whatsapp" id="whatsapp" />
                    <Label htmlFor="whatsapp" className="font-normal cursor-pointer">WhatsApp</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="phone-method" />
                    <Label htmlFor="phone-method" className="font-normal cursor-pointer">Phone Call</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email-method" />
                    <Label htmlFor="email-method" className="font-normal cursor-pointer">Email</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Preferred Time to Call</Label>
                <Select
                  value={formData.preferredTime}
                  onValueChange={(value) => setFormData({ ...formData, preferredTime: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preferred time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                    <SelectItem value="evening">Evening (5 PM - 9 PM)</SelectItem>
                    <SelectItem value="any">Any Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>How did you hear about us?</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Google">Google Search</SelectItem>
                    <SelectItem value="Referral">Friend/Family Referral</SelectItem>
                    <SelectItem value="Website form">Website</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Any specific questions or requirements?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="consent"
                  checked={formData.consent}
                  onCheckedChange={(checked) => setFormData({ ...formData, consent: !!checked })}
                />
                <Label htmlFor="consent" className="text-sm font-normal leading-tight cursor-pointer">
                  I agree to be contacted by {gymInfo?.name} via WhatsApp, call, or email regarding my enquiry.
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitMutation.isPending}
                style={{ backgroundColor: primaryColor }}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Enquiry'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by GYMSAATHI
        </p>
      </div>
    </div>
  );
}
