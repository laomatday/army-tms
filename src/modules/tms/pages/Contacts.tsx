import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardData, Employee } from '@/shared/types';
import { getShortName, triggerHaptic } from '@/core/utils/helpers';
import Avatar from '@/shared/components/common/Avatar';
import ModalContactDetail from '@/modules/tms/components/ModalContactDetail';
import { TabType } from '@/modules/tms/components/BottomNav';

interface Props {
  data: DashboardData | null;
  user: Employee;
  resetTrigger?: number;
  searchTrigger?: number; // Header Search Trigger
  onClose: () => void;
  setIsHeaderVisible?: (visible: boolean) => void;
  registerSwipeHandler?: (handler: ((direction: 'left' | 'right') => boolean) | null) => void;
  onNavigate: (tab: TabType) => void;
  notiCount: number;
  onOpenNoti: () => void;
}

const TabContacts: React.FC<Props> = ({ data, user, resetTrigger = 0, searchTrigger = 0, onClose, setIsHeaderVisible, registerSwipeHandler, onNavigate, notiCount, onOpenNoti }) => {
  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Employee | null>(null);
  const [activeCenter, setActiveCenter] = useState<string>('Tất cả');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const toggleGroup = (groupId: string) => {
      triggerHaptic('light');
      setExpandedGroupId(prev => prev === groupId ? null : groupId);
  };

  const [cachedContacts, setCachedContacts] = useState<Employee[]>(() => {
      try {
          const cached = localStorage.getItem('army_contacts_cache');
          return cached ? JSON.parse(cached) : [];
      } catch (e) {
          console.error("Failed to load contacts cache", e);
          return [];
      }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const locationsMap = useMemo(() => {
      const map: Record<string, string> = {};
      if (data?.locations) {
          data.locations.forEach(l => map[l.center_id] = l.location_name);
      }
      return map;
  }, [data?.locations]);

  const contacts = useMemo(() => {
      const allContacts = ((data?.contacts && data.contacts.length > 0) ? data.contacts : cachedContacts).filter(c => c.role !== 'Kiosk');
      
      const userProfile = data?.userProfile;
      if (!userProfile) return allContacts;

      // 1. Collect all relevant location IDs for the user
      const userLocations = new Set<string>();
      if (userProfile.center_id) userLocations.add(userProfile.center_id);
      if (Array.isArray(userProfile.managed_locations)) {
          userProfile.managed_locations.forEach(loc => userLocations.add(loc));
      }

      // 2. Extract unique prefixes (e.g., "DN01" -> "DN")
      const allowedPrefixes = Array.from(userLocations).map(loc => loc.replace(/[0-9]/g, ''));
      const uniquePrefixes = Array.from(new Set(allowedPrefixes)).filter(Boolean);

      // 3. If no prefixes found (shouldn't happen), show all or none? Let's show all as fallback.
      if (uniquePrefixes.length === 0) return allContacts;

      // 4. Filter contacts: center_id prefix must match one of user's prefixes
      return allContacts.filter(c => {
          if (!c.center_id) return false;
          const contactPrefix = c.center_id.replace(/[0-9]/g, '');
          return uniquePrefixes.includes(contactPrefix);
      });
  }, [data?.contacts, cachedContacts, data?.userProfile]);

  const centers = useMemo(() => {
      const centerSet = new Set<string>();
      contacts.forEach(c => {
          const centerName = locationsMap[c.center_id] || c.center_id || 'Khác';
          centerSet.add(centerName);
      });
      
      // Sort centers: 'Tất cả' first, then follow managed_locations order if available, else alphabetical
      const sortedCenters = Array.from(centerSet).sort((a, b) => {
          const managed = data?.userProfile?.managed_locations || [];
          // Map location names back to IDs if possible, or just sort alphabetically
          // Since we only have names here, let's try to find the ID from locationsMap
          const idA = Object.keys(locationsMap).find(key => locationsMap[key] === a);
          const idB = Object.keys(locationsMap).find(key => locationsMap[key] === b);

          if (managed.length > 0 && idA && idB) {
              const idxA = managed.indexOf(idA);
              const idxB = managed.indexOf(idB);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
          }
          return a.localeCompare(b);
      });

      return ['Tất cả', ...sortedCenters];
  }, [contacts, locationsMap, data?.userProfile?.managed_locations]);

  useEffect(() => {
    if (activeCenter && tabsRef.current) {
        const tab = tabRefs.current.get(activeCenter);
        if (tab) {
            tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
  }, [activeCenter]);

  useEffect(() => {
    if (registerSwipeHandler) {
        registerSwipeHandler((direction) => {
            if (isSearching || selectedContact) return false; // Disable swipe when searching or viewing details

            const currentIndex = centers.indexOf(activeCenter);
            
            if (direction === 'left') {
                if (currentIndex < centers.length - 1) {
                    triggerHaptic('light');
                    setActiveCenter(centers[currentIndex + 1]);
                    return true;
                }
            }
            
            if (direction === 'right') {
                if (currentIndex > 0) {
                    triggerHaptic('light');
                    setActiveCenter(centers[currentIndex - 1]);
                    return true;
                }
            }
            
            return false;
        });
    }
    return () => {
        if (registerSwipeHandler) registerSwipeHandler(null);
    };
  }, [registerSwipeHandler, activeCenter, centers, isSearching, selectedContact]);

  useEffect(() => {
      if (searchTrigger > 0) {
          handleStartSearch();
      }
  }, [searchTrigger]);

  useEffect(() => {
      if (resetTrigger > 0) {
          if (selectedContact) {
              if (window.history.state && window.history.state.view === 'contact-detail') {
                  window.history.back();
              } else {
                  setSelectedContact(null);
              }
          }
          if (isSearching) {
              setIsSearching(false);
              setTerm('');
          }
          if (setIsHeaderVisible) setIsHeaderVisible(true);
      }
  }, [resetTrigger]);

  useEffect(() => {
      // Logic for nav visibility removed
  }, [selectedContact]);

  useEffect(() => {
      return () => {
          if (setIsHeaderVisible) setIsHeaderVisible(true);
      };
  }, []);

  const handleOpenContact = (c: Employee) => {
      triggerHaptic('light');
      window.history.pushState({ view: 'contact-detail', id: c.employee_id }, '');
      setSelectedContact(c);
      if (setIsHeaderVisible) setIsHeaderVisible(false);
  };

  const handleCloseContact = () => {
      triggerHaptic('light');
      if (window.history.state && window.history.state.view === 'contact-detail') {
          window.history.back();
      } else {
          setSelectedContact(null);
          if (setIsHeaderVisible) setIsHeaderVisible(true);
      }
  };

  useEffect(() => {
      const handlePopState = (event: PopStateEvent) => {
          if (selectedContact) {
              setSelectedContact(null);
              if (setIsHeaderVisible) setIsHeaderVisible(true);
          }
          if (isSearching && !selectedContact) {
              setIsSearching(false);
              setTerm('');
          }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedContact, isSearching, setIsHeaderVisible]);

  useEffect(() => {
      if (data?.contacts && data.contacts.length > 0) {
          try {
              localStorage.setItem('army_contacts_cache', JSON.stringify(data.contacts));
              setCachedContacts(data.contacts);
          } catch (e) {
              console.error("Failed to save contacts cache", e);
          }
      }
  }, [data?.contacts]);

  useEffect(() => {
      const handler = setTimeout(() => {
          setDebouncedTerm(term);
      }, 300);
      return () => clearTimeout(handler);
  }, [term]);

  const { empNameMap, empRoleMap, empDeptMap } = useMemo(() => {
      const nameMap: Record<string, string> = {};
      const roleMap: Record<string, string> = {};
      const deptMap: Record<string, string> = {};
      // Use allContacts (data.contacts) for mapping to ensure we find managers even if filtered out of view
      const source = data?.contacts || []; 
      source.forEach(c => {
          nameMap[c.employee_id] = c.name;
          roleMap[c.employee_id] = c.role;
          deptMap[c.employee_id] = c.department || '';
      });
      return { empNameMap: nameMap, empRoleMap: roleMap, empDeptMap: deptMap };
  }, [data?.contacts]);

  useEffect(() => {
      if (isSearching && inputRef.current && !selectedContact) {
         const timer = setTimeout(() => {
             inputRef.current?.focus();
         }, 150);
         return () => clearTimeout(timer);
      }
  }, [isSearching, selectedContact]);

  const filtered = useMemo(() => {
      if (!debouncedTerm) return [];
      const normTerm = debouncedTerm.toLowerCase();
      return contacts.filter(c => 
             c.name.toLowerCase().includes(normTerm) || 
             String(c.phone).includes(normTerm) ||
             (c.department && c.department.toLowerCase().includes(normTerm)) ||
             (c.position && c.position.toLowerCase().includes(normTerm)) ||
             (c.email && c.email.toLowerCase().includes(normTerm))
      );
  }, [contacts, debouncedTerm]);

  const HighlightText = ({ text, highlight }: { text: string, highlight: string }) => {
      if (!highlight.trim()) {
          return <span>{text}</span>;
      }
      const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
      return (
          <span>
              {parts.map((part, i) => 
                  part.toLowerCase() === highlight.toLowerCase() ? (
                      <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-neutral-black dark:text-neutral-white rounded px-0.5">{part}</span>
                  ) : (
                      <span key={i}>{part}</span>
                  )
              )}
          </span>
      );
  };

  const contactsInActiveCenter = useMemo(() => {
      if (activeCenter === 'Tất cả') return contacts;
      return contacts.filter(c => {
          const centerName = locationsMap[c.center_id] || c.center_id || 'Khác';
          return centerName === activeCenter;
      });
  }, [contacts, activeCenter, locationsMap]);

  const contactGroups = useMemo(() => {
      const groups: Record<string, { id: string, title: string, priority: number, contacts: Employee[], managerId?: string }> = {};
      
      const getRolePriority = (role: string) => {
          if (role === 'Director') return 0;
          if (role === 'Manager') return 1;
          if (role === 'Leader') return 2;
          if (role === 'Admin' || role === 'HR') return 3;
          return 4;
      };

      const addToGroup = (id: string, title: string, priority: number, contact: Employee, managerId?: string) => {
          if (!groups[id]) {
              groups[id] = { id, title, priority, contacts: [], managerId };
          }
          groups[id].contacts.push(contact);
      };

      contactsInActiveCenter.forEach(c => {
          if (c.role === 'Director') {
              addToGroup('grp_director', 'Ban Giám Đốc', 0, c);
          } else if (c.role === 'Manager') {
              if (c.direct_manager_id && empNameMap[c.direct_manager_id]) {
                  const mgrName = getShortName(empNameMap[c.direct_manager_id]);
                  addToGroup(`grp_manager_${c.direct_manager_id}`, `Ban Quản Lý - ${mgrName}`, 1, c, c.direct_manager_id);
              } else {
                  addToGroup('grp_manager', 'Ban Quản Lý', 1, c);
              }
          } else if (c.direct_manager_id && empNameMap[c.direct_manager_id]) {
              const mgrName = getShortName(empNameMap[c.direct_manager_id]);
              const dept = c.department || empDeptMap[c.direct_manager_id] || '';
              const title = dept ? `${dept} - ${mgrName}` : mgrName;
              addToGroup(`grp_team_${c.direct_manager_id}`, title, 2 + getRolePriority(c.role), c, c.direct_manager_id);
          } else {
              if (c.role === 'Leader') {
                  addToGroup('grp_leader', 'Trưởng Nhóm', 10, c);
              } else {
                  addToGroup('grp_staff', 'Nhân Viên', 11, c);
              }
          }
      });

      // Inject managers into their groups so they appear at the top
      Object.values(groups).forEach(g => {
          if (g.managerId) {
              const manager = data?.contacts?.find(emp => emp.employee_id === g.managerId);
              if (manager) {
                  // Check if manager is already in the group
                  if (!g.contacts.some(emp => emp.employee_id === manager.employee_id)) {
                      g.contacts.push(manager);
                  }
              }
          }
      });

      // Sort groups by priority then title
      const sorted = Object.values(groups).sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.title.localeCompare(b.title);
      });

      // Sort contacts within groups: Manager first -> Role Priority -> Employee Name
      sorted.forEach(g => {
          g.contacts.sort((a, b) => {
              // 1. Check if either is the explicit manager of the group
              const isManagerA = a.employee_id === g.managerId;
              const isManagerB = b.employee_id === g.managerId;
              
              // 2. Check if either is a local manager (manages someone else in this specific group, e.g. in Ban Giám Đốc)
              const isLocalManagerA = g.contacts.some(c => c.direct_manager_id === a.employee_id);
              const isLocalManagerB = g.contacts.some(c => c.direct_manager_id === b.employee_id);

              const isTopA = isManagerA || isLocalManagerA;
              const isTopB = isManagerB || isLocalManagerB;

              if (isTopA && !isTopB) return -1;
              if (!isTopA && isTopB) return 1;

              // 3. Sort by role priority
              const prioA = getRolePriority(a.role);
              const prioB = getRolePriority(b.role);
              if (prioA !== prioB) return prioA - prioB;
              
              // 4. Sort alphabetically
              return a.name.localeCompare(b.name);
          });
      });

      return sorted;
  }, [contactsInActiveCenter, locationsMap, empNameMap, empRoleMap, empDeptMap, data?.contacts]);

  // Initialize expandedGroupId with the first group ID when contactGroups changes
  useEffect(() => {
      if (contactGroups && contactGroups.length > 0) {
          // If the currently expanded group is not in the new list, or if nothing is expanded, expand the first one
          setExpandedGroupId(prev => {
              if (prev && contactGroups.some(g => g.id === prev)) {
                  return prev;
              }
              return contactGroups[0].id;
          });
      } else {
          setExpandedGroupId(null);
      }
  }, [contactGroups]);

  const handleStartSearch = () => {
      triggerHaptic('light');
      setIsSearching(true);
      window.history.pushState({ search: true }, '');
  };

  const handleCancelSearch = () => {
      triggerHaptic('light');
      if (window.history.state && window.history.state.search) {
          window.history.back();
      } else {
          setIsSearching(false);
          setTerm('');
      }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      // Scroll logic removed as setIsNavVisible is gone
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50 dark:bg-dark-bg font-sans transition-colors duration-300">
        
        {/* CSS XÓA THANH SCROLL TOÀN DIỆN */}
        <style>{`
            .hide-scroll::-webkit-scrollbar { display: none !important; }
            .hide-scroll { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        `}</style>
        
        {/* --- KHU VỰC CỐ ĐỊNH (FIXED/STICKY HEADER) --- */}
        {/* Đã tách riêng ra để không bị kẹt vào vùng cuộn */}
        <div className="pt-20 px-4 shrink-0 z-20 flex flex-col">
            {isSearching ? (
                <div className="px-4 mb-2 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="relative group flex-1">
                            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-text-secondary text-lg"></i>
                            <input 
                                ref={inputRef}
                                autoFocus={true}
                                type="text"
                                inputMode="search"
                                enterKeyHint="search"
                                className="w-full h-12 bg-neutral-white dark:bg-dark-surface rounded-xl pl-12 pr-10 text-base font-bold text-neutral-black dark:text-dark-text-primary placeholder:text-slate-400 dark:placeholder:text-dark-text-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/20 border border-slate-200 dark:border-dark-border transition-all shadow-sm"
                                placeholder="Tìm kiếm..."
                                value={term}
                                onChange={e => setTerm(e.target.value)}
                            />
                            {term && (
                            <button onClick={() => setTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-200 dark:bg-dark-border/50 rounded-full flex items-center justify-center text-slate-500 dark:text-dark-text-secondary text-xxs active:bg-slate-300 dark:active:bg-dark-border">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                            )}
                        </div>
                        <button 
                            onClick={handleCancelSearch}
                            className="text-sm font-bold text-slate-500 dark:text-dark-text-secondary active:text-neutral-black dark:active:text-dark-text-primary px-2 py-2"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            ) : (
                <div className="w-full">
                    <div 
                        ref={tabsRef}
                        className="bg-slate-200/50 dark:bg-dark-surface p-1.5 rounded-xl flex overflow-x-auto gap-1 hide-scroll border border-transparent dark:border-dark-border"
                    >
                        {centers.map(center => (
                            <button
                                key={center}
                                ref={(el) => {
                                    if (el) tabRefs.current.set(center, el);
                                    else tabRefs.current.delete(center);
                                }}
                                onClick={() => { triggerHaptic('light'); setActiveCenter(center); }}
                                className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-xxs font-black uppercase tracking-widest transition-all duration-300 shrink-0 ${
                                    activeCenter === center 
                                    ? 'text-primary dark:text-primary bg-neutral-white dark:bg-dark-border shadow-sm' 
                                    : 'text-slate-500 dark:text-dark-text-secondary hover:text-slate-700 dark:hover:text-dark-text-primary'
                                }`}
                            >
                                {center}
                            </button>
                        ))}
                        {/* Spacer to ensure last item is fully visible when scrolled to end */}
                        <div className="w-4 shrink-0"></div>
                    </div>
                </div>
            )}
        </div>

        {/* --- KHU VỰC DANH SÁCH CUỘN --- */}
        <div className="flex-1 overflow-y-auto hide-scroll px-4 pb-32 pt-8" onScroll={handleScroll}>
            {isSearching && term ? (
                <div className="animate-fade-in">
                    <div className="bg-neutral-white dark:bg-dark-surface rounded-xl overflow-hidden border border-slate-100 dark:border-dark-border divide-y divide-slate-50 dark:divide-dark-border">
                        {term !== debouncedTerm ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-dark-text-secondary opacity-60">
                                <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-3"></i>
                                <p className="text-sm font-semibold">Đang tìm kiếm...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-dark-text-secondary opacity-60">
                                <i className="fa-solid fa-magnifying-glass-minus text-4xl mb-3"></i>
                                <p className="text-sm font-semibold">Không tìm thấy kết quả</p>
                            </div>
                        ) : (
                            filtered.map(c => (
                                <div key={c.employee_id} 
                                    onClick={() => handleOpenContact(c)}
                                    className="flex items-center gap-4 p-4 active:bg-slate-50 dark:active:bg-dark-border/50 transition-colors cursor-pointer group"
                                >
                                    <Avatar 
                                        src={c.face_ref_url} 
                                        name={c.name} 
                                        className="w-10 h-10 rounded-xl" 
                                        textSize="text-xs"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-neutral-black dark:text-dark-text-primary truncate">
                                            <HighlightText text={c.name} highlight={debouncedTerm} />
                                        </h4>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {c.department && (
                                                <span className="px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary text-xxs font-extrabold border border-primary/20 dark:border-primary/30 uppercase tracking-wide truncate max-w-[100px]">
                                                    <HighlightText text={c.department} highlight={debouncedTerm} />
                                                </span>
                                            )}
                                            {c.position && (
                                                <span className="px-2 py-0.5 rounded-md bg-secondary-purple/10 dark:bg-secondary-purple/20 text-secondary-purple dark:text-secondary-purple text-xxs font-extrabold border border-secondary-purple/20 dark:border-secondary-purple/30 uppercase tracking-wide truncate max-w-[100px]">
                                                    <HighlightText text={c.position} highlight={debouncedTerm} />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <div className="pb-4">
                    <div className="bg-neutral-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-dark-border animate-slide-up">
                        {contactGroups.map((group) => {
                            const isExpanded = expandedGroupId === group.id;
                            return (
                            <div key={group.id} className="transition-all duration-300">
                                <div 
                                    onClick={() => toggleGroup(group.id)}
                                    className="px-4 py-3 flex items-center justify-between cursor-pointer select-none group/header active:bg-slate-50 dark:active:bg-dark-border/50 transition-colors"
                                >
                                <div className="flex items-center gap-2 text-primary dark:text-primary">
                                    <span className="text-xs font-black uppercase tracking-widest">{group.title}</span>
                                </div>
                                <div className="flex items-center justify-center">
                                    <span className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary px-2 py-0.5 rounded-md text-xs font-bold tabular-nums">{group.contacts.length}</span>
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
                                            {group.contacts.map(c => (
                                                <div key={c.employee_id} 
                                                    onClick={() => handleOpenContact(c)}
                                                    className="flex items-center gap-4 p-4 active:bg-slate-50 dark:active:bg-dark-border/50 transition-colors cursor-pointer group"
                                                >
                                                    <Avatar 
                                                        src={c.face_ref_url} 
                                                        name={c.name} 
                                                        className="w-10 h-10 rounded-xl" 
                                                        textSize="text-xs"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        {/* Hàng 1: Tên + Department + Position */}
                                                        <div className="flex justify-between items-center gap-4">
                                                            <h4 className="text-base font-bold text-neutral-black dark:text-dark-text-primary leading-tight group-hover:text-primary dark:group-hover:text-primary transition-colors truncate">
                                                                {c.name}
                                                            </h4>
                                                            
                                                            <div className="flex gap-1">
                                                                {c.department && (
                                                                    <span className="px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary text-xxs font-extrabold border border-primary/20 dark:border-primary/30 uppercase tracking-wide truncate max-w-[120px] shrink-0">
                                                                        {c.department}
                                                                    </span>
                                                                )}
                                                                {c.position && (
                                                                    <span className="px-2 py-0.5 rounded-md bg-secondary-purple/10 dark:bg-secondary-purple/20 text-secondary-purple dark:text-secondary-purple text-xxs font-extrabold border border-secondary-purple/20 dark:border-secondary-purple/30 uppercase tracking-wide truncate max-w-[120px] shrink-0">
                                                                        {c.position}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Hàng 2: Center (Vẫn ở dưới như cũ) */}
                                                        <div className="flex mt-1.5">
                                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-border/50 text-slate-500 dark:text-dark-text-secondary text-xxs font-extrabold border border-slate-200 dark:border-dark-border uppercase tracking-wide truncate max-w-[120px]">
                                                                {locationsMap[c.center_id] || c.center_id}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        );
                    })}
                    </div>
                </div>
            )}
        </div>

        <ModalContactDetail 
            contact={selectedContact}
            isOpen={!!selectedContact}
            onClose={handleCloseContact}
            locationsMap={locationsMap}
            empNameMap={empNameMap}
            locations={data?.locations || []}
            currentUser={user}
            onNavigate={onNavigate}
            notiCount={notiCount}
            onOpenNoti={onOpenNoti}
        />
    </div>
  );
};
export default TabContacts;
