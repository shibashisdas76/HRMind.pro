/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lock, Eye, EyeOff, KeyRound } from "lucide-react";

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: any, employee: any) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forced password reset flow state
  const [mustReset, setMustReset] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError("Please enter your Login ID / Email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.user.mustResetPassword) {
        setMustReset(true);
        setResetToken(data.token);
      } else {
        onLoginSuccess(data.token, data.user, data.employee);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resetToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setResetSuccess("Password changed successfully! Redirecting you to login...");
      setTimeout(() => {
        setMustReset(false);
        setPassword("");
        setResetSuccess("");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (mustReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC] px-4">
        <div className="max-w-md w-full bg-white rounded-2xl card-shadow border border-slate-100 p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#0B1B42]">Password Reset Required</h2>
            <p className="text-slate-500 text-sm mt-1">
              For security, you must update your temporary password before accessing HR Mind.
            </p>
          </div>

          <form onSubmit={handlePasswordReset} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
                {error}
              </div>
            )}
            {resetSuccess && (
              <div className="p-3 bg-green-50 text-green-600 text-xs rounded-lg border border-green-100">
                {resetSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0] focus:bg-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2F5CE0] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-50"
            >
              {loading ? "Updating password..." : "Confirm & Save Password"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl card-shadow border border-slate-100 p-8">
        <div className="flex flex-col items-center text-center mb-8">
          {/* Custom SVG recreation of Navy "H" + Blue "R" + 3-dot thinking silhouette logo */}
          <div className="mb-4">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 8V24M8 16H16M16 8V24" stroke="#0B1B42" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M20 24V14C20 11.5 22 10 24 10C26 10 28 11.5 28 14V24" stroke="#2F5CE0" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="6" r="1.5" fill="#60A5FA" />
              <circle cx="27" cy="6" r="1.5" fill="#60A5FA" />
              <circle cx="25.5" cy="4" r="1.5" fill="#60A5FA" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0B1B42]">HR Mind</h1>
          <p className="text-slate-500 text-sm mt-1">Every workday, perfectly aligned.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Login ID or Business Email
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="e.g. MTRASE20260003"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0] focus:bg-white"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5CE0] focus:bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2F5CE0] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-slate-400">
            Forgot credentials? Please contact your Company Admin or HR Officer.
          </p>
        </div>
      </div>
    </div>
  );
}
