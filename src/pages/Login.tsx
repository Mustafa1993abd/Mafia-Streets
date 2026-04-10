import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, Role } from '../store/useAuthStore';
import { Shield, Skull, Briefcase, Car, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

const ROLES = [
  { id: 'Boss', icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'Trader', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'Thief', icon: Car, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'Smuggler', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'Criminal', icon: Skull, color: 'text-zinc-400', bg: 'bg-zinc-800' },
];

export default function Login() {
  const { t, i18n } = useTranslation();
  const { user, profile, login, createProfile, loggingIn, loading } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<Role>('Criminal');
  const [nickname, setNickname] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(t('common.failed'));
    }
  };

  const handleCreateProfile = async () => {
    if (!nickname.trim()) {
      toast.error(t('login.nicknameRequired'));
      return;
    }
    setIsCreatingProfile(true);
    try {
      await createProfile(selectedRole, nickname);
    } catch (error: any) {
      console.error('Create profile error:', error);
      let errorMsg = error.message || t('common.failed');
      if (errorMsg.includes('The string did not match the expected pattern')) {
        errorMsg = t('errors.patternMismatch');
      }
      toast.error(errorMsg);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  if (user && profile) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-red-500 font-bold animate-pulse text-xl">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (user && !profile) {
    if (user.email === 'm07821779969@gmail.com' || user.email === 'soft4net2016@gmail.com') {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-red-500 font-bold animate-pulse text-xl">جاري تسجيل الدخول التلقائي...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        
        <div className="max-w-md w-full space-y-8 bg-zinc-950/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-800 shadow-2xl relative z-10">
          <div className="text-center">
            {/* Logo */}
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 uppercase tracking-tighter mb-6 drop-shadow-lg">
              {t('login.title') || 'MAFIA STREETS'}
            </h1>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">{t('login.choose')}</h2>
            <p className="mt-2 text-zinc-400">{t('login.chooseDesc')}</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">{t('login.nickname')}</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t('login.nicknamePlaceholder')}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                maxLength={20}
              />
            </div>
          </div>

          <div className="space-y-3">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id as Role)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    isSelected 
                      ? 'border-red-500 bg-red-500/10' 
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${role.bg} ${role.color}`}>
                    <Icon size={24} />
                  </div>
                  <span className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                    {t(`roles.${role.id}`)}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleCreateProfile}
            disabled={isCreatingProfile}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingProfile ? t('login.creating') : t('login.enter')}
          </button>

          <button
            onClick={() => useAuthStore.getState().logout()}
            className="w-full mt-4 flex items-center justify-center gap-2 border border-white text-white py-2 rounded-xl text-sm hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            الرجوع الى الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
      
      <div className="max-w-md w-full space-y-8 bg-zinc-950/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-800 shadow-2xl relative z-10">
        <div className="text-center">
          {/* Logo */}
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 uppercase tracking-tighter mb-4 drop-shadow-lg">
            {t('login.title') || 'MAFIA STREETS'}
          </h1>
          
          {/* Disclaimer */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6 text-xs text-zinc-400 leading-relaxed text-right" dir="rtl">
            <p className="mb-2 font-bold text-red-500">{t('login.disclaimerTitle')}</p>
            <p className="whitespace-pre-wrap">{t('login.disclaimerText')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={loggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-black font-bold py-4 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingIn ? (
              <span>{t('login.signingIn')}</span>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('login.signIn')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
