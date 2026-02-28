
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Employee } from '@/shared/types';
import Avatar from '@/shared/components/common/Avatar';
import { formatDateString, triggerHaptic } from '@/core/utils/helpers';

interface Props {
  groupedApprovals: {
    directReports: any[];
    groups: Record<string, any[]>;
  };
  processing: string | null;
  handleAction: (docId: string, status: 'Approved' | 'Rejected', type: 'leave' | 'explanation') => void;
  expandedApprovalGroup: string | null;
  setExpandedApprovalGroup: React.Dispatch<React.SetStateAction<string | null>>;
  totalPending: number;
  approvalGroups: any[];
  renderDateRange: (from: string, to: string) => string;
  getTypeConfig: (type: string, isLeave: boolean) => any;
  user: Employee;
  contacts: Employee[];
}

const ModalListRequest: React.FC<Props> = ({
  groupedApprovals,
  processing,
  handleAction,
  expandedApprovalGroup,
  setExpandedApprovalGroup,
  totalPending,
  approvalGroups,
  renderDateRange,
  getTypeConfig,
}) => {
  return (
    <motion.div
      key="approvals"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
      <h3 className="text-xs font-black text-primary dark:text-primary uppercase mb-3 px-1 tracking-widest flex items-center gap-2">
        <i className="fa-solid fa-clipboard-check text-xxs"></i>
        Cần duyệt
        {totalPending > 0 && (
          <span className={`bg-secondary-red text-neutral-white text-xxs font-bold h-5 flex items-center justify-center rounded-full ${totalPending < 10 ? 'w-5' : 'px-1.5 min-w-[20px]'}`}>
            {totalPending}
          </span>
        )}
      </h3>

      {totalPending === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-dark-text-secondary opacity-60 bg-neutral-white dark:bg-dark-surface rounded-xl border border-dashed border-slate-200 dark:border-dark-border"
        >
          <div className="w-16 h-16 bg-slate-50 dark:bg-dark-bg/50 rounded-full flex items-center justify-center mb-3">
            <i className="fa-solid fa-clipboard-check text-2xl text-slate-300 dark:text-dark-text-secondary"></i>
          </div>
          <p className="text-sm font-bold text-slate-500 dark:text-dark-text-primary uppercase tracking-wide">Đã xử lý hết yêu cầu</p>
        </motion.div>
      ) : (
        <div className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-dark-border animate-slide-up">
          {approvalGroups.map((group) => {
            const isExpanded = expandedApprovalGroup === group.id;
            return (
              <div key={group.id} className="transition-all duration-300">
                <div
                  onClick={() => { triggerHaptic('light'); setExpandedApprovalGroup(prev => prev === group.id ? null : group.id); }}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer select-none group/header active:bg-slate-50 dark:active:bg-dark-border/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-primary dark:text-primary">
                    <span className="text-xs font-black uppercase tracking-widest">{group.title}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary px-2 py-0.5 rounded-md text-xs font-bold tabular-nums">{group.items.length}</span>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="divide-y divide-slate-50 dark:divide-dark-border border-t border-slate-100 dark:border-dark-border bg-neutral-white dark:bg-dark-surface">
                        {group.items.map((item: any) => {
                          const isLeave = item.itemType === 'leave';
                          const config = getTypeConfig(item.type || '', isLeave);
                          const dateInfo = isLeave
                            ? renderDateRange(item.from_date, item.to_date)
                            : formatDateString(item.date?.split('T')[0]);

                          return (
                            <div key={item.id} className="w-full p-4 relative group transition-colors hover:bg-slate-50/50 dark:hover:bg-dark-border/30 active:bg-slate-50 dark:active:bg-dark-border/50">
                              <div className="flex items-start gap-3.5">
                                <div className="relative flex-shrink-0 mt-1">
                                  <Avatar
                                    src={item.emp?.face_ref_url}
                                    name={item.name}
                                    className="w-10 h-10 rounded-xl"
                                    textSize="text-xs"
                                  />
                                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-neutral-white dark:border-dark-surface flex items-center justify-center ${config.solidBg}`}>
                                    <i className={`fa-solid ${config.icon} text-xxs text-white`}></i>
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center gap-4">
                                    <h6 className="font-black text-neutral-black dark:text-dark-text-primary text-sm leading-tight truncate">{item.name}</h6>
                                    <div className="flex gap-1">
                                      {item.emp?.department && (
                                        <span className="px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary text-xxs font-extrabold border border-primary/20 dark:border-primary/30 uppercase tracking-wide truncate max-w-[120px]">
                                          {item.emp.department}
                                        </span>
                                      )}
                                      {item.emp?.position && (
                                        <span className="px-2 py-0.5 rounded-md bg-secondary-purple/10 dark:bg-secondary-purple/20 text-secondary-purple dark:text-secondary-purple text-xxs font-extrabold border border-secondary-purple/20 dark:border-secondary-purple/30 uppercase tracking-wide truncate max-w-[120px]">
                                          {item.emp.position}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 mt-1 mb-0">
                                    <span className={`text-xxs font-black uppercase tracking-widest ${config.text}`}>{config.label}</span>
                                    <span className="text-slate-300 dark:text-dark-border text-xxs">•</span>
                                    <span className="text-xxs font-bold text-slate-500 dark:text-dark-text-secondary font-mono">{dateInfo}</span>
                                  </div>

                                  <p className="text-xs text-slate-600 dark:text-dark-text-secondary line-clamp-2 leading-relaxed italic pr-2 mb-2">
                                    <span className="font-bold not-italic">Lý do: </span>"{item.reason}"
                                  </p>

                                  <div className="flex items-center gap-2 mt-1">
                                    <button
                                      disabled={!!processing}
                                      onClick={() => handleAction(item.id, 'Approved', item.itemType)}
                                      className="px-4 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary font-black text-xxs rounded-lg uppercase tracking-widest active:scale-95 transition-all hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                      {processing === item.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Duyệt'}
                                    </button>
                                    <button
                                      disabled={!!processing}
                                      onClick={() => handleAction(item.id, 'Rejected', item.itemType)}
                                      className="px-4 py-1.5 bg-slate-100 dark:bg-dark-bg text-secondary-red dark:text-secondary-red font-black text-xxs rounded-lg uppercase tracking-widest active:scale-95 transition-all hover:bg-secondary-red/10 dark:hover:bg-secondary-red/20 disabled:opacity-50 flex items-center justify-center"
                                    >
                                      Từ chối
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  );
};

export default ModalListRequest;
