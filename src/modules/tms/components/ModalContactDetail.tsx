import React, { useRef, useMemo, useState } from 'react';
import { Employee, LocationConfig } from '@/shared/types';
import Avatar from '@/shared/components/common/Avatar';
import ModalHeader from '@/shared/components/modals/ModalHeader';
import { formatDateString, triggerHaptic } from '@/core/utils/helpers';
import BottomNav, { TabType } from './BottomNav';

interface Props {
  contact: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  locationsMap: Record<string, string>;
  empNameMap: Record<string, string>;
  locations: LocationConfig[];
  currentUser: Employee;
  onNavigate: (tab: TabType) => void;
  notiCount: number;
  onOpenNoti: () => void;
}

const ModalContactDetail: React.FC<Props> = ({ contact, isOpen, onClose, locationsMap, empNameMap, locations, currentUser, onNavigate, notiCount, onOpenNoti }) => {
  const touchStart = useRef<{x: number, y: number} | null>(null);
  const touchEnd = useRef<{x: number, y: number} | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('contacts');
  const minSwipeDistance = 60;

  const contactAddress = useMemo(() => {
      if (!contact) return '';
      const loc = locations.find(l => l.center_id === contact.center_id);
      return loc?.address || '';
  }, [contact, locations]);

  const managedLocationNames = useMemo(() => {
      if (!contact || !contact.managed_locations || !Array.isArray(contact.managed_locations) || contact.managed_locations.length === 0) return '';
      return contact.managed_locations.map(id => locationsMap[id] || id).join(', ');
  }, [contact, locationsMap]);

  if (!contact || !isOpen) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const onTouchMove = (e: React.TouchEvent) => {
     touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || !touchEnd.current) return;
    const distanceX = touchStart.current.x - touchEnd.current.x;
    const distanceY = touchStart.current.y - touchEnd.current.y;
    
    if (Math.abs(distanceX) < Math.abs(distanceY)) return;

    if (distanceX > minSwipeDistance) {
        e.stopPropagation();
        triggerHaptic('light');
        onClose();
    }
  };

  const ContactDetailRow = ({ 
      icon, 
      colorClass, 
      label, 
      value, 
      isLink = false,
      href
  }: { 
      icon: string, 
      colorClass: string, 
      label: string, 
      value: string, 
      isLink?: boolean,
      href?: string
  }) => {
      const Content = (
          <>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${colorClass}`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xxs text-slate-400 dark:text-dark-text-secondary font-bold truncate uppercase tracking-wider">{label}</p>
                <p className="text-base font-bold text-neutral-black dark:text-dark-text-primary truncate mt-0.5">{value || label}</p>
            </div>
          </>
      );

      if (isLink && href) {
          return <a href={href} className="flex items-center gap-4 p-4 active:bg-slate-50 dark:active:bg-dark-border/50 transition-colors no-underline group">{Content}</a>;
      }
      
      return <div className="flex items-center gap-4 p-4">{Content}</div>;
  };

  return (
    <div 
        className="fixed inset-0 z-[1000] bg-slate-50 dark:bg-dark-bg flex flex-col animate-slide-up transition-colors duration-300"
    >
         <div className="fixed top-0 left-0 w-full z-[2005]">
             <ModalHeader 
                onClose={() => { triggerHaptic('light'); onClose(); }}
                bgClass="bg-transparent border-none"
             />
         </div>

         <div 
            className="flex-1 overflow-y-auto no-scrollbar px-4 pb-32 pt-14"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
              <div className="animate-fade-in mt-4">
                  <div className="bg-neutral-white dark:bg-dark-surface rounded-xl p-8 border border-slate-100 dark:border-dark-border text-center relative overflow-hidden mb-8 transition-colors mt-4 shadow-sm">
                       <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-t-xl transition-colors duration-500 opacity-60"></div>
                       <div className="absolute top-0 left-0 w-full h-32 overflow-hidden pointer-events-none opacity-10">
                           <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full border-[20px] border-primary"></div>
                           <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full border-[30px] border-primary"></div>
                       </div>
                       
                       <div className="relative z-10 flex flex-col items-center">
                           <div className="w-32 h-32 rounded-full p-1.5 bg-neutral-white dark:bg-dark-surface mb-4 mt-2 relative overflow-hidden transition-colors">
                               <Avatar 
                                  src={contact.face_ref_url} 
                                  name={contact.name} 
                                  className="w-full h-full"
                                  textSize="text-4xl"
                               />
                           </div>
                           <h2 className="text-2xl font-black text-neutral-black dark:text-dark-text-primary tracking-tight leading-tight">{contact.name}</h2>
                           
                           <div className="mt-3 flex gap-2 flex-wrap justify-center">
                               <span className="px-3 py-1.5 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-lg text-xxs font-extrabold text-primary dark:text-primary uppercase tracking-wide">{contact.department}</span>
                               <span className="px-3 py-1.5 bg-secondary-purple/10 dark:bg-secondary-purple/20 border border-secondary-purple/20 dark:border-secondary-purple/30 rounded-lg text-xxs font-extrabold text-secondary-purple dark:text-secondary-purple uppercase tracking-wide">{contact.position}</span>
                           </div>
                       </div>
                  </div>

                  <h3 className="text-xxs font-black text-primary dark:text-primary uppercase mb-3 ml-2 tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-briefcase text-xxs"></i> Thông tin công việc
                  </h3>
                  <div className="bg-neutral-white dark:bg-dark-surface rounded-xl overflow-hidden border border-slate-100 dark:border-dark-border divide-y divide-slate-50 dark:divide-dark-border mb-6">
                      <ContactDetailRow 
                          icon="fa-sitemap" 
                          colorClass="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary"
                          label="Trung tâm phụ trách"
                          value={managedLocationNames}
                      />
                      {contactAddress && (
                          <ContactDetailRow 
                              icon="fa-map-location-dot" 
                              colorClass="bg-secondary-orange/10 dark:bg-secondary-orange/20 text-secondary-orange dark:text-secondary-orange"
                              label="Địa chỉ làm việc"
                              value={contactAddress}
                          />
                      )}                      
                      {contact.direct_manager_id && empNameMap[contact.direct_manager_id] && (
                          <ContactDetailRow 
                              icon="fa-user-tie" 
                              colorClass="bg-secondary-green/10 dark:bg-secondary-green/20 text-secondary-green dark:text-secondary-green"
                              label="Quản lý trực tiếp"
                              value={empNameMap[contact.direct_manager_id]}
                          />
                      )}
                  </div>

                  <h3 className="text-xxs font-black text-primary dark:text-primary uppercase mb-3 ml-2 tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-address-book text-xxs"></i> Thông tin liên hệ
                  </h3>
                  <div className="bg-neutral-white dark:bg-dark-surface rounded-xl overflow-hidden border border-slate-100 dark:border-dark-border divide-y divide-slate-50 dark:divide-dark-border mb-8">
                      <ContactDetailRow 
                          icon="fa-envelope" 
                          colorClass="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary"
                          label="Email"
                          value={contact.email}
                          isLink
                          href={`mailto:${contact.email}`}
                      />
                      <ContactDetailRow 
                          icon="fa-phone" 
                          colorClass="bg-secondary-green/10 dark:bg-secondary-green/20 text-secondary-green dark:text-secondary-green"
                          label="Số điện thoại"
                          value={String(contact.phone)}
                          isLink
                          href={`tel:${contact.phone}`}
                      />
                  </div>
              </div>
         </div>
         <BottomNav 
            activeTab={activeTab}
            onChange={(t) => {
                triggerHaptic('light');
                onNavigate(t);
            }}
            user={currentUser}
            notiCount={notiCount}
            onOpenNoti={onOpenNoti}
        />
    </div>
  );
};

export default ModalContactDetail;