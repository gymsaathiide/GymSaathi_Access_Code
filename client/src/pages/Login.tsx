import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Sparkles, Loader2, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

const motivationalQuotes = [
  {
    quote: "Discipline is just choosing between what you want now and what you want most.",
    author: "GYMSAATHI"
  },
  {
    quote: "The only bad workout is the one that didn't happen.",
    author: "GYMSAATHI"
  },
  {
    quote: "Success is the sum of small efforts repeated day in and day out.",
    author: "GYMSAATHI"
  },
  {
    quote: "Your body can stand almost anything. It's your mind you have to convince.",
    author: "GYMSAATHI"
  }
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const queryClient = useQueryClient();
  
  const [otpState, setOtpState] = useState<{
    requiresOtp: boolean;
    userId: string | null;
    userEmail: string | null;
    userName: string | null;
  }>({
    requiresOtp: false,
    userId: null,
    userEmail: null,
    userName: null,
  });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const randomQuote = useMemo(() => 
    motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)], 
  []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginForm) => {
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.requiresOtp) {
        setOtpState({
          requiresOtp: true,
          userId: data.userId,
          userEmail: data.user?.email || null,
          userName: data.user?.name || null,
        });
        setIsLoading(false);
        toast({
          title: 'Verification required',
          description: data.message,
        });
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        return;
      }
      
      queryClient.setQueryData(['/api/auth/me'], data.user);
      
      const defaultRoute = data.user.role === 'superadmin' ? '/' 
        : data.user.role === 'admin' ? '/admin'
        : data.user.role === 'trainer' ? '/trainer'
        : '/member';
      
      setLocation(defaultRoute);
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
      setIsLoading(false);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ userId, otpCode }: { userId: string; otpCode: string }) => {
      const response = await apiRequest('POST', '/api/auth/verify-otp', { userId, otpCode });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data.user);
      
      toast({
        title: 'Welcome!',
        description: data.message,
      });
      
      const defaultRoute = data.user.role === 'superadmin' ? '/' 
        : data.user.role === 'admin' ? '/admin'
        : data.user.role === 'trainer' ? '/trainer'
        : '/member';
      
      setLocation(defaultRoute);
    },
    onError: (error: any) => {
      toast({
        title: 'Verification failed',
        description: error.message || 'Invalid code',
        variant: 'destructive',
      });
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      setIsLoading(false);
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', '/api/auth/resend-otp', { userId });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Code sent',
        description: data.message,
      });
      setResendCooldown(60);
      setIsResending(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to resend',
        description: error.message,
        variant: 'destructive',
      });
      setIsResending(false);
    },
  });

  const onSubmit = (data: LoginForm) => {
    setIsLoading(true);
    loginMutation.mutate(data);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every(d => d !== '') && otpState.userId) {
      setIsLoading(true);
      verifyOtpMutation.mutate({
        userId: otpState.userId,
        otpCode: newDigits.join(''),
      });
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newDigits = pastedData.split('');
      setOtpDigits(newDigits);
      otpInputRefs.current[5]?.focus();
      
      if (otpState.userId) {
        setIsLoading(true);
        verifyOtpMutation.mutate({
          userId: otpState.userId,
          otpCode: pastedData,
        });
      }
    }
  };

  const handleResendOtp = () => {
    if (otpState.userId && resendCooldown === 0) {
      setIsResending(true);
      resendOtpMutation.mutate(otpState.userId);
    }
  };

  const handleBackToLogin = () => {
    setOtpState({
      requiresOtp: false,
      userId: null,
      userEmail: null,
      userName: null,
    });
    setOtpDigits(['', '', '', '', '', '']);
    setIsLoading(false);
  };

  const fillDemoCredentials = (role: 'superadmin' | 'admin' | 'trainer') => {
    const credentials = {
      superadmin: { email: 'superadmin@gym.com', password: 'password123' },
      admin: { email: 'admin@powerfit.com', password: 'password123' },
      trainer: { email: 'trainer@powerfit.com', password: 'password123' },
    };
    form.setValue('email', credentials[role].email, { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: true 
    });
    form.setValue('password', credentials[role].password, { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: true 
    });
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
        
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img 
            src="/gymsaathi-logo-dark.png" 
            alt="GYMSAATHI" 
            className="w-12 h-12 object-contain"
          />
          <span className="text-2xl font-bold text-white tracking-wide">GYMSAATHI</span>
        </div>

        {/* Motivation Quote Card */}
        <div className="relative z-10 mt-16">
          <div className="bg-[#1a1a2e]/80 border border-[#2a2a3e] rounded-2xl p-8 backdrop-blur-sm">
            <p className="text-orange-400 text-sm font-semibold tracking-widest mb-4">
              DAILY GYM MOTIVATION
            </p>
            <blockquote className="text-2xl font-medium text-white leading-relaxed mb-4">
              "{randomQuote.quote}"
            </blockquote>
            <p className="text-orange-400 font-medium">— {randomQuote.author}</p>
          </div>
        </div>

        {/* PMF Tagline */}
        <div className="relative z-10 mt-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex gap-2">
              <span className="w-10 h-10 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg flex items-center justify-center text-white font-bold">P</span>
              <span className="w-10 h-10 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg flex items-center justify-center text-white font-bold">M</span>
              <span className="w-10 h-10 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg flex items-center justify-center text-white font-bold">F</span>
            </div>
            <span className="text-gray-400">Motivation meets management.</span>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Log in, take action, and keep your members consistent.
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Built for serious gyms that want growth, not excuses.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form or OTP Verification */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-[#0f0f15] to-[#1a1a25]">
        <div className="w-full max-w-md">
          {otpState.requiresOtp ? (
            <>
              {/* OTP Verification Screen */}
              <button
                onClick={handleBackToLogin}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>

              <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-orange-400" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Verify your account
                </h1>
                <p className="text-gray-400">
                  Hi {otpState.userName || 'there'}! We've sent a 6-digit code to
                </p>
                <p className="text-orange-400 font-medium mt-1">
                  {otpState.userEmail || 'your email'}
                </p>
              </div>

              {/* OTP Input */}
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-4 text-center">
                  Enter verification code
                </label>
                <div className="flex justify-center gap-2">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      disabled={isLoading}
                      className="w-12 h-14 text-center text-2xl font-bold bg-[#1a1a2e] border-2 border-[#2a2a3e] rounded-xl text-white focus:border-orange-500 focus:ring-orange-500/20 focus:outline-none transition-all disabled:opacity-50"
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <Button
                onClick={() => {
                  if (otpDigits.every(d => d !== '') && otpState.userId) {
                    setIsLoading(true);
                    verifyOtpMutation.mutate({
                      userId: otpState.userId,
                      otpCode: otpDigits.join(''),
                    });
                  }
                }}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 mb-4"
                disabled={isLoading || otpDigits.some(d => d === '')}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify & Continue'
                )}
              </Button>

              {/* Resend OTP */}
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">
                  Didn't receive the code?
                </p>
                <Button
                  variant="ghost"
                  onClick={handleResendOtp}
                  disabled={isResending || resendCooldown > 0}
                  className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                >
                  {isResending ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Resend code
                    </span>
                  )}
                </Button>
              </div>

              {/* Security Notice */}
              <div className="mt-8 p-4 bg-[#1a1a2e]/50 border border-[#2a2a3e] rounded-xl">
                <p className="text-gray-400 text-xs text-center">
                  🔒 This code expires in 10 minutes. Never share it with anyone.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Welcome Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome back <span className="inline-block animate-bounce">👋</span>
                </h1>
                <p className="text-gray-400">
                  Sign in to manage your gym with GYMSAATHI ERP.
                </p>
              </div>

              {/* Environment Indicator */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-full">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-300">Production environment · PowerFit Gym</span>
                </div>
              </div>

              {/* Login Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="admin@gymsaathi.com"
                            disabled={isLoading}
                            className="h-12 bg-[#1a1a2e] border-[#2a2a3e] text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              disabled={isLoading}
                              className="h-12 bg-[#1a1a2e] border-[#2a2a3e] text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20 pr-12"
                              data-testid="input-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Remember me & Forgot password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="remember" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="border-[#2a2a3e] data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                      <label htmlFor="remember" className="text-sm text-gray-400 cursor-pointer">
                        Keep me signed in
                      </label>
                    </div>
                    <a href="/forgot-password" className="text-sm text-orange-400 hover:text-orange-300">
                      Forgot password?
                    </a>
                  </div>

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Signing you in...
                      </span>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </form>
              </Form>

              {/* Quick Login Section */}
              <div className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px bg-[#2a2a3e] flex-1" />
                  <span className="text-sm text-gray-500">quick login as</span>
                  <div className="h-px bg-[#2a2a3e] flex-1" />
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fillDemoCredentials('superadmin')}
                    disabled={isLoading}
                    className="bg-[#1a1a2e] border-[#2a2a3e] text-gray-300 hover:bg-[#2a2a3e] hover:text-white hover:border-orange-500/50"
                    data-testid="button-demo-superadmin"
                  >
                    Superadmin
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fillDemoCredentials('admin')}
                    disabled={isLoading}
                    className="bg-[#1a1a2e] border-[#2a2a3e] text-gray-300 hover:bg-[#2a2a3e] hover:text-white hover:border-orange-500/50"
                    data-testid="button-demo-admin"
                  >
                    Gym Admin
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fillDemoCredentials('trainer')}
                    disabled={isLoading}
                    className="bg-[#1a1a2e] border-[#2a2a3e] text-gray-300 hover:bg-[#2a2a3e] hover:text-white hover:border-orange-500/50"
                    data-testid="button-demo-trainer"
                  >
                    Trainer
                  </Button>
                </div>

                {/* Sample login emails */}
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setValue('email', 'superadmin@gym.com', { shouldValidate: true });
                    }}
                    disabled={isLoading}
                    className="text-gray-500 hover:text-gray-300 text-xs"
                  >
                    superadmin@gym.com
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setValue('email', 'admin@powerfit.com', { shouldValidate: true });
                    }}
                    disabled={isLoading}
                    className="text-gray-500 hover:text-gray-300 text-xs"
                  >
                    admin@powerfit.com
                  </Button>
                </div>
              </div>

              {/* Support Link */}
              <p className="mt-8 text-center text-sm text-gray-500">
                Don't have access yet?{' '}
                <a href="#" className="text-orange-400 hover:text-orange-300">
                  Contact GYMSAATHI support.
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
