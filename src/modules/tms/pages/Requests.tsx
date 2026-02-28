import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, Employee } from '@/shared/types';
import { deleteRequest, deleteExplanation } from '@/modules/tms/services';
import { useToast } from '@/shared/contexts/ToastContext';
import ConfirmDialog from '@/shared/components/modals/ConfirmDialog';
import { formatDateString, triggerHaptic } from '@/core/utils/helpers';
import PullToRefresh from '@/shared/components/layout/PullToRefresh';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  data: DashboardData | null;
  user: Employee;
  onRefresh: () => Promise<void>;
  registerSwipeHandler?: (handler: ((direction: 'left' | 'right') => boolean) | null) => void;
}

const TabRequests: React.FC<Props> = ({ data, onRefresh, user, registerSwipeHandler }) => {
  const [viewMode, setViewMode] = useState<'leaves' | 'explanations'>('leaves');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'leave' | 'explanation' } | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (registerSwipeHandler) {
        registerSwipeHandler((direction) => {
            if (direction === 'left' && viewMode === 'leaves') {
                triggerHaptic('light');
                setViewMode('explanations');
                setExpandedId(null);
                return true;
            }
            if (direction === 'right' && viewMode === 'explanations') {
                triggerHaptic('light');
                setViewMode('leaves');
                setExpandedId(null);
                return true;
            }
            return false;
        });
    }
    return () => {
        if (registerSwipeHandler) registerSwipeHandler(null);
    };
  }, [registerSwipeHandler, viewMode]);

  const requests = useMemo(() => {
      return [...(data?.myRequests || [])].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [data?.myRequests]);

  const explanations = useMemo(() => {
      return [...(data?.myExplanations || [])].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [data?.myExplanations]);

  const getStatusConfig = (status: string) => {
      switch (status) {
          case 'Approved': return { label: 'ĐÃ DUYỆT', text: 'text-secondary-green dark:text-secondary-green', icon: 'fa-circle-check' };
          case 'Rejected': return { label: 'TỪ CHỐI', text: 'text-secondary-red dark:text-secondary-red', icon: 'fa-circle-xmark' };
          default: return { label: 'CHỜ DUYỆT', text: 'text-secondary-yellow dark:text-secondary-yellow', icon: 'fa-circle-pause' };
      }
  };

  const getTypeConfig = (type: string) => {
      if (type.includes('Nghỉ phép')) return { icon: 'fa-umbrella-beach', bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-primary' };
      if (type.includes('Nghỉ ốm')) return { icon: 'fa-user-nurse', bg: 'bg-secondary-red/10 dark:bg-secondary-red/20', text: 'text-secondary-red dark:text-secondary-red' };
      if (type.includes('Nghỉ không lương')) return { icon: 'fa-calendar-minus', bg: 'bg-secondary-yellow/10 dark:bg-secondary-yellow/20', text: 'text-secondary-yellow dark:text-secondary-yellow' };
      if (type.includes('Làm việc tại nhà')) return { icon: 'fa-house-laptop', bg: 'bg-secondary-green/10 dark:bg-secondary-green/20', text: 'text-secondary-green dark:text-secondary-green' };
      if (type.includes('Công tác')) return { icon: 'fa-plane-departure', bg: 'bg-secondary-purple/10 dark:bg-secondary-purple/20', text: 'text-secondary-purple dark:text-secondary-purple' };
      if (type.includes('Giải trình')) return { icon: 'fa-file-signature', bg: 'bg-secondary-orange/10 dark:bg-secondary-orange/20', text: 'text-secondary-orange dark:text-secondary-orange' };
      return { icon: 'fa-file-lines', bg: 'bg-slate-100 dark:bg-dark-border/50', text: 'text-slate-500 dark:text-dark-text-secondary' };
  };

  const stats = useMemo(() => {
      if (viewMode === 'leaves') {
          const pending = requests.filter(r => r.status === 'Pending').length;
          const approved = requests.filter(r => r.status === 'Approved').length;
          const balance = user.annual_leave_balance || 0;
          return {
              col1: { label: 'Chờ duyệt', value: pending, color: 'text-secondary-yellow dark:text-secondary-yellow' },
              col2: { label: 'Đã duyệt', value: approved, color: 'text-primary dark:text-primary' },
              col3: { label: 'Quỹ phép', value: balance, color: 'text-secondary-green dark:text-secondary-green' }
          };
      } else {
          const pending = explanations.filter(e => e.status === 'Pending').length;
          const approved = explanations.filter(e => e.status === 'Approved').length;
          const rejected = explanations.filter(e => e.status === 'Rejected').length;
          return {
              col1: { label: 'Chờ duyệt', value: pending, color: 'text-secondary-yellow dark:text-secondary-yellow' },
              col2: { label: 'Đã duyệt', value: approved, color: 'text-primary dark:text-primary' },
              col3: { label: 'Từ chối', value: rejected, color: 'text-secondary-red dark:text-secondary-red' }
          };
      }
  }, [viewMode, requests, explanations, user]);

  const switchViewMode = (mode: 'leaves' | 'explanations') => {
      triggerHaptic('light');
      setViewMode(mode);
      setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
      triggerHaptic('light');
      setExpandedId(prev => prev === id ? null : id);
  };

  const handleDelete = async () => {
      if (!deleteConfirm) return;
      triggerHaptic('medium');
      
      let res;
      if (deleteConfirm.type === 'leave') {
          res = await deleteRequest(deleteConfirm.id);
      } else {
          res = await deleteExplanation(deleteConfirm.id);
      }

      if (res.success) {
          showToast({ title: "Thành công", body: res.message, type: "success" });
          onRefresh();
      } else {
          showToast({ title: "Lỗi", body: res.message, type: "error" });
      }
      setDeleteConfirm(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } } as const,
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <>
        <PullToRefresh onRefresh={onRefresh} className="bg-slate-50 dark:bg-dark-bg font-sans">
            <div className="pt-20 pb-32 px-4 animate-fade-in space-y-8">
                
                <div className="flex justify-center mb-8">
                     <div className="bg-slate-200/50 dark:bg-dark-surface p-1.5 rounded-xl flex relative w-full max-w-[280px] border border-transparent dark:border-dark-border">
                         <button 
                            onClick={() => switchViewMode('leaves')}
                            className={`flex-1 py-2.5 rounded-xl text-xxs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${viewMode === 'leaves' ? 'text-primary bg-neutral-white dark:bg-dark-border shadow-sm' : 'text-slate-500 dark:text-dark-text-secondary hover:text-slate-700 dark:hover:text-dark-text-primary'}`}
                         >
                             Nghỉ phép
                         </button>
                         <button 
                            onClick={() => switchViewMode('explanations')}
                            className={`flex-1 py-2.5 rounded-xl text-xxs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${viewMode === 'explanations' ? 'text-primary bg-neutral-white dark:bg-dark-border shadow-sm' : 'text-slate-500 dark:text-dark-text-secondary hover:text-slate-700 dark:hover:text-dark-text-primary'}`}
                         >
                             Giải trình
                         </button>
                     </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border p-4 flex flex-col items-center justify-center h-28 shadow-sm">
                        <span className={`text-3xl font-black mb-1 tabular-nums tracking-tighter ${stats.col1.color}`}>{stats.col1.value}</span>
                        <span className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest text-center">{stats.col1.label}</span>
                    </div>
                    <div className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border p-4 flex flex-col items-center justify-center h-28 shadow-sm">
                        <span className={`text-3xl font-black mb-1 tabular-nums tracking-tighter ${stats.col2.color}`}>{stats.col2.value}</span>
                        <span className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest text-center">{stats.col2.label}</span>
                    </div>
                    <div className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border p-4 flex flex-col items-center justify-center h-28 shadow-sm">
                        <span className={`text-3xl font-black mb-1 tabular-nums tracking-tighter ${stats.col3.color}`}>{stats.col3.value}</span>
                        <span className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest text-center">{stats.col3.label}</span>
                    </div>
                </div>

                {viewMode === 'leaves' && (
                    <div>
                        <h3 className="text-xs font-black text-primary dark:text-primary uppercase ml-2 mb-3 tracking-widest flex items-center gap-2">
                            <i className="fa-solid fa-umbrella-beach text-xxs"></i>
                            Danh sách đơn nghỉ phép
                        </h3>
                        {requests.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-dark-text-secondary opacity-60 bg-neutral-white dark:bg-dark-surface rounded-xl border border-dashed border-slate-200 dark:border-dark-border"
                            >
                                <div className="w-16 h-16 bg-slate-50 dark:bg-dark-border/50 rounded-full flex items-center justify-center mb-3">
                                    <i className="fa-regular fa-folder-open text-2xl text-slate-300 dark:text-dark-text-secondary"></i>
                                </div>
                                <p className="text-sm font-bold text-slate-500 dark:text-dark-text-primary">Chưa có đề xuất nào</p>
                            </motion.div>
                        ) : (
                            <motion.div 
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-dark-border mb-4"
                            >
                                <AnimatePresence>
                                    {requests.map((req) => {
                                        const statusInfo = getStatusConfig(req.status);
                                        const typeInfo = getTypeConfig(req.type);
                                        const isExpanded = expandedId === req.id;

                                        return (
                                            <motion.div 
                                                variants={itemVariants}
                                                key={req.id} 
                                                className="w-full relative transition-colors hover:bg-slate-50/50 dark:hover:bg-dark-border/30 active:bg-slate-50 dark:active:bg-dark-border/50 group cursor-pointer"
                                                onClick={() => req.id && toggleExpand(req.id)}
                                            >
                                                {/* MẶT TIỀN GỌN GÀNG */}
                                                <div className="p-4 flex gap-3.5 relative">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${typeInfo.bg} ${typeInfo.text}`}>
                                                        <i className={`fa-solid ${typeInfo.icon}`}></i>
                                                    </div>

                                                     <div className="flex-1 min-w-0 pt-0.5 relative">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-black text-slate-800 dark:text-dark-text-primary text-sm leading-tight truncate pr-2">{req.type}</h4>
                                                            <span className={`text-xxs font-extrabold uppercase tracking-widest flex-shrink-0 flex items-center gap-1 ${statusInfo.text}`}>
                                                                <i className={`fa-solid ${statusInfo.icon}`}></i> {statusInfo.label}
                                                            </span>
                                                        </div>

                                                        <div className="pr-8">
                                                            <div className="flex items-center gap-2 text-xxs font-bold text-slate-500 dark:text-dark-text-secondary font-mono mb-0.5">
                                                                {req.from_date === req.to_date ? formatDateString(req.from_date) : `${formatDateString(req.from_date)} - ${formatDateString(req.to_date)}`}
                                                            </div>
                                                            
                                                            {/* Lý do tóm tắt (Cắt bớt nếu chưa mở rộng) */}
                                                            <p className={`text-xxs text-slate-500 dark:text-dark-text-secondary italic ${isExpanded ? '' : 'line-clamp-1'}`}>
                                                                <span className="font-bold not-italic">Lý do:</span> {req.reason}
                                                            </p>
                                                        </div>

                                                        {req.status === 'Pending' && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: req.id!, type: 'leave' }); }}
                                                                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-slate-50 dark:bg-dark-border flex items-center justify-center text-slate-400 hover:text-secondary-red hover:bg-secondary-red/10 transition-colors"
                                                            >
                                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* CHI TIẾT MỞ RỘNG (Phản hồi của sếp) */}
                                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                    {req.manager_note && (
                                                        <div className="mx-4 mb-4 mt-1 pl-3 py-1 border-l-2 border-slate-200 dark:border-dark-border">
                                                            <p className="text-xxs font-black text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest mb-0.5">Quản lý phản hồi:</p>
                                                            <p className="text-xs font-medium text-slate-700 dark:text-dark-text-primary leading-relaxed">{req.manager_note}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </div>
                )}

                {viewMode === 'explanations' && (
                    <div>
                        <h3 className="text-xs font-black text-primary dark:text-primary uppercase ml-2 mb-3 tracking-widest flex items-center gap-2">
                            <i className="fa-solid fa-file-signature text-xxs"></i>
                            Danh sách giải trình
                        </h3>
                        {explanations.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-dark-text-secondary opacity-60 bg-neutral-white dark:bg-dark-surface rounded-xl border border-dashed border-slate-200 dark:border-dark-border"
                            >
                                <div className="w-16 h-16 bg-slate-50 dark:bg-dark-border/50 rounded-full flex items-center justify-center mb-3">
                                    <i className="fa-solid fa-file-signature text-2xl text-slate-300 dark:text-dark-text-secondary"></i>
                                </div>
                                <p className="text-sm font-bold text-slate-500 dark:text-dark-text-primary">Chưa có giải trình nào</p>
                            </motion.div>
                        ) : (
                            <motion.div 
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-dark-border mb-4"
                            >
                                <AnimatePresence>
                                    {explanations.map((exp) => {
                                        const statusInfo = getStatusConfig(exp.status);
                                        const isExpanded = expandedId === exp.id;
                                        
                                        return (
                                            <motion.div 
                                                variants={itemVariants}
                                                key={exp.id} 
                                                className="w-full relative transition-colors hover:bg-slate-50/50 dark:hover:bg-dark-border/30 active:bg-slate-50 dark:active:bg-dark-border/50 group cursor-pointer"
                                                onClick={() => exp.id && toggleExpand(exp.id)}
                                            >
                                                {/* MẶT TIỀN GỌN GÀNG */}
                                                <div className="p-4 flex gap-3.5 relative">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary-orange/10 dark:bg-secondary-orange/20 text-secondary-orange dark:text-secondary-orange text-lg">
                                                        <i className="fa-solid fa-file-signature"></i>
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0 pt-0.5 relative">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-black text-slate-800 dark:text-dark-text-primary text-sm leading-tight truncate pr-2">
                                                                Giải trình công
                                                            </h4>
                                                            <span className={`text-xxs font-extrabold uppercase tracking-widest flex-shrink-0 flex items-center gap-1 ${statusInfo.text}`}>
                                                                <i className={`fa-solid ${statusInfo.icon}`}></i> {statusInfo.label}
                                                            </span>
                                                        </div>

                                                        <div className="pr-8">
                                                            <div className="flex items-center gap-2 text-xxs font-bold text-slate-500 dark:text-dark-text-secondary font-mono mb-0.5">
                                                                {formatDateString(exp.date)}
                                                            </div>

                                                            {/* Lý do tóm tắt */}
                                                            <p className={`text-xxs text-slate-500 dark:text-dark-text-secondary italic ${isExpanded ? '' : 'line-clamp-1'}`}>
                                                                <span className="font-bold not-italic">Lý do:</span> {exp.reason}
                                                            </p>
                                                        </div>

                                                        {exp.status === 'Pending' && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: exp.id!, type: 'explanation' }); }}
                                                                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-slate-50 dark:bg-dark-border flex items-center justify-center text-slate-400 hover:text-secondary-red hover:bg-secondary-red/10 transition-colors"
                                                            >
                                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* CHI TIẾT MỞ RỘNG (Phản hồi của sếp) */}
                                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                    {exp.manager_note && (
                                                        <div className="mx-4 mb-4 mt-1 pl-3 py-1 border-l-2 border-slate-200 dark:border-dark-border">
                                                            <p className="text-xxs font-black text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest mb-0.5">Quản lý phản hồi:</p>
                                                            <p className="text-xs font-medium text-slate-700 dark:text-dark-text-primary leading-relaxed">{exp.manager_note}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </PullToRefresh>

        <ConfirmDialog 
            isOpen={!!deleteConfirm} 
            title="Xác nhận xoá" 
            message="Bạn có chắc chắn muốn xoá đơn này không? Hành động này không thể hoàn tác."
            confirmLabel="Xoá đơn" 
            onConfirm={handleDelete} 
            onCancel={() => setDeleteConfirm(null)} 
            type="danger"
        />
    </>
  );
};
export default TabRequests;
