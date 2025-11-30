import { useState, useMemo } from 'react';
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
import { Eye, EyeOff, Sparkles } from 'lucide-react';

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
  
  const randomQuote = useMemo(() => 
    motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)], 
  []);

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
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
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

  const onSubmit = (data: LoginForm) => {
    setIsLoading(true);
    loginMutation.mutate(data);
  };

  const fillDemoCredentials = (role: 'superadmin' | 'admin' | 'trainer') => {
    const credentials = {
      superadmin: { email: 'superadmin@gymsaathi.com', password: 'password123' },
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

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-[#0f0f15] to-[#1a1a25]">
        <div className="w-full max-w-md">
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
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
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
                  form.setValue('email', 'superadmin@gymsaathi.com', { shouldValidate: true });
                }}
                disabled={isLoading}
                className="text-gray-500 hover:text-gray-300 text-xs"
              >
                superadmin@gymsaathi.com
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
        </div>
      </div>
    </div>
  );
}
