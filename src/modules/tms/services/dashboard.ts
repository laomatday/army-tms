import { db } from "@/core/firebase";
import { collection, query, where, getDocs, doc, getDoc, Query, DocumentReference, QuerySnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { Employee, Attendance, LeaveRequest, Explanation, LocationConfig, HolidayConfig, MonthlyStats, ShiftConfig } from "@/shared/types";
import { getSystemConfig } from "./config";
import { COLLECTIONS, PRIVILEGED_ROLES, GLOBAL_ADMINS } from "./constants";

async function safeGetDocs(q: Query | ReturnType<typeof collection>): Promise<QuerySnapshot<DocumentData, DocumentData>> {
    try {
        return await getDocs(q);
    } catch (e: any) {
        console.warn("safeGetDocs error (offline?):", e.message);
        return { docs: [], empty: true, size: 0, query: q, forEach: () => {}, docChanges: () => [], metadata: {} as any } as unknown as QuerySnapshot<DocumentData, DocumentData>;
    }
}

async function safeGetDoc(d: DocumentReference): Promise<DocumentSnapshot<DocumentData, DocumentData>> {
    try {
        return await getDoc(d);
    } catch (e: any) {
        console.warn("safeGetDoc error (offline?):", e.message);
        return { exists: () => false, data: () => undefined, id: d.id, ref: d, metadata: {} as any, get: () => undefined } as unknown as DocumentSnapshot<DocumentData, DocumentData>;
    }
}

export async function getDashboardData(user: Employee) {
  try {
    const userRole = user.role || "Staff";
    const canViewAll = PRIVILEGED_ROLES.includes(userRole);

    const sysConfig = await getSystemConfig();
    
    const [locSnap, holidaySnap, shiftSnap] = await Promise.all([
        safeGetDocs(collection(db, COLLECTIONS.LOCATIONS)),
        safeGetDocs(collection(db, COLLECTIONS.HOLIDAYS)),
        safeGetDocs(collection(db, COLLECTIONS.SHIFTS))
    ]);

    const locations = locSnap.docs.map(d => ({ ...(d.data() as LocationConfig), id: d.id } as LocationConfig));
    const holidays = holidaySnap.docs.map(d => d.data() as HolidayConfig);
    
    // Map shifts
    const shifts = shiftSnap.docs.map(d => {
        const data = d.data() as any;
        return {
             name: data.name || "Unnamed Shift",
             start: data.start || data.start_time || "00:00",
             end: data.end || data.end_time || "00:00",
             break_point: data.break_point || "23:59"
        } as ShiftConfig;
    });

    let contacts: Employee[] = [];
    // Admin, Director, HR see all
    if (GLOBAL_ADMINS.includes(userRole)) {
        const empSnap = await safeGetDocs(collection(db, COLLECTIONS.EMPLOYEES));
        contacts = empSnap.docs.map(d => ({ ...(d.data() as Employee), id: d.id } as Employee));
    } else {
        // 1. Get all relevant location IDs
        let managedLocs: string[] = [];
        if (Array.isArray(user.managed_locations)) {
            managedLocs = user.managed_locations;
        } else if (typeof user.managed_locations === 'string' && user.managed_locations) {
            managedLocs = [user.managed_locations];
        }
        
        const allLocs = new Set([user.center_id, ...managedLocs]);
        
        // 2. Extract unique prefixes (e.g., "DN01" -> "DN")
        const prefixes = Array.from(new Set(Array.from(allLocs).map(loc => {
            if (!loc) return '';
            const p = loc.replace(/[0-9]/g, '');
            return p || loc; // Fallback to full loc if no non-numeric chars
        }))).filter(Boolean);
        
        // 3. Fetch employees for each prefix
        const contactMap = new Map();
        if (prefixes.length > 0) {
            const promises = prefixes.map(prefix => 
                safeGetDocs(query(collection(db, COLLECTIONS.EMPLOYEES), 
                    where("center_id", ">=", prefix),
                    where("center_id", "<=", prefix + '\uf8ff')
                ))
            );
            const snaps = await Promise.all(promises);
            snaps.forEach(s => {
                s.docs.forEach(d => {
                    const data = d.data() as Employee;
                    contactMap.set(data.employee_id, { ...data, id: d.id });
                });
            });
        }
        contacts = Array.from(contactMap.values());
    }

    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 60);
    const dateLimitStr = pastDate.toISOString().split('T')[0];

    const attRef = collection(db, COLLECTIONS.ATTENDANCE);
    const qAtt = query(attRef, where("employee_id", "==", user.employee_id));
    
    const attSnap = await safeGetDocs(qAtt);
    const historyList = attSnap.docs
      .map(d => ({ ...(d.data() as Attendance), id: d.id } as Attendance))
      .filter(a => a.date >= dateLimitStr)
      .sort((a, b) => b.timestamp - a.timestamp);

    const reqRef = collection(db, COLLECTIONS.LEAVE);
    const qMyReq = query(reqRef, where("employee_id", "==", user.employee_id));
    const myReqSnap = await safeGetDocs(qMyReq);
    const myRequests = myReqSnap.docs.map(d => ({...(d.data() as LeaveRequest), id: d.id} as LeaveRequest))
                       .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const expRef = collection(db, COLLECTIONS.EXPLANATIONS);
    const qMyExp = query(expRef, where("employee_id", "==", user.employee_id));
    const myExpSnap = await safeGetDocs(qMyExp);
    const myExplanations = myExpSnap.docs.map(d => ({...(d.data() as Explanation), id: d.id} as Explanation))
                       .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // --- FETCH TEAM LEAVES FOR CALENDAR ---
    let teamLeaves: LeaveRequest[] = [];
    try {
        const qTeamLeaves = query(reqRef,
            where("to_date", ">=", dateLimitStr));
        const teamLeavesSnap = await safeGetDocs(qTeamLeaves);
        
        const allLeaves = teamLeavesSnap.docs.map(d => ({ ...(d.data() as LeaveRequest), id: d.id } as LeaveRequest));
        
        // Filter based on visibility (contacts list is already filtered by region/role)
        // AND only include Approved or Pending status
        const contactIds = new Set(contacts.map(c => c.employee_id));
        teamLeaves = allLeaves.filter(l => {
             const isRelevantStatus = l.status === 'Approved' || l.status === 'Pending';
             const isRelevantUser = contactIds.has(l.employee_id);
             return isRelevantStatus && isRelevantUser;
        });
    } catch (e) {
        console.warn("Failed to fetch team leaves", e);
    }
    // -------------------------------------

    const now = new Date();
    
    const keyId = `${user.employee_id}_${now.getMonth()+1}_${now.getFullYear()}`;
    const statSnap = await safeGetDoc(doc(db, COLLECTIONS.MONTHLY_STATS, keyId));
    
    let summaryData = { workDays: 0, lateMins: 0, leaveDays: 0, remainingLeave: user.annual_leave_balance, standardDays: 26, errorCount: 0 };
    if (statSnap.exists()) {
        const s = statSnap.data() as MonthlyStats;
        summaryData = {
            workDays: s.work_days,
            lateMins: s.late_mins,
            leaveDays: s.leave_days,
            remainingLeave: user.annual_leave_balance,
            standardDays: s.standard_days,
            errorCount: s.error_count
        };
    }

    // --- HIERARCHY HELPER ---
    const subordinates = new Set<string>();
    if (userRole === 'Manager' || userRole === 'Leader') {
        const reportsMap = new Map<string, string[]>();
        // We need ALL employees to build a proper hierarchy map, not just the filtered ones
        // But we only have 'contacts' which might be filtered.
        // Actually, we should fetch all employees if we want a full hierarchy, but that's expensive.
        // Let's assume the hierarchy is within the region/managed locations for now.
        const empSnap = await safeGetDocs(collection(db, COLLECTIONS.EMPLOYEES));
        const allEmps = empSnap.docs.map(d => d.data() as Employee);
        
        allEmps.forEach(emp => {
            if (emp.direct_manager_id) {
                const list = reportsMap.get(emp.direct_manager_id) || [];
                list.push(emp.employee_id);
                reportsMap.set(emp.direct_manager_id, list);
            }
        });

        const stack = [user.employee_id];
        while (stack.length > 0) {
            const currentId = stack.pop()!;
            const children = reportsMap.get(currentId) || [];
            children.forEach(childId => {
                if (!subordinates.has(childId)) {
                    subordinates.add(childId);
                    stack.push(childId);
                }
            });
        }
    }
    // ------------------------

    let approvals: LeaveRequest[] = [];
    let explanationApprovals: Explanation[] = [];

    if (PRIVILEGED_ROLES.includes(userRole)) {
        const qPending = query(reqRef, where("status", "==", "Pending"));
        const pSnap = await safeGetDocs(qPending);
        const allPending = pSnap.docs.map(d => ({...(d.data() as LeaveRequest), id: d.id} as LeaveRequest));

        const qExpPending = query(expRef, where("status", "==", "Pending"));
        const eSnap = await safeGetDocs(qExpPending);
        const allExpPending = eSnap.docs.map(d => ({...(d.data() as Explanation), id: d.id} as Explanation));

        const canApprove = (requesterId: string) => {
            if (requesterId === user.employee_id) return false;
            
            // Director, HR, Admin: See ALL
            if (GLOBAL_ADMINS.includes(userRole)) {
                 return true;
            }

            // Manager & Leader: ONLY Direct and Indirect reports
            return subordinates.has(requesterId);
        };

        approvals = allPending.filter(r => canApprove(r.employee_id));
        explanationApprovals = allExpPending.filter(r => canApprove(r.employee_id));
    }

    // Refresh user profile in case it changed (status check happens in UI)
    const userRef = await safeGetDoc(doc(db, COLLECTIONS.EMPLOYEES, user.id || user.employee_id));
    const updatedUserProfile = userRef.exists() ? ({...userRef.data(), id: userRef.id} as Employee) : user;


    return {
        success: true,
        data: {
            userProfile: updatedUserProfile,
            history: { history: historyList, summary: summaryData },
            notifications: { approvals, explanationApprovals, myRequests, myExplanations },
            myRequests,
            myExplanations,
            teamLeaves,
            locations,
            contacts,
            holidays,
            shifts,
            systemConfig: sysConfig
        }
    };
  } catch (e: any) {
      console.error("Dashboard Load Error:", e);
      return { success: false, message: e.message };
  }
}
