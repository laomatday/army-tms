import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastData {
  title: string;
  body: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (data: ToastData) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((data: ToastData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setActiveToast(data);
    
    // Auto dismiss after 3 seconds
    timerRef.current = setTimeout(() => {
        setActiveToast(null);
    }, 3000);
  }, []);

  const closeToast = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setActiveToast(null);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {activeToast && (
            <div 
                className={`fixed top-4 left-4 right-4 z-[5000] p-5 rounded-[24px] shadow-2xl border flex items-center gap-4 animate-slide-up cursor-pointer font-sans transition-all duration-300 dark:bg-slate-800 dark:border-slate-700 ${
                    activeToast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800 dark:text-emerald-400 shadow-emerald-500/10' :
                    activeToast.type === 'error' ? 'bg-white border-red-100 text-red-800 dark:text-red-400 shadow-red-500/10' :
                    activeToast.type === 'warning' ? 'bg-white border-orange-100 text-orange-800 dark:text-orange-400 shadow-orange-500/10' :
                    'bg-white border-blue-100 text-blue-800 dark:text-blue-400 shadow-blue-500/10'
                }`}
                onClick={closeToast}
            >
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                     activeToast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30' :
                     activeToast.type === 'error' ? 'bg-red-50 dark:bg-red-900/30' :
                     activeToast.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/30' :
                     'bg-blue-50 dark:bg-blue-900/30'
                 }`}>
                     <i className={`fa-solid text-xl ${
                         activeToast.type === 'success' ? 'fa-check text-emerald-500' :
                         activeToast.type === 'error' ? 'fa-xmark text-red-500' :
                         activeToast.type === 'warning' ? 'fa-triangle-exclamation text-orange-500' :
                         'fa-bell text-blue-500'
                     }`}></i>
                 </div>
                 <div className="flex-1">
                     <h4 className="font-black text-sm uppercase mb-1 tracking-wide text-slate-800 dark:text-white">{activeToast.title}</h4>
                     <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-snug">{activeToast.body}</p>
                 </div>
            </div>
        )}
    </ToastContext.Provider>
  );
};
