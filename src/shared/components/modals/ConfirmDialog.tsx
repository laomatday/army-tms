import React from 'react';

interface Props {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'success' | 'info' | 'warning' | 'error';
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<Props> = ({ 
  isOpen, title, message, confirmLabel = "Xác nhận", cancelLabel = "Hủy bỏ", 
  onConfirm, onCancel, type = 'info', isLoading = false 
}) => {
  if (!isOpen) return null;
  
  const colors = {
      danger: { 
          bg: 'bg-secondary-red/10 dark:bg-secondary-red/20', 
          iconColor: 'text-secondary-red', 
          btn: 'bg-secondary-red hover:bg-secondary-red/90 text-neutral-white',
          icon: 'fa-triangle-exclamation'
      },
      error: { 
          bg: 'bg-secondary-red/10 dark:bg-secondary-red/20', 
          iconColor: 'text-secondary-red', 
          btn: 'bg-secondary-red hover:bg-secondary-red/90 text-neutral-white',
          icon: 'fa-xmark'
      },
      success: { 
          bg: 'bg-secondary-green/10 dark:bg-secondary-green/20', 
          iconColor: 'text-secondary-green', 
          btn: 'bg-secondary-green hover:bg-secondary-green/90 text-neutral-white', 
          icon: 'fa-check'
      },
      info: { 
          bg: 'bg-primary/10 dark:bg-primary/20', 
          iconColor: 'text-primary', 
          btn: 'bg-primary hover:bg-primary/90 text-neutral-white', 
          icon: 'fa-info'
      },
      warning: { 
          bg: 'bg-secondary-yellow/10 dark:bg-secondary-yellow/20', 
          iconColor: 'text-secondary-yellow', 
          btn: 'bg-secondary-yellow hover:bg-secondary-yellow/90 text-neutral-white', 
          icon: 'fa-exclamation'
      }
  };
  
  const theme = colors[type];
  const isSingleButton = !cancelLabel;

  return (
    <div className="fixed inset-0 z-[6000] bg-neutral-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
        <div className="bg-neutral-white dark:bg-dark-surface rounded-xl w-full max-w-[320px] flex flex-col animate-scale-in overflow-hidden transform transition-all border border-slate-100 dark:border-slate-800 shadow-2xl">
            <div className="p-6 flex flex-col items-center text-center">
                <div className={`w-16 h-16 ${theme.bg} rounded-full flex items-center justify-center mb-5`}>
                    <i className={`fa-solid ${theme.icon} text-2xl ${theme.iconColor}`}></i>
                </div>

                <h3 className="text-lg font-black text-neutral-black dark:text-neutral-white mb-2 leading-tight px-2 tracking-tight">{title}</h3>
                <div className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-1">
                    {message}
                </div>
            </div>

            <div className={`p-5 pt-0 ${isSingleButton ? 'flex' : 'grid grid-cols-2 gap-3'}`}>
                {!isSingleButton && (
                    <button 
                        onClick={onCancel} 
                        disabled={isLoading} 
                        className="py-3.5 px-4 rounded-xl text-sm font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 active:scale-[0.98] uppercase tracking-wide"
                    >
                        {cancelLabel}
                    </button>
                )}
                
                <button 
                    onClick={onConfirm} 
                    disabled={isLoading} 
                    className={`py-3.5 px-4 rounded-xl text-sm font-extrabold transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] uppercase tracking-wide ${theme.btn} ${isSingleButton ? 'w-full' : ''}`}
                >
                    {isLoading && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                    {confirmLabel}
                </button>
            </div>
        </div>
    </div>
  );
};
export default ConfirmDialog;