import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Employee, DashboardData } from '@/shared/types';
import { submitExplanation } from '@/modules/tms/services';
import { formatDateString, triggerHaptic } from '@/core/utils/helpers';
import ModalHeader from '@/shared/components/modals/ModalHeader';
import ConfirmDialog from '@/shared/components/modals/ConfirmDialog';
import BottomNav, { TabType } from './BottomNav';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAlert: (title: string, msg: string, type: 'success' | 'error' | 'warning') => void;
  user: Employee;
  initialData?: { date: string, reason: string };
  explainableItems: { date: string, explainReason: string }[];
  onNavigate: (tab: TabType) => void;
  notiCount: number;
  onOpenNoti: () => void;
  data: DashboardData | null;
}

const ReasonBadge = ({ reason }: { reason: string }) => {
    let badgeClass = 'bg-slate-100 dark:bg-dark-surface border-slate-200 dark:border-dark-border text-slate-500 dark:text-dark-text-secondary';

    if (reason.includes('Vắng') || reason.includes('Quên')) {
        badgeClass = 'bg-secondary-red/10 dark:bg-secondary-red/20 border-secondary-red/20 dark:border-secondary-red/30 text-secondary-red dark:text-secondary-red';
    } else if (reason.includes('Trễ')) {
        badgeClass = 'bg-secondary-yellow/10 dark:bg-secondary-yellow/20 border-secondary-yellow/20 dark:border-secondary-yellow/30 text-secondary-yellow dark:text-secondary-yellow';
    } else if (reason.includes('sớm')) {
        badgeClass = 'bg-primary/10 dark:bg-primary/20 border-primary/20 dark:border-primary/30 text-primary dark:text-primary';
    }

    return (
        <span className={`px-2 py-1 border text-xxs font-extrabold rounded-md leading-none whitespace-nowrap uppercase tracking-widest ${badgeClass}`}>
            {reason}
        </span>
    );
};

const ReasonDisplay = ({ reasons }: { reasons: string }) => {
    const reasonList = reasons.split(', ').map(r => r.trim());
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {reasonList.map((reason, index) => (
                <ReasonBadge key={index} reason={reason} />
            ))}
        </div>
    );
};

