'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided.');
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Failed to verify email. The link may have expired.');
      }
    };

    verifyEmail();
  }, [token]);

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
            <CardTitle>Email Verification</CardTitle>
            <CardDescription>
              {status === 'loading' ? 'Verifying your email address...' : 'Verification complete'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            {status === 'loading' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
                <p className="text-center text-gray-400">Please wait while we verify your email...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-center text-gray-300">{message}</p>
                <p className="text-center text-sm text-gray-400">
                  You can now access all features of the platform.
                </p>
                <Link href="/browse" className="w-full">
                  <Button className="w-full">Start Exploring</Button>
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-center text-gray-300">{message}</p>
                <p className="text-center text-sm text-gray-400">
                  If your link has expired, you can request a new one from your profile settings.
                </p>
                <div className="flex w-full flex-col gap-2">
                  <Link href="/auth/login" className="w-full">
                    <Button className="w-full">Go to Login</Button>
                  </Link>
                  <Link href="/" className="w-full">
                    <Button variant="outline" className="w-full">Go to Home</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
