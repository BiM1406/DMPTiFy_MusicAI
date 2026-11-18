'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, LoaderCircle, LogIn } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { usePanelFocus } from '../../hooks/usePanelFocus';

export const AuthModal: React.FC = () => {
  const isAuthModalOpen = useAuthStore((s) => s.isAuthModalOpen);
  const authMode = useAuthStore((s) => s.authMode);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const authError = useAuthStore((s) => s.authError);
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
  const setAuthMode = useAuthStore((s) => s.setAuthMode);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  usePanelFocus(panelRef, isAuthModalOpen, false);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (authMode === 'register') {
      await register(fullName, email, password);
    } else {
      await login(email, password);
    }
  };

  return (
    <>
      <button
        data-panel-backdrop
        type="button"
        aria-label="Đóng hộp thoại đăng nhập"
        onClick={closeAuthModal}
        className="fixed inset-0 z-[65] bg-black/45"
      />
      <div
        data-overlay-panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-hairline bg-surface-chrome p-6 transition-colors"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border-hairline">
          <div>
            <h2
              id="auth-modal-title"
              className="text-lg font-medium text-slate-900 dark:text-white"
            >
              {authMode === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Đồng bộ bài hát yêu thích và danh sách phát cá nhân
            </p>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Đóng hộp thoại tài khoản"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-surface-card-hover hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          role="group"
          aria-label="Chọn chế độ tài khoản"
          className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-raised p-1 border border-border-hairline"
        >
          <button
            type="button"
            aria-pressed={authMode === 'login'}
            onClick={() => setAuthMode('login')}
            className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
              authMode === 'login'
                ? 'bg-surface-card text-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            aria-pressed={authMode === 'register'}
            onClick={() => setAuthMode('register')}
            className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
              authMode === 'register'
                ? 'bg-surface-card text-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Tạo tài khoản
          </button>
        </div>

        {authError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-700 dark:text-rose-300"
          >
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
          {authMode === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-fullname"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Họ và tên
              </label>
              <input
                id="auth-fullname"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                maxLength={120}
                value={fullName}
                onChange={(e) => {
                  clearAuthError();
                  setFullName(e.target.value);
                }}
                placeholder="Nguyễn Tuấn Đạt"
                className="min-h-11 w-full rounded-lg border border-border-hairline bg-surface-raised px-3 text-base text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auth-email"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Địa chỉ email
            </label>
            <input
              id="auth-email"
              data-panel-initial-focus
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                clearAuthError();
                setEmail(e.target.value);
              }}
              placeholder="ban@dtu.edu.vn"
              className="min-h-11 w-full rounded-lg border border-border-hairline bg-surface-raised px-3 text-base text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auth-password"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Mật khẩu
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              maxLength={128}
              value={password}
              onChange={(e) => {
                clearAuthError();
                setPassword(e.target.value);
              }}
              placeholder="Tối thiểu 6 ký tự"
              className="min-h-11 w-full rounded-lg border border-border-hairline bg-surface-raised px-3 text-base text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 active:scale-[0.98] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>Đang xử lý…</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>{authMode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-border-hairline flex flex-col gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void loginWithGoogle()}
            className="flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border-hairline bg-surface-raised px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-surface-card-hover dark:text-white active:scale-[0.98] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Tiếp tục với Google</span>
          </button>
          <p className="text-center text-xs text-slate-600 dark:text-slate-400">
            Đăng nhập nhanh với hồ sơ Google của Nguyễn Tuấn Đạt
          </p>
        </div>
      </div>
    </>
  );
};
