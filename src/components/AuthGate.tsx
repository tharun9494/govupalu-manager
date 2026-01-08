import React, { useState } from 'react';
import Logo from './Logo';

interface AuthGateProps {
  onSuccess: () => void;
  expectedEmail: string;
  expectedPassword: string;
}

const AuthGate: React.FC<AuthGateProps> = ({ onSuccess, expectedEmail, expectedPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedExpectedEmail = expectedEmail.trim().toLowerCase();

      if (normalizedEmail === normalizedExpectedEmail && password === expectedPassword) {
        setLoading(false);
        onSuccess();
      } else {
        setLoading(false);
        setError('Invalid email or password.');
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl border border-primary-100 p-6 sm:p-8 space-y-6 animate-fade-in">
          <div className="flex flex-col items-center space-y-2">
            <Logo size="md" />
            <p className="text-sm text-gray-500 text-center">
              Admin access required. Please sign in using the provided credentials.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="Enter admin email"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="bg-danger-50 text-danger-700 text-sm rounded-lg px-3 py-2 border border-danger-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center space-x-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          <div className="text-xs text-gray-500 text-center">
            Default admin account:<br />
            <span className="font-medium">{expectedEmail}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;





