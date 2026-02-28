import React, { useState, useEffect, useRef } from 'react';
import { Employee, DashboardData } from '@/shared/types';
import { submitRequest } from '@/modules/tms/services';
import { formatDateString, triggerHaptic } from '@/core/utils/helpers';
import ModalHeader from '@/shared/components/modals/ModalHeader';
import BottomNav, { TabType } from './BottomNav';

interface Props {
  user: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAlert: (title: string, msg: string, type: 'success' | 'error' | 'warning') => void;
  initialData?: { type: string, date: string, reason: string } | null;
  onNavigate: (tab: TabType) => void;
  notiCount: number;
  onOpenNoti: () => void;
  data: DashboardData | null;
}

const ModalCreateRequest: React.FC<Props> = ({ user, isOpen, onClose, onSuccess, onAlert, initialData, onNavigate, notiCount, onOpenNoti, data }) => {
  const [formData, setFormData] = useState({
      type: 'Nghỉ phép',
      fromDate: '',
      toDate: '',
      expirationDate: '',
      reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('requests');

  const touchStart = useRef<{x: number, y: number} | null>(null);
  const touchEnd = useRef<{x: number, y: number} | null>(null);
  const minSwipeDistance = 60;
  
  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setFormData({
                type: initialData.type,
                fromDate: initialData.date,
                toDate: initialData.date,
                expirationDate: '',
                reason: initialData.reason
            });
        } else {
             setFormData({ type: 'Nghỉ phép', fromDate: '', toDate: '', expirationDate: '', reason: '' });
        }
    }
  }, [isOpen, initialData]);

  const requestTypes = [
      "Nghỉ phép",
      "Nghỉ ốm",
      "Nghỉ không lương",
      "Công tác",
      "Làm việc tại nhà",
      "Giải trình công"
  ];

  const handleSubmit = async () => {
      triggerHaptic('light');
      if(!formData.fromDate || !formData.toDate || !formData.reason) {
          onAlert("Thiếu thông tin", "Vui lòng nhập đầy đủ ngày và lý do.", 'warning');
          return;
      }
      
      if (new Date(formData.fromDate) > new Date(formData.toDate)) {
          onAlert("Lỗi ngày tháng", "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.", 'error');
          return;
      }

      if (formData.type === 'Nghỉ phép') {
          if ((user.annual_leave_balance || 0) <= 0) {
              onAlert("Hết phép năm", "Bạn đã hết quỹ phép năm. Vui lòng chọn hình thức nghỉ khác (VD: Nghỉ không lương).", 'error');
              return;
          }
      }

      // Check for overlapping requests
      if (data && data.myRequests) {
          const newFrom = new Date(formData.fromDate);
          const newTo = new Date(formData.toDate);
          newFrom.setHours(0, 0, 0, 0);
          newTo.setHours(23, 59, 59, 999);

          const hasOverlap = data.myRequests.some(req => {
              if (req.status === 'Rejected') return false;
              const reqFrom = new Date(req.from_date);
              const reqTo = new Date(req.to_date);
              reqFrom.setHours(0, 0, 0, 0);
              reqTo.setHours(23, 59, 59, 999);

              return (newFrom <= reqTo && newTo >= reqFrom);
          });

          if (hasOverlap) {
              onAlert("Trùng lặp", "Bạn đã có đơn xin nghỉ/công tác trong khoảng thời gian này.", 'error');
              return;
          }
      }

      setLoading(true);
      const res = await submitRequest({
          employeeId: user.employee_id,
          name: user.name,
          ...formData
      });
      setLoading(false);
      
      onAlert(res.success ? "Thành công" : "Lỗi", res.message, res.success ? 'success' : 'error');

      if(res.success) {
          triggerHaptic('success');
          setFormData({ type: 'Nghỉ phép', fromDate: '', toDate: '', expirationDate: '', reason: '' });
          onSuccess();
          onClose();
      } else {
          triggerHaptic('error');
      }
  };

  const formatDateDisplay = (dateStr: string) => {
    return formatDateString(dateStr);
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
    
    if (Math.abs(distanceX) < Math.abs(distanceY)) return;

    if (distanceX > minSwipeDistance) {
        e.stopPropagation();
        triggerHaptic('light');
        onClose();
    }
  };

  if (!isOpen) return null;

  const gradientClass = 'from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10';

  return (
    <div 
        className="fixed inset-0 z-[100] bg-slate-50 dark:bg-dark-bg flex flex-col animate-slide-up transition-colors duration-300"
    >
        <div className="fixed top-0 left-0 w-full z-[110]">
             <ModalHeader 
                onClose={() => { triggerHaptic('light'); onClose(); }} 
                bgClass="bg-transparent border-none"
             />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-32 pt-14"         
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}>
            <div className="animate-fade-in mt-4">
                
                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl p-8 border border-slate-100 dark:border-dark-border text-center relative overflow-hidden mb-6 transition-colors shadow-sm">
                    <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-br ${gradientClass} rounded-t-xl transition-colors duration-500`}></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-28 h-28 rounded-full p-1.5 bg-neutral-white dark:bg-dark-surface mb-4 mt-2 relative transition-colors">
                            <div className="w-full h-full rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center border border-primary/20 dark:border-primary/30 text-primary dark:text-primary">
                                <i className="fa-solid fa-paper-plane text-4xl ml-[-4px]"></i>
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-neutral-black dark:text-dark-text-primary tracking-tight leading-tight">Tạo Đề Xuất</h2>
                        <p className="text-xs text-slate-500 dark:text-dark-text-secondary font-bold mt-2 uppercase tracking-wide">Điền thông tin chi tiết bên dưới</p>
                    </div>
                </div>

                <h3 className="text-xxs font-black text-primary dark:text-primary uppercase mb-3 ml-2 tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-pen-to-square text-xxs"></i>
                    Thông tin đề xuất
                </h3>
                
                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl p-6 border border-slate-100 dark:border-dark-border space-y-5 transition-colors mb-8 shadow-sm">
                     
                     <div className="relative">
                         <label className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide ml-1 block mb-1.5">Loại đề xuất</label>
                         <button 
                            onClick={() => { triggerHaptic('light'); setIsTypeOpen(!isTypeOpen); }}
                            className={`w-full h-14 px-4 flex justify-between items-center bg-slate-50 dark:bg-dark-bg/50 border rounded-xl text-sm font-bold outline-none transition-all ${isTypeOpen ? 'border-primary dark:border-primary ring-2 ring-primary/20' : 'border-slate-200 dark:border-dark-border'}`}
                         >
                             <span className="text-neutral-black dark:text-dark-text-primary">{formData.type}</span>
                             <i className={`fa-solid fa-chevron-down text-slate-400 dark:text-dark-text-secondary text-xs transition-transform ${isTypeOpen ? 'rotate-180' : ''}`}></i>
                         </button>
                         
                         {isTypeOpen && (
                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-neutral-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-xl z-50 overflow-hidden animate-fade-in p-2 space-y-1 shadow-xl">
                                {requestTypes.map((type) => (
                                    <div 
                                        key={type}
                                        onClick={() => {
                                            triggerHaptic('light');
                                            setFormData({...formData, type: type});
                                            setIsTypeOpen(false);
                                        }}
                                        className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${
                                            formData.type === type 
                                            ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary' 
                                            : 'text-slate-600 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-border/50'
                                        }`}
                                    >
                                        <span className={`font-bold text-sm ${formData.type === type ? '' : 'dark:text-dark-text-primary'}`}>{type}</span>
                                        {formData.type === type && (
                                            <i className="fa-solid fa-check text-primary dark:text-primary"></i>
                                        )}
                                    </div>
                                ))}
                            </div>
                         )}
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide ml-1 block mb-1.5">Từ ngày</label>
                             <div className="relative h-14 w-full">
                                 <input 
                                     type="date" 
                                     className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer"
                                     value={formData.fromDate} 
                                     onChange={e => setFormData({...formData, fromDate: e.target.value})}
                                     onClick={(e) => { try { e.currentTarget.showPicker() } catch(err) {} }}
                                 />
                                 <div className={`absolute inset-0 w-full h-full px-4 bg-slate-50 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-xl text-sm font-bold flex items-center justify-between pointer-events-none z-10 transition-colors ${formData.fromDate ? 'text-neutral-black dark:text-dark-text-primary' : 'text-slate-400 dark:text-dark-text-secondary/50'}`}>
                                     <span>{formData.fromDate ? formatDateDisplay(formData.fromDate) : 'dd/mm/yyyy'}</span>
                                     <i className="fa-regular fa-calendar text-slate-400 dark:text-dark-text-secondary/50"></i>
                                 </div>
                             </div>
                         </div>
                         <div>
                             <label className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide ml-1 block mb-1.5">Đến ngày</label>
                             <div className="relative h-14 w-full">
                                 <input 
                                     type="date" 
                                     className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer"
                                     value={formData.toDate} 
                                     onChange={e => setFormData({...formData, toDate: e.target.value})}
                                     onClick={(e) => { try { e.currentTarget.showPicker() } catch(err) {} }}
                                 />
                                 <div className={`absolute inset-0 w-full h-full px-4 bg-slate-50 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-xl text-sm font-bold flex items-center justify-between pointer-events-none z-10 transition-colors ${formData.toDate ? 'text-neutral-black dark:text-dark-text-primary' : 'text-slate-400 dark:text-dark-text-secondary/50'}`}>
                                     <span>{formData.toDate ? formatDateDisplay(formData.toDate) : 'dd/mm/yyyy'}</span>
                                     <i className="fa-regular fa-calendar text-slate-400 dark:text-dark-text-secondary/50"></i>
                                 </div>
                             </div>
                         </div>
                     </div>

                     <div>
                         <label className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide ml-1 block mb-1.5">Ngày hết hạn (Tuỳ chọn)</label>
                         <div className="relative h-14 w-full">
                             <input 
                                 type="date" 
                                 className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer"
                                 value={formData.expirationDate} 
                                 onChange={e => setFormData({...formData, expirationDate: e.target.value})}
                                 onClick={(e) => { try { e.currentTarget.showPicker() } catch(err) {} }}
                             />
                             <div className={`absolute inset-0 w-full h-full px-4 bg-slate-50 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-xl text-sm font-bold flex items-center justify-between pointer-events-none z-10 transition-colors ${formData.expirationDate ? 'text-neutral-black dark:text-dark-text-primary' : 'text-slate-400 dark:text-dark-text-secondary/50'}`}>
                                 <span>{formData.expirationDate ? formatDateDisplay(formData.expirationDate) : 'dd/mm/yyyy'}</span>
                                 <i className="fa-regular fa-clock text-slate-400 dark:text-dark-text-secondary/50"></i>
                             </div>
                         </div>
                     </div>

                     <div>
                         <label className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide ml-1 block mb-1.5">Lý do chi tiết</label>
                         <textarea 
                            className="w-full p-4 bg-slate-50 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-xl text-sm font-bold text-neutral-black dark:text-dark-text-primary outline-none h-32 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-dark-text-secondary/50" 
                            placeholder="Nhập lý do nghỉ hoặc giải trình..."
                            value={formData.reason} 
                            onChange={e => setFormData({...formData, reason: e.target.value})}
                         ></textarea>
                     </div>
                     
                     <button 
                        onClick={handleSubmit} 
                        disabled={loading} 
                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-70 text-neutral-white font-extrabold py-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest mt-2 shadow-sm"
                     >
                            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <>Gửi đề xuất <i className="fa-solid fa-paper-plane"></i></>}
                     </button>
                </div>
            </div>
        </div>
        <BottomNav 
            activeTab={activeTab}
            onChange={(t) => {
                triggerHaptic('light');
                onNavigate(t);
            }}
            user={user}
            notiCount={notiCount}
            onOpenNoti={onOpenNoti}
        />
    </div>
  );
};

export default ModalCreateRequest;
