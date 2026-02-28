import React, { useMemo } from 'react';
import { DashboardData, Employee } from '@/shared/types';
import { formatDateString } from '@/core/utils/helpers';
import { TabType } from './BottomNav';
import PullToRefresh from '@/shared/components/layout/PullToRefresh';
import { MANAGEMENT_ROLES } from '@/shared/constants';

interface Props {
  data: DashboardData | null;
  user: Employee;
  activeTab: TabType;
  onClose: () => void;
  onSwitchTab: (tab: any) => void;
  onRefresh: () => Promise<void>;
}

const NotificationsModal: React.FC<Props> = ({ data, user, activeTab, onClose, onSwitchTab, onRefresh }) => {

  const managedLocationsSet = useMemo(() => {
    return new Set(user.managed_locations || []);
  }, [user.managed_locations]);

  const contacts = data?.contacts || [];

  const { filteredApprovals, filteredExplanationApprovals } = useMemo(() => {
    const allApprovals = data?.notifications.approvals || [];
    const allExplanationApprovals = data?.notifications.explanationApprovals || [];

    if (user.role === 'Admin' || user.role === 'HR') {
        return {
            filteredApprovals: allApprovals,
            filteredExplanationApprovals: allExplanationApprovals,
        };
    }

    if (MANAGEMENT_ROLES.includes(user.role)) {
        const filterByUserScope = (approval: any) => {
            const emp = contacts.find(c => c.employee_id === approval.employee_id);
            if (!emp) return false;
            const isDirectReport = String(emp.direct_manager_id) === String(user.employee_id);
            const isInManagedLocation = emp.center_id ? managedLocationsSet.has(emp.center_id) : false;
            return isDirectReport || isInManagedLocation;
        };

        return {
            filteredApprovals: allApprovals.filter(filterByUserScope),
            filteredExplanationApprovals: allExplanationApprovals.filter(filterByUserScope),
        };
    }

    return {
        filteredApprovals: [],
        filteredExplanationApprovals: [],
    };
}, [data, user, contacts, managedLocationsSet]);


  const pendingCount = filteredApprovals.length + filteredExplanationApprovals.length;

  const myRequests = (data?.notifications.myRequests || []).filter(r => r.status !== 'Pending');
  const myExplanations = (data?.notifications.myExplanations || []).filter(r => r.status !== 'Pending');

  const myNotifications = useMemo(() => {
      const combined = [
          ...myRequests.map(r => ({ ...r, category: 'leave' })),
          ...myExplanations.map(e => ({ ...e, category: 'explanation' }))
      ];
      const sorted = combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Group by date
      const groups: Record<string, any[]> = {};
      sorted.forEach(item => {
          const dateStr = item.created_at.split('T')[0];
          if (!groups[dateStr]) groups[dateStr] = [];
          groups[dateStr].push(item);
      });
      
      return Object.entries(groups).map(([date, items]) => ({
          date,
          items
      }));
  }, [myRequests, myExplanations]);

  const renderDateRange = (from: string, to?: string) => {
      if (!to) return formatDateString(from.split('T')[0]);
      const f = formatDateString(from.split('T')[0]);
      const t = formatDateString(to.split('T')[0]);
      if (from.split('T')[0] === to.split('T')[0]) return f;
      return `${f} - ${t}`;
  };

  return (
    <PullToRefresh onRefresh={onRefresh} className="bg-slate-50 dark:bg-dark-bg font-sans">
        <div className="pt-28 pb-32 px-4 animate-fade-in">
            
            {pendingCount > 0 && (
                <div 
                    onClick={() => { onSwitchTab('manager'); }}
                    className="bg-neutral-white dark:bg-dark-surface rounded-xl p-5 mb-8 border border-primary/20 dark:border-primary/30 relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer animate-slide-up shadow-sm"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10 opacity-60"></div>
                    
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                             <div className="flex items-center gap-2 mb-2">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-red/50 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary-red"></span>
                                </span>
                                <span className="text-xxs font-extrabold uppercase tracking-wider text-primary dark:text-primary bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-md border border-primary/20 dark:border-primary/30">Cần duyệt ngay</span>
                            </div>
                            
                            <div className="flex items-baseline gap-1.5">
                                <h3 className="text-4xl font-black text-slate-800 dark:text-dark-text-primary tracking-tight leading-none tabular-nums">{pendingCount}</h3>
                                <span className="text-sm font-bold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wide">Yêu cầu</span>
                            </div>
                            <p className="text-slate-500 dark:text-dark-text-secondary text-xs font-medium mt-1 group-hover:text-primary dark:group-hover:text-primary transition-colors">
                                Đang chờ bạn xử lý
                            </p>
                        </div>

                        <div className="w-14 h-14 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary rounded-xl flex items-center justify-center text-xl border border-primary/20 dark:border-primary/30 group-hover:bg-primary dark:group-hover:bg-primary group-hover:text-neutral-white transition-all duration-300">
                            <i className="fa-solid fa-arrow-right-long group-hover:translate-x-1 transition-transform"></i>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {myNotifications.length === 0 && pendingCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-dark-text-secondary/60 opacity-60 animate-fade-in">
                        <div className="w-24 h-24 bg-slate-100 dark:bg-dark-surface rounded-full flex items-center justify-center mb-4 border border-slate-200 dark:border-dark-border">
                            <i className="fa-regular fa-bell-slash text-3xl text-slate-300 dark:text-dark-text-secondary"></i>
                        </div>
                        <p className="text-sm font-bold text-slate-500 dark:text-dark-text-secondary uppercase tracking-wide">Không có thông báo mới</p>
                    </div>
                ) : (
                    <>
                        {myNotifications.length > 0 && (
                            <div className="flex items-center justify-between px-2 mb-2">
                                <h4 className="text-xs font-black text-primary dark:text-primary uppercase tracking-widest animate-slide-up">Các đơn đã duyệt</h4>
                                <span className="text-xxs font-bold text-slate-400 dark:text-dark-text-secondary bg-slate-100 dark:bg-dark-border/50 px-2 py-0.5 rounded-full">
                                    {myNotifications.reduce((acc, g) => acc + g.items.length, 0)} thông báo
                                </span>
                            </div>
                        )}
                        
                        {myNotifications.map((group: any) => (
                            <div key={group.date} className="space-y-3">
                                <div className="flex items-center gap-3 px-2">
                                    <span className="text-xxs font-black text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest">{formatDateString(group.date)}</span>
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-dark-border/30"></div>
                                </div>

                                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-dark-border">
                                    {group.items.map((item: any) => {
                                        const isApproved = item.status === 'Approved';
                                        const isRequest = item.category === 'leave';
                                        const statusColor = isApproved 
                                            ? 'text-primary dark:text-primary' 
                                            : 'text-secondary-red dark:text-secondary-red';
                                        const statusIcon = isApproved ? 'fa-circle-check' : 'fa-circle-xmark';
                                        
                                        let leftIconConfig = { bg: 'bg-slate-50 dark:bg-dark-bg', text: 'text-slate-500 dark:text-dark-text-secondary', border: 'border-slate-100 dark:border-dark-border/50' };
                                        if (isRequest) {
                                            if (item.type.includes('Nghỉ phép')) leftIconConfig = { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-primary', border: 'border-primary/20 dark:border-primary/30' };
                                            else if (item.type.includes('Nghỉ ốm')) leftIconConfig = { bg: 'bg-secondary-red/10 dark:bg-secondary-red/20', text: 'text-secondary-red dark:text-secondary-red', border: 'border-secondary-red/20 dark:border-secondary-red/30' };
                                            else if (item.type.includes('Công tác')) leftIconConfig = { bg: 'bg-purple-50 dark:bg-secondary-purple/20', text: 'text-purple-500 dark:text-secondary-purple', border: 'border-purple-100 dark:border-secondary-purple/30' };
                                            else leftIconConfig = { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-primary', border: 'border-primary/20 dark:border-primary/30' };
                                        } else {
                                            leftIconConfig = { bg: 'bg-secondary-yellow/10 dark:bg-secondary-yellow/20', text: 'text-secondary-yellow dark:text-secondary-yellow', border: 'border-secondary-yellow/20 dark:border-secondary-yellow/30' };
                                        }

                                        return (
                                            <div key={item.id} className="p-5 active:bg-slate-50 dark:active:bg-dark-border/50 transition-colors">
                                                <div className="flex gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl border ${leftIconConfig.bg} ${leftIconConfig.text} ${leftIconConfig.border}`}>
                                                        <i className={`fa-solid ${isRequest ? (item.type.includes('Nghỉ phép') ? 'fa-umbrella-beach' : item.type.includes('Công tác') ? 'fa-plane-departure' : item.type.includes('Nghỉ ốm') ? 'fa-user-nurse' : 'fa-file-lines') : 'fa-file-signature'}`}></i>
                                                    </div>

                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <div className="flex justify-between items-start gap-2 mb-1">
                                                            <h4 className="font-black text-slate-800 dark:text-dark-text-primary text-sm leading-tight">
                                                                {isRequest ? item.type : 'Giải trình công'}
                                                            </h4>
                                                            <div className={`text-xxs font-extrabold uppercase tracking-widest flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap ${statusColor}`}>
                                                                 <i className={`fa-solid ${statusIcon}`}></i>
                                                                 {isApproved ? 'ĐÃ DUYỆT' : 'TỪ CHỐI'}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-dark-text-secondary font-mono">
                                                            <i className="fa-regular fa-calendar-days"></i>
                                                            {renderDateRange(isRequest ? item.from_date : item.date, item.to_date)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {item.manager_note && (
                                                    <div className={`mt-3 px-4 py-3 rounded-xl border text-xxs font-medium flex items-start gap-2 ${isApproved ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/80 dark:text-primary/80' : 'bg-secondary-red/5 dark:bg-secondary-red/10 border-secondary-red/10 dark:border-secondary-red/20 text-secondary-red/80 dark:text-secondary-red/80'}`}>
                                                        <i className="fa-solid fa-comment-dots mt-0.5"></i>
                                                        <div>
                                                            <span className="font-black opacity-60 uppercase block mb-0.5 text-xxs tracking-wider">Phản hồi quản lý:</span>
                                                            {item.manager_note}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    </PullToRefresh>
  );
};

export default NotificationsModal;
