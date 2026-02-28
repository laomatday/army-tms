import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, Employee } from '@/shared/types';
import { processRequest, processExplanation } from '@/modules/tms/services';
import { formatDateString, triggerHaptic } from '@/core/utils/helpers';
import PullToRefresh from '@/shared/components/layout/PullToRefresh';
import { MANAGEMENT_ROLES } from '@/shared/constants';
import ModalListRequest from '@/modules/tms/components/ModalListRequest';

interface Props {
  data: DashboardData | null;
  user: Employee;
  onRefresh: () => Promise<void>;
  onAlert: (title: string, msg: string, type: 'success' | 'error') => void;
  registerSwipeHandler?: (handler: ((direction: 'left' | 'right') => boolean) | null) => void;
  onClose?: () => void;
}

const TabManager: React.FC<Props> = ({ data, user, onRefresh, onAlert, registerSwipeHandler, onClose }) => {
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedApprovalGroup, setExpandedApprovalGroup] = useState<string | null>(null);
  
  const [rejectModal, setRejectModal] = useState<{
      isOpen: boolean;
      docId: string;
      type: 'leave' | 'explanation';
      reason: string;
  }>({ isOpen: false, docId: '', type: 'leave', reason: '' });

  const contacts = data?.contacts || [];
  const approvals = data?.notifications.approvals || [];
  const explanationApprovals = data?.notifications.explanationApprovals || [];

  const locationsMap = useMemo(() => {
      const map: Record<string, string> = {};
      data?.locations.forEach(l => map[l.center_id] = l.location_name);
      return map;
  }, [data?.locations]);

  const managedLocationsSet = useMemo(() => {
    return new Set(user.managed_locations || []);
  }, [user.managed_locations]);

  const groupedApprovals = useMemo(() => {
    const allItems = [
        ...approvals.map(a => ({ ...a, itemType: 'leave' as const })),
        ...explanationApprovals.map(e => ({ ...e, itemType: 'explanation' as const }))
    ];

    const filteredItems = allItems.filter(item => {
        const emp = contacts.find(c => c.employee_id === item.employee_id);
        if (!emp) return false;

        if (user.role === 'Admin' || user.role === 'HR') {
            return true;
        }

        if (MANAGEMENT_ROLES.includes(user.role)) {
            const isDirectReport = String(emp.direct_manager_id) === String(user.employee_id);
            const isInManagedLocation = emp.center_id ? managedLocationsSet.has(emp.center_id) : false;
            return isDirectReport || isInManagedLocation;
        }

        return false;
    });

    const groups: Record<string, any[]> = {};
    const directReports: any[] = [];

    filteredItems.forEach(item => {
        const emp = contacts.find(c => c.employee_id === item.employee_id);
        
        if (emp && String(emp.direct_manager_id) === String(user.employee_id)) {
            directReports.push({ ...item, emp });
            return;
        }

        const centerId = emp?.center_id || 'Unknown Center';
        const centerName = locationsMap[centerId] || centerId;

        if (!groups[centerName]) {
            groups[centerName] = [];
        }
        groups[centerName].push({ ...item, emp });
    });

    return { directReports, groups };
}, [approvals, explanationApprovals, contacts, locationsMap, user]);

  const approvalGroups = useMemo(() => {
      const groups = [];
      if (groupedApprovals.directReports.length > 0) {
          groups.push({ id: 'direct', title: 'Quản lý trực tiếp', items: groupedApprovals.directReports });
      }
      Object.keys(groupedApprovals.groups).forEach(centerName => {
          groups.push({ id: centerName, title: centerName, items: groupedApprovals.groups[centerName] });
      });
      return groups;
  }, [groupedApprovals]);

  useEffect(() => {
      if (approvalGroups.length > 0) {
          setExpandedApprovalGroup(prev => {
              if (prev && approvalGroups.some(g => g.id === prev)) return prev;
              return approvalGroups[0].id;
          });
      } else {
          setExpandedApprovalGroup(null);
      }
  }, [approvalGroups]);

  const handleAction = async (docId: string, status: 'Approved' | 'Rejected', type: 'leave' | 'explanation') => {
      triggerHaptic('medium');
      if (status === 'Rejected') {
          setRejectModal({ isOpen: true, docId, type, reason: '' });
          return;
      }

      setProcessing(docId);
      
      const item = [...approvals, ...explanationApprovals].find(a => a.id === docId);
      const requester = contacts.find(c => c.employee_id === item?.employee_id);
      const isDirect = String(requester?.direct_manager_id) === String(user.employee_id);
      
      let prefix = "";
      if (!isDirect) {
          if (user.role === 'Director') prefix = `[Duyệt thay bởi Director: ${user.name}] `;
          else if (user.role === 'HR') prefix = `[Xử lý ngoại lệ bởi HR] `;
          else if (user.role === 'Admin') prefix = `[Xử lý bởi Admin] `;
          else if (user.role === 'Manager') prefix = `[Duyệt thay bởi Manager: ${user.name}] `;
      }

      const managerNote = `${prefix}Duyệt bởi ${user.name}`;
      
      let res;
      if (type === 'leave') {
          res = await processRequest(docId, status, managerNote);
      } else {
          res = await processExplanation(docId, status, managerNote);
      }
      
      setProcessing(null);
      
      if(res.success) {
          onAlert("Thành công", "Đã duyệt yêu cầu.", "success");
          onRefresh();
      } else {
          onAlert("Lỗi", res.message || "Có lỗi xảy ra", "error");
      }
  };

  const submitRejection = async () => {
      if (!rejectModal.docId) return;
      const { docId, type, reason } = rejectModal;
      
      setProcessing(docId);

      const item = [...approvals, ...explanationApprovals].find(a => a.id === docId);
      const requester = contacts.find(c => c.employee_id === item?.employee_id);
      const isDirect = String(requester?.direct_manager_id) === String(user.employee_id);

      let prefix = "";
      if (!isDirect) {
          if (user.role === 'Director') prefix = `[Từ chối thay bởi Director: ${user.name}] `;
          else if (user.role === 'HR') prefix = `[Xử lý ngoại lệ bởi HR] `;
          else if (user.role === 'Admin') prefix = `[Xử lý bởi Admin] `;
          else if (user.role === 'Manager') prefix = `[Từ chối thay bởi Manager: ${user.name}] `;
      }
      
      const managerNote = reason ? `${prefix}${reason} (Từ chối bởi ${user.name})` : `${prefix}Từ chối bởi ${user.name}`;

      let res;
      if (type === 'leave') {
          res = await processRequest(docId, 'Rejected', managerNote);
      } else {
          res = await processExplanation(docId, 'Rejected', managerNote);
      }

      setProcessing(null);
      setRejectModal({ ...rejectModal, isOpen: false });

      if (res.success) {
          onAlert("Thành công", "Đã từ chối yêu cầu.", "success");
          onRefresh();
      } else {
           onAlert("Lỗi", res.message || "Có lỗi xảy ra", "error");
      }
  };

  const renderDateRange = (from: string, to: string) => {
      if (!from || !to) return "N/A";
      const dateFromStr = formatDateString(from.split('T')[0]);
      const dateToStr = formatDateString(to.split('T')[0]);
      if (from.split('T')[0] === to.split('T')[0]) return dateFromStr;
      return `${dateFromStr} - ${dateToStr}`;
  };

  const getTypeConfig = (type: string, isLeave: boolean) => {
      if (!isLeave) return { label: 'Giải trình công', icon: 'fa-file-signature', bg: 'bg-secondary-orange/10 dark:bg-secondary-orange/20', text: 'text-secondary-orange dark:text-secondary-orange', border: 'border-secondary-orange/20 dark:border-secondary-orange/30', solidBg: 'bg-secondary-orange' };
      if (type.includes('Nghỉ phép')) return { label: type, icon: 'fa-umbrella-beach', bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-primary', border: 'border-primary/20 dark:border-primary/30', solidBg: 'bg-primary' };
      if (type.includes('Nghỉ ốm')) return { label: type, icon: 'fa-user-nurse', bg: 'bg-secondary-red/10 dark:bg-secondary-red/20', text: 'text-secondary-red dark:text-secondary-red', border: 'border-secondary-red/20 dark:border-secondary-red/30', solidBg: 'bg-secondary-red' };
      if (type.includes('Nghỉ không lương')) return { label: type, icon: 'fa-calendar-minus', bg: 'bg-secondary-yellow/10 dark:bg-secondary-yellow/20', text: 'text-secondary-yellow dark:text-secondary-yellow', border: 'border-secondary-yellow/20 dark:border-secondary-yellow/30', solidBg: 'bg-secondary-yellow' };
      if (type.includes('Làm việc tại nhà')) return { label: type, icon: 'fa-house-laptop', bg: 'bg-secondary-green/10 dark:bg-secondary-green/20', text: 'text-secondary-green dark:text-secondary-green', border: 'border-secondary-green/20 dark:border-secondary-green/30', solidBg: 'bg-secondary-green' };
      if (type.includes('Công tác')) return { label: type, icon: 'fa-plane-departure', bg: 'bg-secondary-purple/10 dark:bg-secondary-purple/20', text: 'text-secondary-purple dark:text-secondary-purple', border: 'border-secondary-purple/20 dark:border-secondary-purple/30', solidBg: 'bg-secondary-purple' };
      return { label: type, icon: 'fa-file-lines', bg: 'bg-slate-100 dark:bg-dark-border/50', text: 'text-slate-500 dark:text-dark-text-secondary', border: 'border-slate-200 dark:border-dark-border', solidBg: 'bg-slate-500' };
  };

  const totalPending = (groupedApprovals.directReports.length + Object.values(groupedApprovals.groups).flat().length);

  return (
    <PullToRefresh onRefresh={onRefresh} className="bg-slate-50 dark:bg-dark-bg font-sans">
      <div className="pt-20 pb-32 px-4 animate-fade-in space-y-8">
        <ModalListRequest
          groupedApprovals={groupedApprovals}
          processing={processing}
          handleAction={handleAction}
          expandedApprovalGroup={expandedApprovalGroup}
          setExpandedApprovalGroup={setExpandedApprovalGroup}
          totalPending={totalPending}
          approvalGroups={approvalGroups}
          renderDateRange={renderDateRange}
          getTypeConfig={getTypeConfig}
          user={user}
          contacts={contacts}
        />
      </div>

      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[2100] bg-slate-900/40 dark:bg-dark-bg/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-neutral-white dark:bg-dark-surface rounded-xl w-full max-w-sm p-6 animate-scale-in shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-secondary-red/10 dark:bg-secondary-red/20 text-secondary-red dark:text-secondary-red rounded-full flex items-center justify-center mx-auto mb-4 border border-secondary-red/20 dark:border-secondary-red/30">
                <i className="fa-solid fa-triangle-exclamation text-xl"></i>
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-dark-text-primary tracking-tight">Từ chối yêu cầu?</h3>
              <p className="text-sm text-slate-500 dark:text-dark-text-secondary mt-1">Nhập lý do để nhân viên biết nguyên nhân.</p>
            </div>

            <textarea
              className="w-full h-24 p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-secondary-red/20 focus:border-secondary-red outline-none resize-none mb-4 placeholder:text-slate-400 dark:placeholder:text-dark-text-secondary/50 text-slate-800 dark:text-dark-text-primary"
              placeholder="Lý do từ chối..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
            ></textarea>

            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
                className="flex-1 py-4 rounded-xl bg-slate-100 dark:bg-dark-border/50 text-slate-600 dark:text-dark-text-primary text-base font-extrabold hover:bg-slate-200 dark:hover:bg-dark-border transition-colors uppercase tracking-widest"
              >
                Hủy
              </button>
              <button
                onClick={submitRejection}
                disabled={!rejectModal.reason.trim() || !!processing}
                className="flex-1 py-4 rounded-xl bg-secondary-red text-neutral-white text-base font-extrabold hover:bg-secondary-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-md shadow-secondary-red/20 flex items-center justify-center gap-2"
              >
                {processing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PullToRefresh>
  );
};

export default TabManager;
