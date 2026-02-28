import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardData, Employee } from '@/shared/types';
import { formatDateString, triggerHaptic } from '@/core/utils/helpers';
import PullToRefresh from '@/shared/components/layout/PullToRefresh';

interface Props {
  data: DashboardData | null;
  user: Employee;
  onRefresh: () => Promise<void>;
  onAlert: (title: string, msg: string, type: 'success' | 'error' | 'warning') => void;
  onExplain: (date: string, reason: string) => void;
  registerSwipeHandler?: (handler: ((direction: 'left' | 'right') => boolean) | null) => void;
}

const TabHistory: React.FC<Props> = ({ data, user, onRefresh, onAlert, onExplain, registerSwipeHandler }) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>(() => 
      (localStorage.getItem('army_history_view_mode') as 'week'|'month') || 'week'
  );

  useEffect(() => {
    if (registerSwipeHandler) {
        registerSwipeHandler((direction) => {
            if (direction === 'left' && viewMode === 'week') {
                triggerHaptic('light');
                setViewMode('month');
                return true;
            }
            if (direction === 'right' && viewMode === 'month') {
                triggerHaptic('light');
                setViewMode('week');
                return true;
            }
            return false;
        });
    }
    return () => {
        if (registerSwipeHandler) registerSwipeHandler(null);
    };
  }, [registerSwipeHandler, viewMode]);

  useEffect(() => {
    localStorage.setItem('army_history_view_mode', viewMode);
  }, [viewMode]);

  const [viewDate, setViewDate] = useState<Date>(new Date()); 
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const formatDateISO = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const handleExplainClick = (e: React.MouseEvent, dateStr: string, defaultReason: string) => {
      e.stopPropagation();
      triggerHaptic('light');
      if (!data) return;

      const attDate = new Date(dateStr);
      const now = new Date();
      
      const nextMonth = new Date(attDate.getFullYear(), attDate.getMonth() + 1, 1);
      const deadline = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 5);
      deadline.setHours(23, 59, 59);

      if (now > deadline) {
          onAlert("Quá hạn giải trình", "Chỉ được giải trình trước ngày 5 của tháng kế tiếp.", "error");
          return;
      }

      const targetMonth = attDate.getMonth();
      const targetYear = attDate.getFullYear();
      
      const count = data.myExplanations.filter(r => {
          const rDate = new Date(r.date);
          return r.status !== 'Rejected' && 
                 rDate.getMonth() === targetMonth && 
                 rDate.getFullYear() === targetYear;
      }).length;

      if (count >= 5) {
          onAlert("Đạt giới hạn", "Bạn chỉ được gửi tối đa 5 giải trình mỗi tháng.", "error");
          return;
      }

      onExplain(dateStr, defaultReason);
  };

  const locationsMap = useMemo(() => {
      const map: Record<string, string> = {};
      data?.locations.forEach(loc => {
          map[loc.center_id] = loc.location_name || loc.name || loc.center_id;
      });
      return map;
  }, [data?.locations]);

  const processedData = useMemo(() => {
      if (!data) return { stats: { workDays: 0, lateMins: 0, errors: 0 }, list: [], title: '', calendarGrid: [] };

      const stats = { workDays: 0, lateMins: 0, errors: 0 };
      const list: any[] = [];
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const { systemConfig } = data;
      const minFull = systemConfig?.MIN_HOURS_FULL || 7;
      const minHalf = systemConfig?.MIN_HOURS_HALF || 3.5;
      const offDays = Array.isArray(systemConfig?.OFF_DAYS) ? systemConfig.OFF_DAYS : [0];

      let startDate: Date, endDate: Date, title: string;

      if (viewMode === 'month') {
          const year = viewDate.getFullYear();
          const month = viewDate.getMonth();
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month + 1, 0); 
          title = `THÁNG ${month + 1}/${year}`;
      } else {
          endDate = new Date(viewDate);
          endDate.setHours(23, 59, 59);

          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);

          const sD = startDate.getDate();
          const eD = endDate.getDate();
          const sM = startDate.getMonth() + 1;
          const eM = endDate.getMonth() + 1;
          
          title = (sM === eM) 
            ? `${sD} - ${eD} THG ${sM}` 
            : `${sD}/${sM} - ${eD}/${eM}`;
      }

      let ptr = new Date(startDate);
      const dateInfoMap: Record<string, any> = {};

      const loopEnd = new Date(endDate);
      const loopPtr = new Date(startDate);

      while(loopPtr <= loopEnd) {
          const dateStr = formatDateISO(loopPtr);
          const dayOfWeek = loopPtr.getDay(); 
          
          let dayItem: any = {
              date: dateStr,
              dayOfWeek: dayOfWeek,
              dayNum: loopPtr.getDate(),
              status: 'Absent',
              workHours: 0,
              lateMins: 0,
              earlyMins: 0,
              shiftInfo: "Không chấm công", 
              icon: 'fa-xmark',
              iconClass: 'bg-secondary-red/10 dark:bg-secondary-red/20 text-secondary-red dark:text-secondary-red', 
              dotClass: 'bg-secondary-red',
              showExplain: false,
              isExplained: false,
              explainReason: '',
              isMissingCheckout: false,
              isLate: false,
              isEarly: false,
              leaveType: '',
              isHoliday: false,
              raw: null
          };

          const existingExplain = data.myExplanations.find(r => 
              r.date === dateStr && 
              r.status !== 'Rejected'
          );

          if (existingExplain) {
              dayItem.isExplained = true;
          }

          const leave = data.myRequests.find(r => 
              r.status === 'Approved' && 
              r.from_date <= dateStr && r.to_date >= dateStr
          );

          if (leave) {
              dayItem.status = 'Leave';
              dayItem.shiftInfo = "Nghỉ phép";
              dayItem.leaveType = leave.type;
              dayItem.icon = 'fa-gift';
              dayItem.iconClass = 'bg-secondary-purple/10 dark:bg-secondary-purple/20 text-secondary-purple dark:text-secondary-purple';
              dayItem.dotClass = 'bg-secondary-purple';
              dayItem.workHours = 8;
              stats.workDays += 1;
          } else {
              const holiday = data.holidays?.find(h => h.from_date <= dateStr && h.to_date >= dateStr);
              if (holiday) {
                  dayItem.status = 'Holiday';
                  dayItem.shiftInfo = holiday.name || "Ngày Lễ";
                  dayItem.isHoliday = true;
                  dayItem.icon = 'fa-champagne-glasses';
                  dayItem.iconClass = 'bg-secondary-red/10 dark:bg-secondary-red/20 text-secondary-red dark:text-secondary-red ring-1 ring-secondary-red/20 dark:ring-secondary-red/30';
                  dayItem.dotClass = 'bg-secondary-red';
                  dayItem.workHours = 8;
                  stats.workDays += 1;
              } else {
                  const dailyRecords = data.history.history.filter(h => h.date === dateStr);
                  
                  if (dailyRecords.length > 0) {
                      dayItem.records = dailyRecords;
                      dayItem.raw = dailyRecords[0]; 
                      let totalHours = 0;
                      let totalLate = 0;
                      let totalEarly = 0;
                      
                      dailyRecords.forEach(att => {
                          totalHours += Number(att.work_hours || 0);
                          totalLate += Number(att.late_minutes || 0);
                          totalEarly += Number(att.early_minutes || 0);
                      });

                      dayItem.workHours = totalHours;
                      dayItem.lateMins = totalLate;
                      dayItem.earlyMins = totalEarly;
                      stats.lateMins += totalLate;
                      
                      const shiftNames = Array.from(new Set(dailyRecords.map((r: any) => r.shift_name).filter(Boolean)));
                      if (shiftNames.length > 0) {
                          dayItem.shiftInfo = shiftNames.join(', ');
                      } else {
                          dayItem.shiftInfo = `Đã chấm công`;
                      }

                      if (totalHours >= minFull) {
                          stats.workDays += 1;
                          dayItem.status = 'Full';
                          dayItem.icon = 'fa-check';
                          dayItem.iconClass = 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary';
                          dayItem.dotClass = 'bg-primary';
                      } else if (totalHours >= minHalf) {
                          stats.workDays += 0.5;
                          dayItem.status = 'Half';
                          dayItem.icon = 'fa-star-half-stroke';
                          dayItem.iconClass = 'bg-secondary-green/10 dark:bg-secondary-green/20 text-secondary-green dark:text-secondary-green';
                          dayItem.dotClass = 'bg-secondary-green';
                      } else {
                           dayItem.status = 'Working';
                           dayItem.icon = 'fa-briefcase';
                           dayItem.iconClass = 'bg-secondary-yellow/10 dark:bg-secondary-yellow/20 text-secondary-yellow dark:text-secondary-yellow';
                           dayItem.dotClass = 'bg-secondary-yellow';
                      }

                      const hasMissingOut = dailyRecords.some(r => !r.time_out);
                      if (hasMissingOut && dateStr !== formatDateISO(today)) {
                          dayItem.isMissingCheckout = true;
                          stats.errors += 1;
                          dayItem.showExplain = true;
                          dayItem.explainReason = "[Lỗi] ";
                          dayItem.dotClass = 'bg-secondary-red';
                      }
                      
                      if (totalLate > 0 && dateStr !== formatDateISO(today)) {
                          dayItem.isLate = true;
                          dayItem.showExplain = true;
                          if (!dayItem.explainReason) dayItem.explainReason = "[Trễ] ";
                          if (!dayItem.isMissingCheckout) dayItem.dotClass = 'bg-secondary-yellow';
                      }

                      if (totalEarly > 0 && dateStr !== formatDateISO(today)) {
                          dayItem.isEarly = true;
                          dayItem.showExplain = true;
                          if (!dayItem.explainReason) dayItem.explainReason = "[Sớm] ";
                          if (!dayItem.isMissingCheckout && !dayItem.isLate) dayItem.dotClass = 'bg-secondary-yellow';
                      }
                  } else {
                       if (offDays.includes(dayOfWeek)) {
                          dayItem.status = 'Weekend';
                          dayItem.shiftInfo = "Nghỉ toàn hệ thống";
                          dayItem.icon = 'fa-mug-hot';
                          dayItem.iconClass = 'bg-slate-50 dark:bg-dark-surface/50 text-slate-400 dark:text-dark-text-secondary';
                          dayItem.dotClass = 'bg-slate-300 dark:bg-dark-border';
                       } else if (loopPtr < today) {
                          dayItem.status = 'Absent';
                          dayItem.shiftInfo = "Vắng mặt"; 
                          dayItem.showExplain = true;
                          dayItem.explainReason = "[Vắng] ";
                          dayItem.icon = 'fa-xmark';
                          dayItem.iconClass = 'bg-secondary-red/10 dark:bg-secondary-red/20 text-secondary-red dark:text-secondary-red';
                          dayItem.dotClass = 'bg-secondary-red';
                          
                          const todayStr = formatDateISO(today);
                          if (dateStr < todayStr) {
                              stats.errors += 1;
                          }
                       } else if (loopPtr.getTime() === today.getTime()) {
                           dayItem.status = 'Future';
                           dayItem.shiftInfo = "Chưa có dữ liệu";
                           dayItem.dotClass = 'bg-transparent';
                           dayItem.iconClass = 'bg-slate-50 dark:bg-dark-surface/50 text-slate-300 dark:text-dark-text-secondary/50';
                       } else {
                           dayItem.status = 'Future';
                           dayItem.shiftInfo = "-";
                           dayItem.dotClass = 'bg-transparent';
                           dayItem.iconClass = 'bg-slate-50 dark:bg-dark-surface/50 text-slate-300 dark:text-dark-text-secondary/50';
                       }
                  }
              }
          }
          
          dateInfoMap[dateStr] = dayItem;
          list.push(dayItem);
          
          loopPtr.setDate(loopPtr.getDate() + 1);
      }
      
      const filteredList = [...list];
      filteredList.reverse();

      let calendarGrid: any[] = [];
      if (viewMode === 'month') {
          const firstDay = startDate.getDay();
          for(let i=0; i<firstDay; i++) {
              calendarGrid.push(null);
          }
          const ptrMonth = new Date(startDate);
          while(ptrMonth <= endDate) {
              const dStr = formatDateISO(ptrMonth);
              calendarGrid.push(dateInfoMap[dStr]);
              ptrMonth.setDate(ptrMonth.getDate() + 1);
          }
      }
      
      return { stats, list: filteredList, title, calendarGrid };
  }, [data, viewDate, viewMode]);

  const changeDate = (delta: number) => {
      triggerHaptic('light');
      const newDate = new Date(viewDate);
      if (viewMode === 'month') {
          newDate.setMonth(newDate.getMonth() + delta);
      } else {
          newDate.setDate(newDate.getDate() + (delta * 7));
      }
      setViewDate(newDate);
  };
  
  const isCurrentView = useMemo(() => {
      const today = new Date();
      if (viewMode === 'week') {
          const d = new Date(viewDate);
          return d.setHours(0,0,0,0) >= today.setHours(0,0,0,0);
      } else {
          return viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();
      }
  }, [viewDate, viewMode]);

  const getDayName = (idx: number) => ["CN", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"][idx];

  const { stats, list, title, calendarGrid } = processedData;

  const displayList = (viewMode === 'week' 
        ? list 
        : (list.filter(item => item.date === selectedDate))
    ).filter(item => item.status !== 'Future');

  const switchViewMode = (mode: 'week' | 'month') => {
      triggerHaptic('light');
      setViewMode(mode);
  };

  return (
    <PullToRefresh onRefresh={onRefresh} className="bg-slate-50 dark:bg-dark-bg">
        <div className="pt-20 pb-32 px-4 animate-fade-in space-y-8">
            
            <div className="flex justify-center mb-8">
                 <div className="bg-slate-200/50 dark:bg-dark-surface p-1.5 rounded-xl flex relative w-full max-w-[280px] border border-transparent dark:border-dark-border">
                     <button 
                        onClick={() => switchViewMode('week')}
                        className={`flex-1 py-2.5 rounded-xl text-xxs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${viewMode === 'week' ? 'text-primary bg-neutral-white dark:bg-dark-border shadow-sm' : 'text-slate-500 dark:text-dark-text-secondary hover:text-slate-700 dark:hover:text-dark-text-primary'}`}
                     >
                         Tuần
                     </button>
                     <button 
                        onClick={() => switchViewMode('month')}
                        className={`flex-1 py-2.5 rounded-xl text-xxs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${viewMode === 'month' ? 'text-primary bg-neutral-white dark:bg-dark-border shadow-sm' : 'text-slate-500 dark:text-dark-text-secondary hover:text-slate-700 dark:hover:text-dark-text-primary'}`}
                     >
                         Tháng
                     </button>
                 </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border p-4 flex flex-col items-center justify-center h-28 shadow-sm">
                    <span className="text-3xl font-black text-primary dark:text-primary mb-1 tabular-nums tracking-tighter drop-shadow-sm">{stats.workDays}</span>
                    <span className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest text-center leading-tight mt-1">Ngày công</span>
                </div>
                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border p-4 flex flex-col items-center justify-center h-28 shadow-sm">
                    <span className="text-3xl font-black text-secondary-yellow dark:text-secondary-yellow mb-1 tabular-nums tracking-tighter drop-shadow-sm">{stats.lateMins}</span>
                    <span className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest text-center leading-tight mt-1">Phút trễ</span>
                </div>
                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border p-4 flex flex-col items-center justify-center h-28 shadow-sm">
                    <span className="text-3xl font-black text-secondary-red dark:text-secondary-red mb-1 tabular-nums tracking-tighter drop-shadow-sm">{stats.errors}</span>
                    <span className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest text-center leading-tight mt-1">Lỗi chấm</span>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-primary dark:text-primary uppercase ml-2 tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-clock-rotate-left text-xxs"></i>
                    {viewMode === 'month' ? 'Nhật ký tháng' : 'Nhật ký tuần'}
                </h3>
                
                <div className="flex items-center bg-neutral-white dark:bg-dark-surface rounded-full border border-slate-100 dark:border-dark-border pl-1 pr-1 py-1">
                    <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-border/50 active:bg-slate-100 dark:active:bg-dark-border transition-colors">
                        <i className="fa-solid fa-chevron-left text-xxs"></i>
                    </button>
                    <span className="text-xs font-black text-neutral-black dark:text-dark-text-primary uppercase px-3 min-w-[90px] text-center tabular-nums tracking-wide">
                        {title}
                    </span>
                    <button 
                        disabled={isCurrentView}
                        onClick={() => changeDate(1)} 
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isCurrentView ? 'text-slate-200 dark:text-dark-border cursor-not-allowed' : 'text-slate-400 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-border/50 active:bg-slate-100 dark:active:bg-dark-border'}`}
                    >
                        <i className="fa-solid fa-chevron-right text-xxs"></i>
                    </button>
                </div>
            </div>

            {viewMode === 'month' && (
                <div className="mb-8 bg-neutral-white dark:bg-dark-surface p-5 rounded-xl border border-slate-100 dark:border-dark-border animate-scale-in">
                    <div className="grid grid-cols-7 mb-4">
                        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d, i) => (
                            <div key={i} className="text-center text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-wider">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-3 gap-x-1">
                        {calendarGrid.map((day, idx) => {
                            if (!day) return <div key={idx} className="h-10"></div>; 
                            const isSelected = day.date === selectedDate;
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => { triggerHaptic('light'); setSelectedDate(day.date); }}
                                    className={`h-10 flex flex-col items-center justify-center relative cursor-pointer rounded-xl transition-all ${isSelected ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-primary/50 dark:ring-primary/40 text-primary dark:text-primary' : 'hover:bg-slate-50 dark:hover:bg-dark-border/50 text-slate-900 dark:text-dark-text-primary'}`}
                                >
                                    <span className={`text-base font-black tabular-nums tracking-tight ${day.dayOfWeek === 0 && !isSelected ? 'text-secondary-red dark:text-secondary-red' : ''}`}>{day.dayNum}</span>
                                    {day.status !== 'Future' && (
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${day.dotClass}`}></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* THẺ TIMELINE CHUẨN: LIỀN KHỐI (LIST VIEW), GỌN GÀNG MÀ VẪN SHOW TIMELINE */}
            {displayList.length === 0 ? (
                <div className="w-full text-center py-12 text-sm font-bold text-slate-400 dark:text-dark-text-secondary bg-neutral-white dark:bg-dark-surface rounded-xl border border-dashed border-slate-200 dark:border-dark-border mb-12">
                    {viewMode === 'month' ? 'Chọn ngày để xem chi tiết' : 'Không có dữ liệu'}
                </div>
            ) : (
                <div className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border overflow-hidden shadow-sm mb-12 animate-slide-up divide-y divide-slate-100 dark:divide-dark-border">
                    {displayList.map((item, idx) => {
                        const isExpanded = expandedDate === item.date;

                        return (
                        <div key={idx} 
                            className="w-full transition-colors hover:bg-slate-50/50 dark:hover:bg-dark-border/30 active:bg-slate-50 dark:active:bg-dark-border/50 relative"
                        >
                            {/* --- HEADER THẺ --- */}
                            <div 
                                onClick={() => { triggerHaptic('light'); setExpandedDate(isExpanded ? null : item.date); }}
                                className="p-4 sm:p-5 cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3.5">
                                        {/* Khối Ngày */}
                                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-dark-bg/50 border border-slate-100 dark:border-dark-border flex-shrink-0">
                                            <span className={`text-xxs font-extrabold uppercase leading-none tracking-wide mb-1 ${item.dayOfWeek === 0 ? 'text-secondary-red dark:text-secondary-red' : 'text-slate-400 dark:text-dark-text-secondary'}`}>{getDayName(item.dayOfWeek)}</span>
                                            <span className={`text-xl font-black leading-none tabular-nums tracking-tighter ${item.dayOfWeek === 0 ? 'text-secondary-red dark:text-secondary-red' : 'text-neutral-black dark:text-dark-text-primary'}`}>{item.dayNum}</span>
                                        </div>

                                        {/* Thông tin Ca */}
                                        <div>
                                            <h4 className="text-base font-black text-neutral-black dark:text-dark-text-primary leading-tight mb-1">{item.shiftInfo}</h4>
                                            <div className="flex items-center gap-2 text-xxs font-bold text-slate-500 dark:text-dark-text-secondary">
                                                {item.status !== 'Future' && item.status !== 'Absent' && item.status !== 'Weekend' ? (
                                                    <span className="flex items-center gap-1">
                                                        <i className="fa-solid fa-briefcase"></i> {item.workHours.toFixed(1)} giờ công
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 uppercase tracking-widest text-xxs">
                                                        {item.status === 'Absent' ? 'Không có dữ liệu' : (item.status === 'Weekend' ? 'Ngày nghỉ' : 'Chưa đến')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cụm Badges Góc Phải (Xếp chồng) */}
                                    <div className="flex flex-col items-end gap-1.5 pl-2 flex-shrink-0">
                                        {item.status === 'Leave' && (
                                            <span className="text-xxs font-extrabold px-2 py-0.5 rounded-md bg-secondary-purple/10 dark:bg-secondary-purple/20 text-secondary-purple dark:text-secondary-purple border border-secondary-purple/20 dark:border-secondary-purple/30 uppercase tracking-widest flex items-center gap-1">
                                                {item.leaveType}
                                            </span>
                                        )}
                                        {/* Đã chỉnh sửa badge Ngày Lễ ở đây */}
                                        {item.status === 'Holiday' && (
                                            <span className="text-xxs font-extrabold px-2 py-0.5 rounded-md bg-secondary-red/10 dark:bg-secondary-red/20 text-secondary-red dark:text-secondary-red border border-secondary-red/20 dark:border-secondary-red/30 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                                                Nghỉ Lễ
                                            </span>
                                        )}
                                        {item.status === 'Weekend' && (
                                            <span className="text-xxs font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-border/50 text-slate-500 dark:text-dark-text-secondary border border-slate-200 dark:border-dark-border uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                                                Nghỉ tuần
                                            </span>
                                        )}
                                        {item.status === 'Absent' && (
                                            <span className="text-xxs font-extrabold px-2 py-0.5 rounded-md bg-secondary-red/10 dark:bg-secondary-red/20 text-secondary-red dark:text-secondary-red border border-secondary-red/20 dark:border-secondary-red/30 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                                                Vắng mặt
                                            </span>
                                        )}
                                        {item.isMissingCheckout && (
                                            <span className="text-xxs font-extrabold px-2 py-0.5 rounded-md bg-secondary-red/10 dark:bg-secondary-red/20 text-secondary-red dark:text-secondary-red border border-secondary-red/20 dark:border-secondary-red/30 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                                                Lỗi Checkout
                                            </span>
                                        )}
                                        {item.isLate && (
                                            <span className="text-xxs font-extrabold px-2 py-0.5 rounded-md bg-secondary-yellow/10 dark:bg-secondary-yellow/20 text-secondary-yellow dark:text-secondary-yellow border border-secondary-yellow/20 dark:border-secondary-yellow/30 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                                                Trễ {item.lateMins}p
                                            </span>
                                        )}
                                        {item.isEarly && (
                                            <span className="text-xxs font-extrabold px-2 py-0.5 rounded-md bg-secondary-yellow/10 dark:bg-secondary-yellow/20 text-secondary-yellow dark:text-secondary-yellow border border-secondary-yellow/20 dark:border-secondary-yellow/30 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                                                Sớm {item.earlyMins}p
                                            </span>
                                        )}
                                        {/* Nhãn "Đúng giờ" / "Nửa ca" khi ngày công trọn vẹn, không dính lỗi */}
                                        {item.status === 'Full' && !item.isLate && !item.isEarly && !item.isMissingCheckout && (
                                            <span className="text-xxs font-extrabold px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border border-primary/20 dark:border-primary/30 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                                                Đúng giờ
                                            </span>
                                        )}
                                        {item.status === 'Half' && !item.isLate && !item.isEarly && !item.isMissingCheckout && (
                                            <span className="text-xxs font-extrabold px-2 py-0.5 rounded-md bg-secondary-green/10 dark:bg-secondary-green/20 text-secondary-green dark:text-secondary-green border border-secondary-green/20 dark:border-secondary-green/30 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                                                Nửa ca
                                            </span>
                                        )}

                                        {/* --- ACTION: GIẢI TRÌNH --- Đưa lên bên dưới các badge */}
                                        {item.showExplain && (
                                            <div className="mt-0.5">
                                                {item.isExplained ? (
                                                    <span className="flex-shrink-0 px-2 py-1 rounded-md bg-slate-100 dark:bg-dark-border/50 text-slate-500 dark:text-dark-text-secondary text-xxs font-extrabold uppercase tracking-widest flex items-center gap-1 border border-slate-200 dark:border-dark-border">
                                                        <i className="fa-solid fa-check"></i> Đã giải trình
                                                    </span>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => handleExplainClick(e, item.date, item.explainReason)}
                                                        className="flex-shrink-0 px-2 py-1 rounded-md bg-secondary-orange text-neutral-white font-extrabold active:scale-95 transition-all uppercase tracking-widest shadow-md shadow-secondary-orange/20 text-xxs"
                                                    >
                                                        Giải trình
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* --- DÒNG THỜI GIAN (IN/OUT) (MULTIPLE RECORDS SUPPORT) --- */}
                                {item.records && item.records.length > 0 && (
                                    <div className="space-y-2">
                                        {item.records.map((rec: any, rIdx: number) => (
                                            <div key={rIdx} className="flex items-center justify-between bg-slate-50 dark:bg-dark-bg/50 rounded-xl p-3 px-4 border border-slate-100 dark:border-dark-border relative overflow-hidden">
                                                <div className="flex flex-col z-10">
                                                    <span className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest mb-0.5">Vào {item.records.length > 1 ? rIdx + 1 : ''}</span>
                                                    <span className="text-base font-black text-neutral-black dark:text-dark-text-primary font-mono tracking-tight">{rec.time_in}</span>
                                                </div>
                                                
                                                <div className="flex-1 flex items-center justify-center px-4 relative z-10">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-dark-text-secondary/50"></div>
                                                    <div className={`flex-1 h-[2px] border-t-2 border-dashed mx-1 ${!rec.time_out ? 'border-secondary-red/30 dark:border-secondary-red/30' : 'border-slate-200 dark:border-dark-border'}`}></div>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${!rec.time_out ? 'bg-secondary-red dark:bg-secondary-red' : 'bg-slate-300 dark:bg-dark-text-secondary/50'}`}></div>
                                                </div>

                                                <div className="flex flex-col text-right z-10">
                                                    <span className="text-xxs font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest mb-0.5">Ra {item.records.length > 1 ? rIdx + 1 : ''}</span>
                                                    <span className={`text-base font-black font-mono tracking-tight ${!rec.time_out ? 'text-secondary-red dark:text-secondary-red' : 'text-neutral-black dark:text-dark-text-primary'}`}>
                                                        {rec.time_out || "--:--"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* --- KHU VỰC MỞ RỘNG (CHI TIẾT ẨN) MULTIPLE RECORDS --- */}
                            <AnimatePresence initial={false}>
                                {isExpanded && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-slate-50 dark:bg-dark-bg/30 border-t border-slate-100 dark:border-dark-border">
                                            {item.records && item.records.length > 0 && (
                                                <div className="p-4 space-y-4">
                                                    {item.records.map((rec: any, rIdx: number) => (
                                                        <div key={rIdx} className="space-y-3 pb-3 border-b border-slate-100 dark:border-dark-border last:border-0 last:pb-0">
                                                            <p className="text-xxs font-black text-primary uppercase tracking-widest">Lần chấm công {item.records.length > 1 ? rIdx + 1 : ''}</p>
                                                            
                                                            {(rec.center_id) && (
                                                                <div className="flex items-center gap-3 text-xs">
                                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-dark-border/50 flex items-center justify-center text-slate-500 dark:text-dark-text-secondary flex-shrink-0">
                                                                        <i className="fa-solid fa-location-dot"></i>
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-extrabold text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest text-xxs mb-0.5">Trung tâm</p>
                                                                        <p className="font-bold text-slate-700 dark:text-dark-text-primary truncate">{locationsMap[rec.center_id] || rec.center_id}</p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Selfie image link removed */}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )})}
                </div>
            )}
        </div>
    </PullToRefresh>
  );
};
export default TabHistory;
