import React, { useState, useEffect } from 'react';
import { Employee } from '@/shared/types';
import Avatar from '@/shared/components/common/Avatar';
import { TabType } from './BottomNav';
import SettingsModal from './SettingsModal';

interface Props {
  user: Employee;
  activeTab: TabType;
  onOpenProfile: () => void;
  notiCount?: number;
  onOpenNoti?: () => void;
  customIcon?: string;
  onCreateRequest?: () => void; 
  onContactSearch?: () => void;
  onInitNotifications?: () => void;
  canManage?: boolean;
  onOpenManager?: () => void;
}

const Header: React.FC<Props> = ({ user, activeTab, onOpenProfile, onOpenNoti, customIcon, onCreateRequest, onContactSearch, onInitNotifications, canManage, onOpenManager }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
      setIsSettingsOpen(false);
  }, [activeTab]);

  const getTitle = () => {
      switch (activeTab) {
          case 'home': return 'Trang chủ';
          case 'contacts': return 'Danh bạ';
          case 'manager': return 'Quản lý';
          case 'notifications': return 'Thông báo';
          case 'history': return 'Nhật ký';
          case 'requests': return 'Yêu cầu';
          case 'profile': return 'Hồ sơ';
          default: return '';
      }
  };

  const title = getTitle();

  return (
    <>
        <div className="fixed top-0 left-0 w-full z-40 bg-slate-50/80 dark:bg-dark-bg/80 backdrop-blur-xl pt-safe transition-all">
            <div className="flex items-center justify-between h-16 px-4 relative">
                
                <div className="flex items-center z-20 gap-1">
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-dark-text-secondary hover:dark:text-dark-text-primary transition-all active:scale-90"
                    >
                        <i className="fa-solid fa-bars text-lg"></i>
                    </button>

                    <div className="flex items-center gap-2 pl-1">
                        {title && (
                            <span className="text-xl font-extrabold text-slate-800 dark:text-dark-text-primary tracking-tight animate-fade-in">
                                {title}
                            </span>
                        )}
                        {customIcon && (
                            <i className={`${customIcon} text-primary text-sm mb-0.5`}></i>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center justify-end z-20 gap-2">
                    
                    {activeTab === 'contacts' && onContactSearch && (
                        <button 
                            onClick={onContactSearch}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-dark-text-secondary hover:dark:text-dark-text-primary transition-all active:scale-90"
                        >
                            <i className="fa-solid fa-magnifying-glass text-lg"></i>
                        </button>
                    )}

                    {activeTab === 'requests' && onCreateRequest && (
                        <button 
                            onClick={onCreateRequest}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-primary transition-all active:scale-90"
                        >
                            <i className="fa-solid fa-plus text-xl"></i>
                        </button>
                    )}

                    {canManage && onOpenManager && (
                        <button 
                            onClick={onOpenManager}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${activeTab === 'manager' ? 'text-primary bg-primary/10 dark:bg-primary/20' : 'text-slate-600 dark:text-dark-text-secondary hover:dark:text-dark-text-primary'}`}
                        >
                            <i className="fa-solid fa-gauge-high text-lg"></i>
                        </button>
                    )}

                    {onOpenNoti ? (
                        <button onClick={onOpenNoti} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-dark-text-secondary hover:dark:text-dark-text-primary transition-colors active:scale-95">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    ) : (
                        <div className="relative group cursor-pointer active:scale-95 transition-transform mr-1" onClick={onOpenProfile}>
                            <Avatar 
                                src={user.face_ref_url} 
                                name={user.name} 
                                className="w-9 h-9" 
                                textSize="text-xs"
                            />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary ring-2 ring-white dark:ring-dark-bg rounded-full"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            onInitNotifications={onInitNotifications}
        />
    </>
  );
};

export default Header;