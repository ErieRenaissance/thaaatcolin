import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/contexts/auth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card';
import { Shield, AlertCircle } from 'lucide-react';

// ============================================================================
// MFA VERIFICATION COMPONENT
// ============================================================================

export const MFAVerification: React.FC = () => {
  const navigate = useNavigate();
  const { verifyMFA, error, isLoading, mfaToken, clearError } = useAuthStore();
  const [code, setCode] = useState('');

  // Redirect if no MFA token (shouldn't be on this page)
  React.useEffect(() => {
    if (!mfaToken) {
      navigate('/login');
    }
  }, [mfaToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await verifyMFA(code);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    clearError();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-600">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {/* MFA Card */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Code</CardTitle>
            <CardDescription>
              Enter the code displayed in your authentication app
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Code Input */}
              <div>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  label="Authentication Code"
                  placeholder="000000"
                  value={code}
                  onChange={handleChange}
                  required
                  autoComplete="one-time-code"
                  autoFocus
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Code expires in 30 seconds
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                disabled={code.length !== 6}
              >
                Verify Code
              </Button>

              {/* Back to Login */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  ← Back to login
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">Can't access your authenticator?</p>
          <p className="mt-1">
            Contact your administrator for assistance with account recovery.
          </p>
        </div>
      </div>
    </div>
  );
};
