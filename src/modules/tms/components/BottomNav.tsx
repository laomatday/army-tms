import React from 'react';
import { Employee } from '@/shared/types';
import { motion } from 'framer-motion';

export type TabType = 'home' | 'history' | 'requests' | 'contacts' | 'manager' | 'profile' | 'notifications' | 'calendar';

interface Props {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  user: Employee;
  notiCount: number;
  onOpenNoti: () => void;
}

const NavItem = ({ name, icon, activeIcon, activeTab, onChange }: { name: TabType, icon: string, activeIcon: string, activeTab: TabType, onChange: (t: TabType) => void }) => {
    const isActive = activeTab === name;
    return (
        <button 
            onClick={() => onChange(name)} 
            className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 active:scale-90 ${
                isActive 
                ? 'text-neutral-white' 
                : 'text-slate-400 dark:text-dark-text-secondary hover:text-slate-600 dark:hover:text-dark-text-primary'
            }`}
        >
            {isActive && (
                <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/30"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
            <i className={`${isActive ? activeIcon : icon} text-[18px] z-10 relative`}></i>
        </button>
    );
};

const BottomNav: React.FC<Props> = ({ activeTab, onChange, user, notiCount, onOpenNoti }) => {
  const isNotiActive = activeTab === 'notifications';

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[95vw]">
      <div className="bg-white/70 dark:bg-dark-surface/60 rounded-full shadow-lg dark:shadow-2xl flex items-center justify-between px-2 py-2 border border-white/80 dark:border-dark-border/30 gap-1 backdrop-blur-md">
          
          <NavItem name="home" icon="fa-solid fa-house" activeIcon="fa-solid fa-house" activeTab={activeTab} onChange={onChange} />
          <NavItem name="history" icon="fa-solid fa-history" activeIcon="fa-solid fa-history" activeTab={activeTab} onChange={onChange} />
          <NavItem name="requests" icon="fa-regular fa-file-lines" activeIcon="fa-solid fa-file-lines" activeTab={activeTab} onChange={onChange} />
          <NavItem name="calendar" icon="fa-regular fa-calendar-days" activeIcon="fa-solid fa-calendar-days" activeTab={activeTab} onChange={onChange} />
          <NavItem name="contacts" icon="fa-solid fa-users" activeIcon="fa-solid fa-users" activeTab={activeTab} onChange={onChange} />
          
          <button 
            onClick={onOpenNoti} 
            className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 active:scale-90 ${
                isNotiActive 
                ? 'text-neutral-white' 
                : 'text-slate-400 dark:text-dark-text-secondary hover:text-slate-600 dark:hover:text-dark-text-primary'
            }`}
          >
               {isNotiActive && (
                   <motion.div 
                       layoutId="activeTabIndicator"
                       className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/30"
                       transition={{ type: "spring", stiffness: 300, damping: 30 }}
                   />
               )}
               <i className={`text-[18px] z-10 relative ${isNotiActive ? 'fa-solid' : 'fa-regular'} fa-bell ${notiCount > 0 && !isNotiActive ? 'animate-bell-shake origin-top' : ''}`}></i>
               {notiCount > 0 && !isNotiActive && (
                    <span className="absolute top-1.5 right-1.5 bg-secondary-red text-neutral-white text-xxs font-extrabold px-1 h-3 min-w-[12px] flex items-center justify-center rounded-full ring-1 ring-white dark:ring-dark-surface shadow-sm animate-pulse z-20 leading-none">
                    {notiCount > 9 ? '9+' : notiCount}
                    </span>
                )}
          </button>
      </div>
   </div>
  );
};

export default BottomNav;
