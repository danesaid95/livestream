'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Check, X, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
  });

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(formData.password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(formData.password) },
    { label: 'One number', met: /\d/.test(formData.password) },
  ];

  const isPasswordValid = passwordRequirements.every((req) => req.met);
  const isUsernameValid = /^[a-zA-Z0-9_]+$/.test(formData.username) && formData.username.length >= 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid || !isUsernameValid) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.register(formData);
      const { user, tokens } = response.data.data;
      login(user, tokens.accessToken, tokens.refreshToken);
      setRegisteredEmail(formData.email);
      setShowVerificationNotice(true);
    } catch (err: any) {
      const message = err.response?.data?.message;
      if (Array.isArray(message)) {
        setError(message.join('. '));
      } else {
        setError(message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showVerificationNotice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-600">
                <span className="text-xl font-bold text-white">L</span>
              </div>
              <span className="text-2xl font-bold text-white">LiveStream</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
                <Mail className="h-8 w-8 text-violet-500" />
              </div>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>We've sent a verification link to your email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-gray-800/50 p-4 text-center">
                <p className="text-sm text-gray-400">Verification email sent to:</p>
                <p className="mt-1 font-medium text-white">{registeredEmail}</p>
              </div>

              <p className="text-center text-sm text-gray-400">
                Click the link in the email to verify your account and unlock all features.
                The link will expire in 24 hours.
              </p>

              <div className="space-y-2">
                <Button
                  onClick={() => router.push('/browse')}
                  className="w-full"
                >
                  Continue to Browse
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-center text-xs text-gray-500">
                  You can use the platform while waiting for verification
                </p>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <p className="text-center text-xs text-gray-500">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={async () => {
                      try {
                        await authApi.resendVerification();
                        alert('Verification email resent!');
                      } catch (err) {
                        alert('Failed to resend. Please try again later.');
                      }
                    }}
                    className="text-violet-400 hover:underline"
                  >
                    resend verification email
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-600">
              <span className="text-xl font-bold text-white">L</span>
            </div>
            <span className="text-2xl font-bold text-white">LiveStream</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Join the community and start streaming</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-200">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-200">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="cooluser123"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  error={formData.username && !isUsernameValid ? 'Username must be at least 3 characters and contain only letters, numbers, and underscores' : undefined}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium text-gray-200">
                  Display Name <span className="text-gray-500">(optional)</span>
                </label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your Name"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-200">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 text-xs ${
                          req.met ? 'text-emerald-500' : 'text-gray-500'
                        }`}
                      >
                        {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-400">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-violet-400 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-violet-400 hover:underline">
                  Privacy Policy
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={!isPasswordValid || !isUsernameValid || !formData.email}
              >
                Create account
              </Button>

              <p className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-violet-400 hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
