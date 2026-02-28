import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Employee } from '@/shared/types';
import { getShortName, formatDateString, triggerHaptic } from '@/core/utils/helpers';
import { updateProfileAvatar, changePassword } from '@/modules/tms/services';
import { APP_INFO, MANAGEMENT_ROLES } from '@/shared/constants';
import Avatar from '@/shared/components/common/Avatar';
import ImageCropper from '@/shared/components/common/ImageCropper';
import ConfirmDialog from '@/shared/components/modals/ConfirmDialog';
import ModalHeader from '@/shared/components/modals/ModalHeader';

interface Props {
  user: Employee;
  locations: any[];
  contacts: Employee[];
  onLogout: () => void;
  onUpdate: (updatedUser: Partial<Employee>) => void;
  onClose: () => void;
  onAlert: (title: string, msg: string, type: 'success' | 'error' | 'warning') => void;
  setShowImageCropper: (show: boolean) => void;
  onInitNotifications?: () => void;
  onOpenManager?: () => void;
}

const TabProfile: React.FC<Props> = ({ user, locations, contacts, onLogout, onUpdate, onClose, onAlert, setShowImageCropper, onInitNotifications, onOpenManager }) => {
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
  const [croppingImage, setCroppingImage] = useState<string | null>(null);

  useEffect(() => {
    setShowImageCropper(!!croppingImage);
  }, [croppingImage, setShowImageCropper]);

  const touchStart = useRef<{x: number, y: number} | null>(null);
  const touchEnd = useRef<{x: number, y: number} | null>(null);
  const minSwipeDistance = 60;

  const bgClass = 'bg-primary';
  const gradientClass = 'from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10';

  const canManage = useMemo(() => user && user.role && MANAGEMENT_ROLES.includes(user.role), [user]);

  const managerName = useMemo(() => {
      if(!user.direct_manager_id) return null;
      const mgr = contacts.find(c => c.employee_id === user.direct_manager_id);
      return mgr ? mgr.name : user.direct_manager_id;
  }, [user.direct_manager_id, contacts]);

  const locationName = useMemo(() => {
      const loc = locations.find(l => l.center_id === user.center_id);
      return loc ? (loc.location_name || loc.name) : user.center_id;
  }, [user.center_id, locations]);

  const userAddress = useMemo(() => {
      const loc = locations.find(l => l.center_id === user.center_id);
      return loc?.address || '';
  }, [user.center_id, locations]);

  const managedLocationNames = useMemo(() => {
      if (!user.managed_locations || !Array.isArray(user.managed_locations) || user.managed_locations.length === 0) return '';
      return user.managed_locations.map(id => {
          const loc = locations.find(l => l.center_id === id);
          return loc ? (loc.location_name || loc.name) : id;
      }).join(', ');
  }, [user.managed_locations, locations]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (file.size > 10 * 1024 * 1024) { 
          onAlert("Lỗi file", "File quá lớn. Vui lòng chọn ảnh khác.", 'error');
          return;
      }

      const reader = new FileReader();
      reader.onload = () => {
          if (typeof reader.result === 'string') {
              setCroppingImage(reader.result);
          }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const handleCropComplete = async (url: string) => {
      setUploading(true);
      try {
          const res = await updateProfileAvatar(user.employee_id, url);
          if (res.success) {
              triggerHaptic('success');
              onUpdate({ face_ref_url: url });
              onAlert("Thành công", res.message, 'success');
          } else {
              triggerHaptic('error');
              onAlert("Lỗi", res.message, 'error');
          }
      } catch (err) {
          console.error(err);
          onAlert("Lỗi", "Lỗi xử lý ảnh.", 'error');
      } finally {
          setUploading(false);
          setCroppingImage(null);
      }
  };

  const handleUpdatePassword = async () => {
      if (!passData.old || !passData.new || !passData.confirm) {
          triggerHaptic('warning');
          onAlert("Thiếu thông tin", "Vui lòng điền đầy đủ thông tin!", 'warning');
          return;
      }
      if (passData.new !== passData.confirm) {
          triggerHaptic('warning');
          onAlert("Lỗi mật khẩu", "Mật khẩu mới không khớp!", 'warning');
          return;
      }
      if (passData.new.length < 6) {
          triggerHaptic('warning');
          onAlert("Mật khẩu yếu", "Mật khẩu mới phải có ít nhất 6 ký tự.", 'warning');
          return;
      }

      setLoadingPwd(true);
      const res = await changePassword(user.employee_id, passData.old, passData.new);
      setLoadingPwd(false);

      if (res.success) {
          triggerHaptic('success');
          onAlert("Thành công", res.message, 'success');
          setShowPwdModal(false);
          setPassData({ old: '', new: '', confirm: '' });
      } else {
          triggerHaptic('error');
          onAlert("Lỗi", res.message, 'error');
      }
  };

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
    
    if (Math.abs(distanceX) < Math.abs(distanceY)) {
        return;
    }

    if (distanceX > minSwipeDistance) {
        e.stopPropagation();
        triggerHaptic('light');
        onClose();
    }
  };

  const ProfileRow = ({ 
      icon, 
      colorClass, 
      label, 
      value, 
      isLink = false, 
      onClick,
      isDestructive = false,
      textClass
  }: { 
      icon: string, 
      colorClass: string, 
      label: string, 
      value?: string | React.ReactNode, 
      isLink?: boolean,
      onClick?: () => void,
      isDestructive?: boolean,
      textClass?: string
  }) => (
      <div 
          onClick={() => { if(onClick) { triggerHaptic('light'); onClick(); } }}
          className={`flex items-center gap-4 p-4 active:bg-slate-50 dark:active:bg-dark-border/50 transition-colors group ${onClick ? 'cursor-pointer' : ''}`}
      >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${colorClass}`}>
              <i className={`fa-solid ${icon}`}></i>
          </div>
          
          <div className="flex-1 min-w-0">
              {value && <p className="text-xxs text-slate-400 dark:text-dark-text-secondary font-bold truncate uppercase tracking-wider">{label}</p>}
              <p className={`text-base font-bold ${textClass || (isDestructive ? 'text-secondary-red dark:text-secondary-red' : 'text-neutral-black dark:text-dark-text-primary')} truncate ${value ? 'mt-0.5' : ''}`}>{value || label}</p>
          </div>
          {isLink && (
              <div className="text-slate-300 dark:text-dark-text-secondary/30">
                  <i className="fa-solid fa-chevron-right text-xs"></i>
              </div>
          )}
      </div>
  );

  return (
    <div 
        className="fixed inset-0 z-[30] bg-slate-50 dark:bg-dark-bg flex flex-col animate-slide-up transition-colors duration-300"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
        
        <div className="fixed top-0 left-0 w-full z-40">
            <ModalHeader 
                onClose={() => { triggerHaptic('light'); onClose(); }} 
                bgClass="bg-transparent border-none"
            />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-32 pt-14">
            <div className="animate-fade-in">
                
                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl p-8 border border-slate-100 dark:border-dark-border text-center relative overflow-hidden mb-8 transition-colors mt-4 shadow-sm">
                    <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-br ${gradientClass} rounded-t-xl transition-colors duration-500 opacity-60`}></div>
                    <div className="absolute top-0 left-0 w-full h-32 overflow-hidden pointer-events-none opacity-10">
                        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full border-[20px] border-primary"></div>
                        <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full border-[30px] border-primary"></div>
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full p-1.5 bg-neutral-white dark:bg-dark-surface mb-4 mt-2 relative overflow-hidden transition-colors">
                                <Avatar 
                                    src={user.face_ref_url} 
                                    name={user.name} 
                                    className="w-full h-full"
                                    textSize="text-4xl"
                                    onClick={() => fileInputRef.current?.click()}
                                />
                                <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                    <i className="fa-solid fa-camera text-white text-2xl"></i>
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleFileSelect}
                            />
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 rounded-full">
                                    <i className="fa-solid fa-circle-notch fa-spin text-primary"></i>
                                </div>
                            )}
                        </div>

                        <h2 className="text-2xl font-black text-neutral-black dark:text-dark-text-primary tracking-tight leading-tight">{user.name}</h2>
                        
                        <div className="flex gap-2 flex-wrap justify-center mt-3">
                            <span className="px-3 py-1.5 bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-md text-xxs font-extrabold text-primary dark:text-primary uppercase tracking-wide">{user.department}</span>
                            <span className="px-3 py-1.5 bg-secondary-purple/10 dark:bg-secondary-purple/20 border border-secondary-purple/20 dark:border-secondary-purple/30 rounded-md text-xxs font-extrabold text-secondary-purple dark:text-secondary-purple uppercase tracking-wide">{user.position}</span>                            
                        </div>
                    </div>
                </div>

                {canManage && (
                    <>
                        <h3 className="text-xs font-black text-primary dark:text-primary uppercase mb-3 ml-2 tracking-widest flex items-center gap-2">
                            <i className="fa-solid fa-gauge-high text-xxs"></i>
                            Quản trị
                        </h3>
                        <div className="bg-neutral-white dark:bg-dark-surface rounded-xl overflow-hidden border border-slate-100 dark:border-dark-border divide-y divide-slate-50 dark:divide-dark-border mb-8">
                            <ProfileRow 
                                icon="fa-briefcase" 
                                colorClass="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary"
                                label="Quản lý nhân sự"
                                isLink
                                onClick={onOpenManager}
                            />
                        </div>
                    </>
                )}

                <h3 className="text-xs font-black text-primary dark:text-primary uppercase mb-3 ml-2 tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-briefcase text-xxs"></i>
                    Thông tin công việc
                </h3>
                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl overflow-hidden border border-slate-100 dark:border-dark-border divide-y divide-slate-50 dark:divide-dark-border mb-8">
                    <ProfileRow 
                        icon="fa-sitemap" 
                        colorClass="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary"
                        label="Trung tâm phụ trách"
                        value={managedLocationNames}
                    />                 
                    {userAddress && (
                        <ProfileRow 
                            icon="fa-map-location-dot" 
                            colorClass="bg-secondary-orange/10 dark:bg-secondary-orange/20 text-secondary-orange dark:text-secondary-orange"
                            label="Địa chỉ làm việc"
                            value={userAddress}
                        />
                    )}
                    <ProfileRow 
                        icon="fa-user-tie" 
                        colorClass="bg-secondary-green/10 dark:bg-secondary-green/20 text-secondary-green dark:text-secondary-green"
                        label="Quản lý trực tiếp"
                        value={managerName || "Không có"}
                    />
                    <ProfileRow 
                        icon="fa-calendar-day" 
                        colorClass="bg-secondary-yellow/10 dark:bg-secondary-yellow/20 text-secondary-yellow dark:text-secondary-yellow"
                        label="Ngày tham gia"
                        value={user.join_date ? formatDateString(user.join_date) : "--"}
                    />
                </div>

                <h3 className="text-xs font-black text-primary dark:text-primary uppercase mb-3 ml-2 tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-address-card text-xxs"></i>
                    Thông tin cá nhân
                </h3>
                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl overflow-hidden border border-slate-100 dark:border-dark-border divide-y divide-slate-50 dark:divide-dark-border mb-8">
                    <ProfileRow 
                        icon="fa-envelope" 
                        colorClass="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary"
                        label="Email"
                        value={user.email}
                    />
                    <ProfileRow 
                        icon="fa-phone" 
                        colorClass="bg-secondary-green/10 dark:bg-secondary-green/20 text-secondary-green dark:text-secondary-green"
                        label="Số điện thoại"
                        value={String(user.phone)}
                    />
                    <ProfileRow 
                        icon="fa-fingerprint" 
                        colorClass="bg-slate-100 dark:bg-dark-border/50 text-slate-500 dark:text-dark-text-secondary"
                        label="Thiết bị tin cậy"
                        value={user.trusted_device_id ? "Đã kích hoạt" : "Chưa kích hoạt"}
                    />
                </div>

                <h3 className="text-xs font-black text-primary dark:text-primary uppercase mb-3 ml-2 tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-user-shield text-xxs"></i>
                    Tài khoản
                </h3>
                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl overflow-hidden border border-slate-100 dark:border-dark-border divide-y divide-slate-50 dark:divide-dark-border mb-8">
                    <ProfileRow 
                        icon="fa-key" 
                        colorClass="bg-secondary-yellow/10 dark:bg-secondary-yellow/20 text-secondary-yellow dark:text-secondary-yellow"
                        label="Đổi mật khẩu"
                        textClass="text-secondary-yellow dark:text-secondary-yellow"
                        isLink
                        onClick={() => setShowPwdModal(true)}
                    />
                    <ProfileRow 
                        icon="fa-right-from-bracket" 
                        colorClass="bg-secondary-red/10 dark:bg-secondary-red/20 text-secondary-red dark:text-secondary-red"
                        label="Đăng xuất"
                        isDestructive
                        onClick={() => {
                            triggerHaptic('medium');
                            setShowLogoutConfirm(true);
                        }}
                    />
                </div>
                
                <div className="text-center pb-8">
                    <p className="text-xxs font-extrabold text-slate-300 dark:text-dark-text-secondary/50 uppercase tracking-widest">{APP_INFO.NAME} v{APP_INFO.VERSION}</p>
                </div>
            </div>
        </div>

        {showPwdModal && (
            <div className="fixed inset-0 z-[100] bg-neutral-black/50 dark:bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-neutral-white dark:bg-dark-surface w-full max-w-sm rounded-xl p-6 animate-scale-in">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-secondary-yellow/10 dark:bg-secondary-yellow/20 text-secondary-yellow border border-secondary-yellow/20 dark:border-secondary-yellow/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-lock text-2xl"></i>
                        </div>
                        <h3 className="text-xl font-black text-neutral-black dark:text-dark-text-primary tracking-tight">Đổi mật khẩu</h3>
                        <p className="text-xs text-slate-500 dark:text-dark-text-secondary font-bold mt-1 uppercase tracking-wide">Cập nhật mật khẩu bảo vệ tài khoản</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide ml-1">Mật khẩu hiện tại</label>
                            <input 
                                type="password" 
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-xl text-sm font-bold text-neutral-black dark:text-dark-text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300 dark:placeholder:text-dark-text-secondary/50 placeholder:font-semibold"
                                placeholder="••••••••"
                                value={passData.old}
                                onChange={e => setPassData({...passData, old: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide ml-1">Mật khẩu mới</label>
                            <input 
                                type="password" 
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-xl text-sm font-bold text-neutral-black dark:text-dark-text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300 dark:placeholder:text-dark-text-secondary/50 placeholder:font-semibold"
                                placeholder="••••••••"
                                value={passData.new}
                                onChange={e => setPassData({...passData, new: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide ml-1">Xác nhận mật khẩu</label>
                            <input 
                                type="password" 
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-xl text-sm font-bold text-neutral-black dark:text-dark-text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300 dark:placeholder:text-dark-text-secondary/50 placeholder:font-semibold"
                                placeholder="••••••••"
                                value={passData.confirm}
                                onChange={e => setPassData({...passData, confirm: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button 
                            onClick={() => setShowPwdModal(false)}
                            className="flex-1 py-3.5 bg-slate-100 dark:bg-dark-border/50 text-slate-600 dark:text-dark-text-primary font-bold text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-dark-border transition-colors uppercase tracking-wide"
                        >
                            Hủy
                        </button>
                        <button 
                            onClick={handleUpdatePassword}
                            disabled={loadingPwd}
                            className="flex-1 py-3.5 bg-primary text-neutral-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 uppercase tracking-wide"
                        >
                            {loadingPwd ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Lưu thay đổi'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <ConfirmDialog 
            isOpen={showLogoutConfirm}
            title="Đăng xuất?"
            message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?"
            confirmLabel="Đăng xuất"
            onConfirm={onLogout}
            onCancel={() => setShowLogoutConfirm(false)}
            type="danger"
        />

        {croppingImage && (
            <ImageCropper 
                imageSrc={croppingImage} 
                userId={user.employee_id}
                onCancel={() => { setCroppingImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                onCropComplete={handleCropComplete}
            />
        )}
    </div>
  );
};

export default TabProfile;
