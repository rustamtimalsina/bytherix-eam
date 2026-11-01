"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Building2, Lock, Mail, User, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CosmicThemeToggle } from "@/components/CosmicThemeToggle";
import { TiltCard3D } from "@/components/TiltCard3D";

export default function SignupPage() {
  const router = useRouter();
  const { loginSession } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.signup({
        full_name: fullName,
        email,
        password,
        organization_name: orgName,
      });
      loginSession(res);
      router.push("/");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-white transition-colors duration-300 overflow-hidden">
      {/* Top Navbar with Logo and Cosmic Theme Toggle */}
      <header className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-center max-w-7xl mx-auto z-20">
        <Link href="/" className="flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Bytherix <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">EAM</span>
          </span>
        </Link>
        <CosmicThemeToggle />
      </header>

      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-blue-500/10 dark:bg-blue-600/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[250px] bg-indigo-500/10 dark:bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="relative w-full max-w-lg pt-12 sm:pt-0">
        {/* Header branding */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/60 dark:bg-slate-900/80 border border-slate-300/60 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3 backdrop-blur-sm shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bytherix Multi-Tenant Provisioning</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Create Workspace
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Set up your organization and admin credentials in seconds
          </p>
        </div>

        {/* 3D Tactile Card */}
        <TiltCard3D maxTilt={5} className="card-depth-3d rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-xl dark:shadow-2xl dark:shadow-black/60">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@acme.ai"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Organization / Company Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Intelligence Inc."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Organization & Start</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800/80 text-center">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </TiltCard3D>

        {/* Info pill */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Includes Free Starter Tier (100k tokens / 5 documents)</span>
        </div>
      </div>
    </div>
  );
}
