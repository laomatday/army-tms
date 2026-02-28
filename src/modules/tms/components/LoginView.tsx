import React, { useState } from 'react';
import { doLogin } from '@/modules/tms/services';
import { getDeviceId, triggerHaptic } from '@/core/utils/helpers';
import { Employee } from '@/shared/types';
import { APP_INFO } from '@/shared/constants';

interface Props {
  onLoginSuccess: (user: Employee) => void;
}

const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Vui lòng nhập thông tin đăng nhập");
      return;
    }
    setError('');
    setLoading(true);
    
    const deviceId = getDeviceId();
    const res = await doLogin(email, password, deviceId);
    
    setLoading(false);
    if (res.success && res.data) {
      triggerHaptic('success');
      onLoginSuccess(res.data);
    } else {
      triggerHaptic('error');
      setError(res.message || "Đăng nhập thất bại");
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-dark-bg flex flex-col justify-between p-8 relative overflow-hidden font-sans transition-colors duration-300">

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full z-10 animate-slide-up">
        {/* Brand */}
        <div className="mb-12 flex flex-col items-center">
           <div className="w-40 h-40 mb-8 relative rounded-xl bg-neutral-white dark:bg-dark-surface p-2 flex items-center justify-center border border-slate-200 dark:border-dark-border transform hover:scale-105 transition-transform duration-500 shadow-sm">
              <img 
                src={APP_INFO.LOGO_URL} 
                className="w-full h-full object-contain" 
                alt={`${APP_INFO.NAME} Logo`} 
              />
           </div>
           <h1 className="text-4xl font-black text-neutral-black dark:text-dark-text-primary tracking-tight">Xin chào,</h1>
           <p className="text-slate-500 dark:text-dark-text-secondary mt-2 font-medium text-base tracking-wide">Đăng nhập để bắt đầu làm việc</p>
        </div>

        {/* Form */}
        <form 
            className="space-y-6"
            onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
            }}
        >
          {error && (
            <div className="flex items-center gap-3 bg-secondary-red/10 dark:bg-secondary-red/20 p-4 rounded-xl border border-secondary-red/20 dark:border-secondary-red/30 animate-scale-in">
                <i className="fa-solid fa-circle-exclamation text-secondary-red dark:text-secondary-red text-lg"></i>
                <span className="text-secondary-red dark:text-secondary-red text-sm font-bold">{error}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase ml-1 tracking-wider">Tài khoản</label>
            <div className="relative group">
                <i className="fa-solid fa-user absolute left-4 top-4 text-slate-400 dark:text-dark-text-secondary/70 group-focus-within:text-primary dark:group-focus-within:text-primary transition-colors text-base"></i>
                <input 
                  type="text" 
                  value={email}
                  inputMode="email"
                  enterKeyHint="next"
                  autoComplete="username"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-neutral-white dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-xl text-neutral-black dark:text-dark-text-primary font-bold text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 dark:placeholder:text-dark-text-secondary/50 placeholder:font-semibold tracking-tight" 
                  placeholder="Mã nhân viên / Email" 
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase ml-1 tracking-wider">Mật khẩu</label>
            <div className="relative group">
                <i className="fa-solid fa-lock absolute left-4 top-4 text-slate-400 dark:text-dark-text-secondary/70 group-focus-within:text-primary dark:group-focus-within:text-primary transition-colors text-base"></i>
                <input 
                  type="password" 
                  value={password}
                  enterKeyHint="go"
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-neutral-white dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-xl text-neutral-black dark:text-dark-text-primary font-bold text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 dark:placeholder:text-dark-text-secondary/50 placeholder:font-semibold tracking-widest" 
                  placeholder="••••••••" 
                />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-primary text-neutral-white py-4 rounded-xl font-extrabold text-base hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-primary/20"
          >
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <span>Đăng Nhập</span>}
            {!loading && <i className="fa-solid fa-arrow-right text-base"></i>}
          </button>
        </form>
      </div>

      <div className="text-center pb-safe z-10">
        <p className="text-xxs text-slate-400 dark:text-dark-text-secondary/50 font-extrabold uppercase tracking-widest">{APP_INFO.NAME} © {new Date().getFullYear()} Enterprise</p>
      </div>
    </div>
  );
};

export default LoginView;