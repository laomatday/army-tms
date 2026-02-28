import React from 'react';
import { APP_INFO } from '@/shared/constants';

interface Props {
  onSelectMode: (mode: 'app' | 'admin' | 'kiosk') => void;
  onLogout: () => void;
}

const AdminModeSelection: React.FC<Props> = ({ onSelectMode, onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-300">
         {/* Decorative Background Glows */}
         <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
         <div className="absolute bottom-0 left-0 w-[25rem] h-[25rem] bg-secondary-purple/5 dark:bg-secondary-purple/10 rounded-full blur-[80px] pointer-events-none translate-y-1/3 -translate-x-1/4"></div>

         <div className="relative z-10 w-full max-w-md animate-slide-up flex flex-col">
             
             {/* Header Section */}
             <div className="text-center mb-10">
                 <div className="w-20 h-20 mx-auto bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-200 dark:border-dark-border shadow-sm flex items-center justify-center mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
                     <div className="w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary text-3xl -rotate-3">
                        <i className="fa-solid fa-shield-halved"></i>
                     </div>
                 </div>
                 <h1 className="text-3xl font-black text-neutral-black dark:text-dark-text-primary tracking-tight mb-2">Xin chào, Admin</h1>
                 <p className="text-slate-500 dark:text-dark-text-secondary font-bold text-xs uppercase tracking-[0.2em]">Hệ thống quản trị {APP_INFO.NAME}</p>
             </div>

             {/* Cards Section */}
             <div className="space-y-4">
                 <button 
                    onClick={() => onSelectMode('app')}
                    className="relative w-full bg-neutral-white dark:bg-dark-surface p-5 rounded-xl border border-slate-200 dark:border-dark-border flex items-center gap-5 group hover:border-primary/30 dark:hover:border-primary/50 transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-xl overflow-hidden text-left"
                 >
                     <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="relative w-16 h-16 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner flex-shrink-0">
                         <i className="fa-solid fa-mobile-screen"></i>
                     </div>
                     <div className="relative z-10 flex-1 min-w-0">
                         <h3 className="text-lg font-black text-neutral-black dark:text-dark-text-primary mb-1">Ứng dụng Mobile</h3>
                     </div>
                     <div className="relative z-10 w-10 h-10 rounded-full bg-slate-50 dark:bg-dark-bg flex items-center justify-center text-slate-400 dark:text-dark-text-secondary group-hover:bg-primary group-hover:text-white transition-colors flex-shrink-0">
                        <i className="fa-solid fa-arrow-right"></i>
                     </div>
                 </button>

                 <button 
                    onClick={() => onSelectMode('kiosk')}
                    className="relative w-full bg-neutral-white dark:bg-dark-surface p-5 rounded-xl border border-slate-200 dark:border-dark-border flex items-center gap-5 group hover:border-secondary-orange/30 dark:hover:border-secondary-orange/50 transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-xl overflow-hidden text-left"
                 >
                     <div className="absolute inset-0 bg-gradient-to-r from-secondary-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="relative w-16 h-16 rounded-xl bg-secondary-orange/10 dark:bg-secondary-orange/20 text-secondary-orange flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner flex-shrink-0">
                         <i className="fa-solid fa-tablet-screen-button"></i>
                     </div>
                     <div className="relative z-10 flex-1 min-w-0">
                         <h3 className="text-lg font-black text-neutral-black dark:text-dark-text-primary mb-1">Chế độ Kiosk</h3>
                     </div>
                     <div className="relative z-10 w-10 h-10 rounded-full bg-slate-50 dark:bg-dark-bg flex items-center justify-center text-slate-400 dark:text-dark-text-secondary group-hover:bg-secondary-orange group-hover:text-white transition-colors flex-shrink-0">
                        <i className="fa-solid fa-arrow-right"></i>
                     </div>
                 </button>

                 <button 
                    onClick={() => onSelectMode('admin')}
                    className="relative w-full bg-neutral-white dark:bg-dark-surface p-5 rounded-xl border border-slate-200 dark:border-dark-border flex items-center gap-5 group hover:border-secondary-purple/30 dark:hover:border-secondary-purple/50 transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-xl overflow-hidden text-left"
                 >
                     <div className="absolute inset-0 bg-gradient-to-r from-secondary-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="relative w-16 h-16 rounded-xl bg-secondary-purple/10 dark:bg-secondary-purple/20 text-secondary-purple flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner flex-shrink-0">
                         <i className="fa-solid fa-laptop-code"></i>
                     </div>
                     <div className="relative z-10 flex-1 min-w-0">
                         <h3 className="text-lg font-black text-neutral-black dark:text-dark-text-primary mb-1">Quản trị Dữ liệu</h3>                         
                     </div>
                     <div className="relative z-10 w-10 h-10 rounded-full bg-slate-50 dark:bg-dark-bg flex items-center justify-center text-slate-400 dark:text-dark-text-secondary group-hover:bg-secondary-purple group-hover:text-white transition-colors flex-shrink-0">
                        <i className="fa-solid fa-arrow-right"></i>
                     </div>
                 </button>
             </div>
             
             {/* Footer Logout */}
             <div className="mt-8 flex justify-center">
                 <button 
                    onClick={onLogout} 
                    className="px-6 py-3.5 rounded-full bg-slate-200/50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-xxs font-extrabold hover:text-secondary-red hover:bg-secondary-red/10 dark:hover:text-secondary-red dark:hover:bg-secondary-red/10 transition-colors uppercase tracking-widest flex items-center gap-2 group"
                 >
                     <i className="fa-solid fa-power-off group-hover:scale-110 transition-transform"></i> Đăng xuất
                 </button>
             </div>
         </div>
    </div>
  );
};

export default AdminModeSelection;