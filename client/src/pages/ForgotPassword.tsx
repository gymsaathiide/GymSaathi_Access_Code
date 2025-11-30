import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, CheckCircle, Loader2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      const response = await apiRequest('POST', '/api/auth/forgot-password', data);
      return await response.json();
    },
    onSuccess: (data) => {
      setSubmittedEmail(form.getValues('email'));
      setIsSubmitted(true);
      toast({
        title: 'Check your email',
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Request failed',
        description: error.message || 'Failed to send reset link. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0f]">
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] relative overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 text-center">
            <div className="w-24 h-24 bg-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6 ring-2 ring-green-400/30">
              <Mail className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Check Your Email</h2>
            <p className="text-gray-200 max-w-sm leading-relaxed">
              We've sent a password reset link to your email. The link expires in 30 minutes.
            </p>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-[#0f0f15] to-[#1a1a25]">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6 ring-2 ring-green-400/30">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-3">
              Email Sent Successfully
            </h1>
            
            <p className="text-gray-200 mb-6 leading-relaxed">
              If an account exists for <span className="text-orange-400 font-semibold">{submittedEmail}</span>, 
              you will receive a password reset link shortly.
            </p>

            <div className="bg-[#1a1a2e] border border-green-500/20 rounded-xl p-5 mb-6">
              <p className="text-sm text-gray-100 leading-relaxed">
                <strong className="text-green-400 block mb-1">Didn't receive the email?</strong>
                Check your spam folder or try again with a different email address.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  form.reset();
                }}
                variant="outline"
                className="w-full h-12 bg-[#1a1a2e] border-[#3a3a4e] text-white hover:bg-[#2a2a3e] hover:border-[#4a4a5e]"
              >
                Try Again
              </Button>
              
              <Link href="/login">
                <Button
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
                >
                  Return to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 text-center">
          <div className="flex items-center gap-3 justify-center mb-8">
            <img 
              src="/gymsaathi-logo-dark.png" 
              alt="GYMSAATHI" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-2xl font-bold text-white tracking-wide">GYMSAATHI</span>
          </div>
          
          <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-12 h-12 text-orange-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Forgot Your Password?</h2>
          <p className="text-gray-400 max-w-sm">
            No worries! Enter your email and we'll send you a secure link to reset your password.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-[#0f0f15] to-[#1a1a25]">
        <div className="w-full max-w-md">
          <Link href="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to login</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Reset Password
            </h1>
            <p className="text-gray-400">
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email"
                        disabled={forgotPasswordMutation.isPending}
                        className="h-12 bg-[#1a1a2e] border-[#2a2a3e] text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Remember your password?{' '}
              <Link href="/login" className="text-orange-400 hover:text-orange-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
