import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, Employee } from '@/shared/types';
import { formatDateString, triggerHaptic, toISODateString } from '@/core/utils/helpers';
import PullToRefresh from '@/shared/components/layout/PullToRefresh';
import { motion, AnimatePresence } from 'framer-motion';
import ModalOffList from '@/modules/tms/components/ModalOffList';

interface Props {
  data: DashboardData | null;
  user: Employee;
  onRefresh: () => Promise<void>;
  currentDate: Date;
}

const CalendarPage: React.FC<Props> = ({ data, user, onRefresh, currentDate }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedLeaveGroup, setExpandedLeaveGroup] = useState<string | null>(null);

  const teamLeaves = data?.teamLeaves || [];
  const contacts = data?.contacts || [];

  const locationsMap = useMemo(() => {
    const map: Record<string, string> = {};
    data?.locations.forEach(l => map[l.center_id] = l.location_name);
    return map;
  }, [data?.locations]);

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    
    return days;
  };

  const getLeavesForDate = (date: Date) => {
    const dateStr = toISODateString(date);
    return teamLeaves.filter(l => l.from_date <= dateStr && l.to_date >= dateStr);
  };

  const selectedDateLeaves = useMemo(() => {
    const dateStr = toISODateString(selectedDate);
    const onLeaveOnDate = teamLeaves.filter(l => l.from_date <= dateStr && l.to_date >= dateStr);
    
    const userManagedLocations = new Set<string>(user.managed_locations || []);
    if (user.center_id) userManagedLocations.add(user.center_id);

    const filtered = onLeaveOnDate.filter(l => {
        const emp = contacts.find(c => c.employee_id === l.employee_id);
        if (!emp || !emp.center_id) return false;

        const isDirectReport = String(emp.direct_manager_id) === String(user.employee_id);
        const isInManagedLocation = userManagedLocations.has(emp.center_id);
        
        if (user.role === 'Admin' || user.role === 'HR') {
          return true;
        }

        return isDirectReport || isInManagedLocation;
    });

    const groups: Record<string, any[]> = {};
    filtered.forEach(l => {
        const emp = contacts.find(c => c.employee_id === l.employee_id);
        const centerId = emp?.center_id || 'Unknown Center';
        const centerName = locationsMap[centerId] || centerId;
        if (!groups[centerName]) groups[centerName] = [];
        groups[centerName].push({ ...l, emp });
    });

    return groups;
}, [teamLeaves, contacts, user, locationsMap, selectedDate]);

  const leaveGroups = useMemo(() => {
    return Object.keys(selectedDateLeaves).map(centerName => ({
        id: centerName,
        title: centerName,
        items: selectedDateLeaves[centerName]
    }));
  }, [selectedDateLeaves]);

  useEffect(() => {
    if (leaveGroups.length > 0) {
        setExpandedLeaveGroup(prev => {
            if (prev && leaveGroups.some(g => g.id === prev)) return prev;
            return leaveGroups[0].id;
        });
    } else {
        setExpandedLeaveGroup(null);
    }
  }, [leaveGroups]);

  const getTypeConfig = (type: string, isLeave: boolean) => {
    if (!isLeave) return { label: 'Giải trình công', icon: 'fa-file-signature', bg: 'bg-secondary-orange/10 dark:bg-secondary-orange/20', text: 'text-secondary-orange dark:text-secondary-orange', border: 'border-secondary-orange/20 dark:border-secondary-orange/30', solidBg: 'bg-secondary-orange' };
    if (type.includes('Nghỉ phép')) return { label: type, icon: 'fa-umbrella-beach', bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-primary', border: 'border-primary/20 dark:border-primary/30', solidBg: 'bg-primary' };
    if (type.includes('Nghỉ ốm')) return { label: type, icon: 'fa-user-nurse', bg: 'bg-secondary-red/10 dark:bg-secondary-red/20', text: 'text-secondary-red dark:text-secondary-red', border: 'border-secondary-red/20 dark:border-secondary-red/30', solidBg: 'bg-secondary-red' };
    if (type.includes('Nghỉ không lương')) return { label: type, icon: 'fa-calendar-minus', bg: 'bg-secondary-yellow/10 dark:bg-secondary-yellow/20', text: 'text-secondary-yellow dark:text-secondary-yellow', border: 'border-secondary-yellow/20 dark:border-secondary-yellow/30', solidBg: 'bg-secondary-yellow' };
    if (type.includes('Làm việc tại nhà')) return { label: type, icon: 'fa-house-laptop', bg: 'bg-secondary-green/10 dark:bg-secondary-green/20', text: 'text-secondary-green dark:text-secondary-green', border: 'border-secondary-green/20 dark:border-secondary-green/30', solidBg: 'bg-secondary-green' };
    if (type.includes('Công tác')) return { label: type, icon: 'fa-plane-departure', bg: 'bg-secondary-purple/10 dark:bg-secondary-purple/20', text: 'text-secondary-purple dark:text-secondary-purple', border: 'border-secondary-purple/20 dark:border-secondary-purple/30', solidBg: 'bg-secondary-purple' };
    return { label: type, icon: 'fa-file-lines', bg: 'bg-slate-100 dark:bg-dark-border/50', text: 'text-slate-500 dark:text-dark-text-secondary', border: 'border-slate-200 dark:border-dark-border', solidBg: 'bg-slate-500' };
  };

  return (
    <PullToRefresh onRefresh={onRefresh} className="bg-slate-50 dark:bg-dark-bg font-sans">
      <div className="pt-20 pb-32 px-4 animate-fade-in space-y-8">
        <ModalOffList
          leaveGroups={leaveGroups}
          expandedLeaveGroup={expandedLeaveGroup}
          setExpandedLeaveGroup={setExpandedLeaveGroup}
          generateCalendar={generateCalendar}
          getLeavesForDate={getLeavesForDate}
          getTypeConfig={getTypeConfig}
          currentDate={currentDate}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
      </div>
    </PullToRefresh>
  );
};

export default CalendarPage;
