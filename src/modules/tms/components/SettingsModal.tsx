import React, { useState, useEffect, useRef } from 'react';
import UserGuideModal from './UserGuideModal';
import ModalHeader from '@/shared/components/modals/ModalHeader';
import ConfirmDialog from '@/shared/components/modals/ConfirmDialog';
import { APP_INFO } from '@/shared/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInitNotifications?: () => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onInitNotifications }) => {
  const [isDark, setIsDark] = useState(false);
  const [isAuto, setIsAuto] = useState(true);
  const [notiPermission, setNotiPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const lastScrollY = useRef(0);

  useEffect(() => {
      if (isOpen) {
          // Khi mở Modal, đọc trạng thái THỰC TẾ của thẻ html
          setIsDark(document.documentElement.classList.contains('dark'));
          setIsAuto(!localStorage.getItem('army_theme'));
      }
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      // Scroll logic removed as setIsNavVisible is gone
  };

  const handleThemeToggle = () => {
      const newDark = !isDark;
      setIsDark(newDark);
      setIsAuto(false);
      
      // 1. Lưu vào bộ nhớ máy để F5 không bị mất
      localStorage.setItem('army_theme', newDark ? 'dark' : 'light');
      
      // 2. QUAN TRỌNG NHẤT: Báo cho Tailwind biết để đổi màu ngay lập tức
      if (newDark) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
      
      // 3. Thông báo cho các Component khác
      window.dispatchEvent(new Event('army_theme_update'));
  };

  if (!isOpen) return null;

  const SettingItem = ({ 
    icon, 
    colorClass, 
    title, 
    subtitle, 
    type = 'link', 
    onClick,
    value = false
  }: { 
    icon: string, 
    colorClass: string, 
    title: string, 
    subtitle?: string, 
    type?: 'link' | 'toggle' | 'info',
    onClick?: () => void,
    value?: boolean
  }) => (
    <div 
        onClick={onClick}
        className="flex items-center gap-4 p-4 active:bg-slate-50 dark:active:bg-dark-border/50 transition-colors cursor-pointer group"
    >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${colorClass}`}>
            <i className={`fa-solid ${icon}`}></i>
        </div>

        <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-slate-800 dark:text-dark-text-primary leading-tight group-hover:text-primary transition-colors">{title}</h4>
            {subtitle && <p className="text-xs text-slate-400 dark:text-dark-text-secondary font-bold mt-0.5 truncate">{subtitle}</p>}
        </div>

        <div className="pl-2">
            {type === 'toggle' && (
                <div 
                    className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${value ? 'bg-primary' : 'bg-slate-200 dark:bg-dark-border'}`}
                >
                    <div className={`w-5 h-5 bg-neutral-white rounded-full absolute top-1 transition-transform duration-300 ${value ? 'translate-x-[22px]' : 'translate-x-1'}`}></div>
                </div>
            )}
            {type === 'info' && <i className="fa-solid fa-circle-info text-slate-300 dark:text-dark-text-secondary text-lg"></i>}
        </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-neutral-white dark:bg-dark-bg flex flex-col font-sans animate-slide-up">

          <ModalHeader 
              title="Cài đặt" 
              onClose={onClose} 
              bgClass="bg-neutral-white dark:bg-dark-bg"
          />

          <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-6 pt-4 relative z-0" onScroll={handleScroll}>
              
              <div className="relative group mb-2">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-400 dark:text-dark-text-secondary group-focus-within:text-primary transition-colors"></i>
                  <input 
                      type="text" 
                      placeholder="Tìm kiếm cài đặt..."
                      className="w-full h-11 bg-slate-50 dark:bg-dark-surface rounded-xl pl-11 pr-4 text-base font-bold text-slate-800 dark:text-dark-text-primary placeholder:text-slate-400 dark:placeholder:text-dark-text-secondary outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/20 border border-transparent transition-all focus:bg-neutral-white dark:focus:bg-dark-surface"
                  />
              </div>

              <div className="space-y-3">
                  <h3 className="text-xxs font-black text-primary dark:text-primary uppercase ml-2 tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-sliders text-xxs"></i> Tùy chọn chung
                  </h3>
                  <div className="bg-slate-50 dark:bg-dark-surface rounded-xl overflow-hidden border border-slate-100 dark:border-dark-border divide-y divide-slate-100 dark:divide-dark-border">
                      <SettingItem 
                          icon="fa-moon" 
                          colorClass="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                          title="Giao diện tối"
                          subtitle={isAuto ? "Tự động theo thiết bị" : (isDark ? "Đang bật (Thủ công)" : "Đang tắt (Thủ công)")}
                          type="toggle"
                          value={isDark} 
                          onClick={handleThemeToggle}
                      />
                      <SettingItem 
                          icon="fa-bell" 
                          colorClass="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                          title="Thông báo hệ thống"
                          subtitle={notiPermission === 'granted' ? "Đã bật (Nhận thông báo đẩy)" : "Chưa bật (Bấm để kích hoạt)"}
                          type="toggle"
                          value={notiPermission === 'granted'}
                          onClick={async () => {
                              if (onInitNotifications) {
                                  onInitNotifications();
                                  // Update status after a delay to catch permission change
                                  setTimeout(() => {
                                      if (typeof Notification !== 'undefined') {
                                          setNotiPermission(Notification.permission);
                                      }
                                  }, 1000);
                              }
                          }}
                      />
                       <SettingItem 
                          icon="fa-globe" 
                          colorClass="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          title="Ngôn ngữ"
                          subtitle="Tiếng Việt (Mặc định)"
                      />
                  </div>
              </div>

              <div className="space-y-3">
                  <h3 className="text-xxs font-black text-primary dark:text-primary uppercase ml-2 tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-headset text-xxs"></i> Trợ giúp & Hỗ trợ
                  </h3>
                  <div className="bg-slate-50 dark:bg-dark-surface rounded-xl overflow-hidden border border-slate-100 dark:border-dark-border divide-y divide-slate-100 dark:divide-dark-border">
                      <SettingItem 
                          icon="fa-phone-volume" 
                          colorClass="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary"
                          title="Tổng đài hỗ trợ"
                          subtitle="1900 1234 (Nhánh 1)"
                          onClick={() => setShowSupportModal(true)}
                      />
                      <a href="mailto:support@armytms.com" className="no-underline block">
                          <SettingItem 
                              icon="fa-paper-plane" 
                              colorClass="bg-secondary-red/10 dark:bg-secondary-red/20 text-secondary-red dark:text-secondary-red"
                              title="Gửi phản hồi"
                              subtitle="Báo lỗi hoặc góp ý tính năng"
                          />
                      </a>
                       <SettingItem 
                          icon="fa-book-open" 
                          colorClass="bg-slate-100 dark:bg-dark-border/50 text-slate-600 dark:text-dark-text-secondary"
                          title="Hướng dẫn sử dụng"
                          subtitle="Câu hỏi thường gặp (FAQ)"
                          onClick={() => setIsGuideOpen(true)}
                      />
                  </div>
              </div>

              <div className="space-y-3">
                  <h3 className="text-xxs font-black text-primary dark:text-primary uppercase ml-2 tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-circle-info text-xxs"></i> Thông tin ứng dụng
                  </h3>
                  <div className="bg-slate-50 dark:bg-dark-surface rounded-xl overflow-hidden border border-slate-100 dark:border-dark-border divide-y divide-slate-100 dark:divide-dark-border">
                      <div className="p-6 flex flex-col items-center justify-center text-center gap-3 bg-gradient-to-b from-neutral-white/50 dark:from-dark-bg/50 to-slate-50 dark:to-dark-surface">
                          <div className="w-20 h-20 bg-neutral-white dark:bg-dark-bg rounded-lg border border-slate-100 dark:border-dark-border/50 p-3 mb-1 animate-scale-in">
                               <img src={APP_INFO.LOGO_URL} className="w-full h-full object-contain" alt="Logo" />
                          </div>
                          <div>
                              <h4 className="text-xl font-black text-slate-800 dark:text-dark-text-primary tracking-tight">{APP_INFO.NAME}</h4>
                              <p className="text-xs text-slate-400 dark:text-dark-text-secondary font-bold uppercase tracking-wider bg-neutral-white dark:bg-dark-bg px-2 py-1 rounded-md inline-block mt-1">v{APP_INFO.VERSION}</p>
                          </div>
                      </div>
                      
                      <SettingItem 
                          icon="fa-shield-halved" 
                          colorClass="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
                          title="Chính sách bảo mật"
                          type="link"
                      />
                      <SettingItem 
                          icon="fa-file-contract" 
                          colorClass="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                          title="Điều khoản dịch vụ"
                          type="link"
                      />
                  </div>
              </div>
          </div>
      </div>

      <UserGuideModal 
          isOpen={isGuideOpen} 
          onClose={() => setIsGuideOpen(false)} 
      />

      <ConfirmDialog 
          isOpen={showSupportModal}
          title="Gọi tổng đài?"
          message="Bạn có muốn gọi đến tổng đài 1900 1234 (Nhánh 1) để được hỗ trợ trực tiếp không?"
          confirmLabel="Gọi ngay"
          onConfirm={() => { 
              window.location.href = 'tel:19001234';
              setShowSupportModal(false); 
          }}
          onCancel={() => setShowSupportModal(false)}
          type="success"
      />
    </>
  );
};

export default SettingsModal;