const ModalExplainWork: React.FC<Props> = ({ isOpen, onClose, onSuccess, onAlert, user, initialData, explainableItems, onNavigate, notiCount, onOpenNoti, data }) => {
  const [selectedDate, setSelectedDate] = useState(initialData?.date || '');
  const [reason, setReason] = useState(initialData?.reason || '');
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, isPastMonth: boolean}>({ isOpen: false, isPastMonth: false });
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('history');

  const touchStart = useRef<{x: number, y: number} | null>(null);
  const touchEnd = useRef<{x: number, y: number} | null>(null);
  const minSwipeDistance = 60;

  useEffect(() => {
    if (isOpen) {
        setSelectedDate(initialData?.date || '');
        setReason(initialData?.reason || '');
    }
  }, [isOpen, initialData]);

  const handlePreSubmit = () => {
      triggerHaptic('light');
      if (!reason.trim()) {
          onAlert("Thiếu thông tin", "Vui lòng nhập lý do giải trình.", 'error');
          return;
      }
      if (!selectedDate) {
          onAlert("Thiếu thông tin", "Vui lòng chọn ngày.", 'error');
          return;
      }

      const attDate = new Date(selectedDate);
      const now = new Date();
      const isPast = attDate.getMonth() !== now.getMonth() || attDate.getFullYear() !== now.getFullYear();

      // Check for overlapping explanations
      if (data && data.myExplanations) {
          const hasOverlap = data.myExplanations.some(exp => {
              if (exp.status === 'Rejected') return false;
              return exp.date === selectedDate;
          });

          if (hasOverlap) {
              onAlert("Trùng lặp", "Bạn đã có đơn giải trình cho ngày này.", 'error');
              return;
          }
      }

      setConfirmDialog({
          isOpen: true,
          isPastMonth: isPast
      });
  };

  const handleSubmitExplanation = async () => {
      setLoading(true);
      const res = await submitExplanation({
          employeeId: user.employee_id,
          name: user.name,
          date: selectedDate,
          reason: reason
      });
      
      if (res.success) {
          triggerHaptic('success');
          onAlert("Thành công", "Đã gửi giải trình.", 'success');
          onSuccess();
          onClose();
      } else {
          triggerHaptic('error');
          onAlert("Lỗi", res.message, 'error');
      }
      
      setLoading(false);
      setConfirmDialog({ isOpen: false, isPastMonth: false });
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

  const selectedItem = selectedDate ? explainableItems.find(i => i.date === selectedDate) : null;

  return (
    <>
        <div 
          className="fixed inset-0 z-[80] bg-slate-50 dark:bg-dark-bg flex flex-col animate-slide-up transition-colors duration-300"
        >
            <div className="fixed top-0 left-0 w-full z-[90]">
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
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-secondary-orange/10 to-secondary-yellow/10 dark:from-secondary-orange/20 dark:to-secondary-yellow/20 rounded-t-xl transition-colors duration-500"></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-28 h-28 rounded-full p-1.5 bg-neutral-white dark:bg-dark-surface mb-4 mt-2 relative transition-colors">
                                <div className="w-full h-full rounded-full bg-secondary-orange/10 dark:bg-secondary-orange/20 flex items-center justify-center border border-secondary-orange/20 dark:border-secondary-orange/30 text-secondary-orange dark:text-secondary-orange">
                                    <i className="fa-solid fa-file-pen text-4xl ml-1"></i>
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-neutral-black dark:text-dark-text-primary tracking-tight leading-tight">Giải Trình Công</h2>
                            <p className="text-xs text-slate-500 dark:text-dark-text-secondary font-bold mt-2 uppercase tracking-wide">Bổ sung thông tin chấm công</p>
                        </div>
                    </div>

                    <h3 className="text-xxs font-black text-primary dark:text-primary uppercase mb-3 ml-2 tracking-widest flex items-center gap-2">
                        <i className="fa-solid fa-list-check text-xxs"></i>
                        Thông tin chi tiết
                    </h3>

                    <div className="bg-neutral-white dark:bg-dark-surface rounded-xl p-6 border border-slate-100 dark:border-dark-border space-y-5 transition-colors mb-8 shadow-sm">
                        
                        <div className="relative">
                            <label className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide ml-1 block mb-1.5">Chọn ngày cần giải trình</label>
                            <button 
                                onClick={() => { triggerHaptic('light'); setIsDropdownOpen(!isDropdownOpen); }}
                                className={`w-full min-h-[56px] px-4 py-3 flex justify-between items-center bg-slate-50 dark:bg-dark-bg/50 border rounded-xl text-sm font-bold outline-none transition-all ${isDropdownOpen ? 'border-secondary-orange dark:border-secondary-orange ring-2 ring-secondary-orange/20' : 'border-slate-200 dark:border-dark-border'}`}
                            >
                                <div className="text-left flex-1 flex items-center gap-3">
                                    {selectedItem ? (
                                        <>
                                            <ReasonDisplay reasons={selectedItem.explainReason} />
                                            <span className="block text-neutral-black dark:text-dark-text-primary font-bold ml-auto">
                                                {formatDateString(selectedDate)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-slate-400 dark:text-dark-text-secondary">Chọn ngày...</span>
                                    )}
                                </div>
                                <i className={`fa-solid fa-chevron-down text-slate-400 dark:text-dark-text-secondary text-xs transition-transform ml-3 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
                            </button>
                            
                            {isDropdownOpen && (
                                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-neutral-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-xl z-50 overflow-hidden animate-fade-in p-2 space-y-1 shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                    {explainableItems.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400 dark:text-dark-text-secondary font-bold uppercase tracking-widest">Không có ngày nào cần giải trình</div>
                                    ) : (
                                        explainableItems.map((item) => (
                                            <div 
                                                key={item.date}
                                                onClick={() => {
                                                    triggerHaptic('light');
                                                    setSelectedDate(item.date);
                                                    setReason(item.explainReason || '')
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${
                                                    selectedDate === item.date 
                                                    ? 'bg-secondary-orange/10 dark:bg-secondary-orange/20' 
                                                    : 'text-slate-600 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-border/50'
                                                }`}
                                            >
                                                <div className="flex-1 flex items-center gap-3">
                                                    <ReasonDisplay reasons={item.explainReason} />
                                                     <span className={`font-bold text-sm ml-auto ${selectedDate === item.date ? 'text-secondary-orange dark:text-secondary-orange' : 'dark:text-dark-text-primary'}`}>
                                                        {formatDateString(item.date)}
                                                    </span>
                                                </div>
                                                {selectedDate === item.date && (
                                                    <i className="fa-solid fa-check text-secondary-orange dark:text-secondary-orange ml-3"></i>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide ml-1 block mb-1.5">Lý do giải trình</label>
                            <textarea 
                                id="explain-reason-textarea"
                                className="w-full p-4 bg-slate-50 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-xl text-sm font-bold text-neutral-black dark:text-dark-text-primary outline-none h-32 resize-none focus:ring-2 focus:ring-secondary-orange/20 focus:border-secondary-orange dark:focus:border-secondary-orange transition-all placeholder:text-slate-400 dark:placeholder:text-dark-text-secondary/50" 
                                placeholder="Nhập lý do chi tiết..."
                                value={reason} 
                                onChange={e => setReason(e.target.value)}
                            ></textarea>
                        </div>

                        <button 
                            onClick={handlePreSubmit}
                            disabled={loading}
                            className="w-full bg-secondary-orange hover:bg-secondary-orange/90 disabled:opacity-70 text-neutral-white font-extrabold py-4 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest mt-2 shadow-sm"
                        >
                            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <>Gửi giải trình <i className="fa-solid fa-paper-plane"></i></>}
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

        <ConfirmDialog 
            isOpen={confirmDialog.isOpen}
            title="Gửi giải trình?"
            message={confirmDialog.isPastMonth ? 
                <span className="text-secondary-red font-bold"><i className="fa-solid fa-triangle-exclamation mr-1"></i> Bạn đang giải trình cho tháng trước. Đơn này có thể bị tính là trễ hạn.</span> 
                : 
                <span>Hệ thống sẽ ghi nhận giải trình của bạn cho ngày <span className="text-neutral-black dark:text-dark-text-primary font-bold"> {formatDateString(selectedDate)}</span>.</span>
            }
            confirmLabel="Xác nhận gửi"
            onConfirm={handleSubmitExplanation}
            onCancel={() => setConfirmDialog({...confirmDialog, isOpen: false})}
            isLoading={loading}
            type={confirmDialog.isPastMonth ? 'warning' : 'success'}
        />
    </>
  );
};

export default ModalExplainWork;
