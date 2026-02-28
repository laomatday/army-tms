import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Employee } from '@/shared/types';
import { adminGetCollection, adminDeleteDoc, adminUpdateDoc, adminCreateDoc } from '@/modules/tms/services';
import { secondaryAuth } from '@/core/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcryptjs';
import { formatDateString, formatTimeString, generateEmailFromName } from '@/core/utils/helpers';
import ConfirmDialog from '@/shared/components/modals/ConfirmDialog';
import { useToast } from '@/shared/contexts/ToastContext';

interface Props {
    user: Employee;
    onLogout: () => void;
    onBackToApp: () => void;
}

const COLLECTIONS = [
    { id: 'employees', name: 'Nhân viên', icon: 'fa-users' },
    { id: 'attendance', name: 'Chấm công', icon: 'fa-calendar-check' },
    { id: 'leave_requests', name: 'Yêu cầu nghỉ', icon: 'fa-envelope-open-text' },
    { id: 'config_locations', name: 'Cấu hình địa điểm', icon: 'fa-map-location-dot' },
    { id: 'config_shifts', name: 'Cấu hình ca', icon: 'fa-clock' },
    { id: 'config_holidays', name: 'Cấu hình ngày lễ', icon: 'fa-calendar-day' },
    { id: 'config_system', name: 'Cấu hình hệ thống', icon: 'fa-gears' },
    { id: 'kiosks', name: 'Quản lý Kiosk', icon: 'fa-tablet-screen-button' },
    { id: 'monthly_stats', name: 'Thống kê tháng', icon: 'fa-chart-column' }
];

const SCHEMAS: any = {
    employees: {
        primaryKey: 'employee_id',
        headers: ['employee_id', 'name', 'role', 'department', 'phone', 'trusted_device_id', 'status'],
        fields: {
            employee_id: { label: 'Mã NV', type: 'text', required: true, colSpan: 1 },
            name: { label: 'Họ và tên', type: 'text', required: true, colSpan: 1 },
            email: { label: 'Email', type: 'email', required: true, colSpan: 1 },
            password: { label: 'Mật khẩu', type: 'password', colSpan: 1, placeholder: 'Nhập độ dài > 5 ký tự' },
            phone: { label: 'Số điện thoại', type: 'text', colSpan: 1 },
            role: { label: 'Vai trò', type: 'select', options: ['Staff', 'Leader', 'Manager', 'Director', 'Admin', 'HR', 'Kiosk'], colSpan: 1 },
            center_id: { label: 'Văn phòng chính', type: 'reference', collection: 'config_locations', valueField: 'center_id', labelField: 'location_name', colSpan: 1 },
            allowed_locations: { label: 'Chi nhánh được phép chấm công', type: 'multi-select', collection: 'config_locations', valueField: 'center_id', labelField: 'location_name', colSpan: 2 },
            managed_locations: { label: 'Chi nhánh phụ trách (Manager/Leader)', type: 'multi-select', collection: 'config_locations', valueField: 'center_id', labelField: 'location_name', colSpan: 2 },
            department: { label: 'Phòng ban', type: 'text', colSpan: 1 },
            position: { label: 'Chức vụ', type: 'text', colSpan: 1 },
            direct_manager_id: { label: 'Quản lý trực tiếp', type: 'reference', collection: 'employees', valueField: 'employee_id', labelField: 'name', colSpan: 1 },
            annual_leave_balance: { label: 'Quỹ phép', type: 'number', colSpan: 1 },
            trusted_device_id: { label: 'Device ID (Clear để reset)', type: 'text', colSpan: 1, placeholder: 'DEV_...' },
            status: { label: 'Trạng thái', type: 'select', options: ['Active', 'Inactive'], colSpan: 1 },
        }
    },
    attendance: {
        headers: ['date', 'employee_id', 'name', 'shift_name', 'time_in', 'time_out', 'status'],
        fields: {
            date: { label: 'Ngày', type: 'date', required: true, colSpan: 1 },
            employee_id: { label: 'Nhân viên', type: 'reference', collection: 'employees', valueField: 'employee_id', labelField: 'name', required: true, colSpan: 1 },
            shift_name: { label: 'Ca làm việc', type: 'reference', collection: 'config_shifts', valueField: 'name', labelField: 'name', colSpan: 1 },
            time_in: { label: 'Giờ vào', type: 'time', placeholder: 'HH:mm', colSpan: 1 },
            time_out: { label: 'Giờ ra', type: 'time', placeholder: 'HH:mm', colSpan: 1 },
            status: { label: 'Trạng thái', type: 'select', options: ['Valid', 'Late', 'Invalid'], colSpan: 1 },
            checkin_type: { label: 'Loại Check-in', type: 'select', options: ['GPS', 'Manual'], colSpan: 1 },
            is_valid: { label: 'Hợp lệ', type: 'select', options: ['Yes', 'No'], colSpan: 1 },
            late_minutes: { label: 'Phút trễ', type: 'number', colSpan: 1 },
            work_hours: { label: 'Giờ công', type: 'number', colSpan: 1 }
        }
    },
    leave_requests: {
        headers: ['request_id', 'employee_id', 'type', 'from_date', 'to_date', 'status'],
        fields: {
            employee_id: { label: 'Nhân viên', type: 'reference', collection: 'employees', valueField: 'employee_id', labelField: 'name', colSpan: 1 },
            type: { label: 'Loại đơn', type: 'select', options: ['Nghỉ phép', 'Nghỉ ốm', 'Nghỉ không lương', 'Công tác', 'Giải trình công'], colSpan: 1 },
            from_date: { label: 'Từ ngày', type: 'date', colSpan: 1 },
            to_date: { label: 'Đến ngày', type: 'date', colSpan: 1 },
            expiration_date: { label: 'Hết hạn', type: 'date', colSpan: 1 },
            reason: { label: 'Lý do', type: 'textarea', colSpan: 2 },
            status: { label: 'Trạng thái', type: 'select', options: ['Pending', 'Approved', 'Rejected'], colSpan: 1 },
            manager_note: { label: 'Ghi chú quản lý', type: 'text', colSpan: 1 }
        }
    },
    config_locations: {
        primaryKey: 'center_id',
        headers: ['center_id', 'location_name', 'type', 'city', 'status'],
        fields: {
            center_id: { label: 'Mã địa điểm', type: 'text', required: true, colSpan: 1 },
            location_name: { label: 'Tên địa điểm', type: 'text', required: true, colSpan: 1 },
            type: { label: 'Phân loại', type: 'select', options: ['Center', 'HO', 'Other'], colSpan: 1 },
            city: { label: 'Tỉnh/Thành phố', type: 'text', colSpan: 1 },
            address: { label: 'Địa chỉ chi tiết', type: 'text', colSpan: 2 },
            latitude: { label: 'Vĩ độ (Lat)', type: 'number', colSpan: 1 },
            longitude: { label: 'Kinh độ (Lng)', type: 'number', colSpan: 1 },
            radius_meters: { label: 'Bán kính (m)', type: 'number', colSpan: 1 },
            city_code: { label: 'Mã thành phố', type: 'text', colSpan: 1 },
            status: { label: 'Trạng thái', type: 'select', options: ['Active', 'Inactive'], colSpan: 1 },
            kiosks: { label: 'Kiosk liên kết', type: 'multi-select', collection: 'kiosks', valueField: 'kiosk_id', labelField: 'name', colSpan: 2 }
        }
    },
    config_shifts: {
        headers: ['name', 'start_time', 'end_time', 'break_point'],
        fields: {
            name: { label: 'Tên ca', type: 'text', required: true, colSpan: 2 },
            start_time: { label: 'Giờ bắt đầu', type: 'time', placeholder: 'HH:mm', colSpan: 1 },
            end_time: { label: 'Giờ kết thúc', type: 'time', placeholder: 'HH:mm', colSpan: 1 },
            break_point: { label: 'Điểm ngắt ca', type: 'time', placeholder: 'HH:mm', colSpan: 1 }
        }
    },
    config_holidays: {
        headers: ['name', 'from_date', 'to_date'],
        fields: {
            name: { label: 'Tên ngày lễ', type: 'text', required: true, colSpan: 2 },
            from_date: { label: 'Từ ngày', type: 'date', colSpan: 1 },
            to_date: { label: 'Đến ngày', type: 'date', colSpan: 1 }
        }
    },
    config_system: {
        headers: ['key', 'value', 'description'],
        fields: {
            key: { label: 'Mã cấu hình', type: 'text', required: true, colSpan: 1 },
            value: { label: 'Giá trị', type: 'text', required: true, colSpan: 1 },
            description: { label: 'Mô tả', type: 'textarea', colSpan: 2, placeholder: 'Mô tả chi tiết mục đích và cách sử dụng cấu hình này...' }
        }
    },
    kiosks: {
        primaryKey: 'kiosk_id',
        headers: ['kiosk_id', 'name', 'center_id', 'status'],
        fields: {
            kiosk_id: { label: 'Mã Kiosk', type: 'text', required: true, colSpan: 1, placeholder: 'KIOSK_01' },
            name: { label: 'Tên Kiosk', type: 'text', required: true, colSpan: 1 },
            center_id: { label: 'Văn phòng', type: 'reference', collection: 'config_locations', valueField: 'center_id', labelField: 'location_name', required: true, colSpan: 1 },
            status: { label: 'Trạng thái', type: 'select', options: ['Active', 'Inactive'], colSpan: 1 },
            description: { label: 'Mô tả', type: 'textarea', colSpan: 2, placeholder: 'Mô tả vị trí đặt Kiosk hoặc ghi chú quản lý...' }
        }
    },
    monthly_stats: {
        primaryKey: 'key_id',
        headers: ['key_id', 'employee_id', 'work_days', 'late_mins', 'leave_days'],
        fields: {
            key_id: { label: 'Key ID', type: 'text', disabled: true, colSpan: 1 },
            employee_id: { label: 'Nhân viên', type: 'reference', collection: 'employees', valueField: 'employee_id', labelField: 'name', colSpan: 1 },
            work_days: { label: 'Ngày công', type: 'number', colSpan: 1 },
            leave_days: { label: 'Ngày nghỉ', type: 'number', colSpan: 1 },
            late_mins: { label: 'Phút trễ', type: 'number', colSpan: 1 },
            standard_days: { label: 'Công chuẩn', type: 'number', colSpan: 1 },
            error_count: { label: 'Lỗi', type: 'number', colSpan: 1 }
        }
    }
};

const MultiSelectTags = ({
    selected,
    options,
    onAdd,
    onRemove,
    labelField,
    valueField
}: {
    selected: string[],
    options: any[],
    onAdd: (val: string) => void,
    onRemove: (val: string) => void,
    labelField: string,
    valueField: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        !selected.includes(opt[valueField]) &&
        opt[labelField].toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={containerRef} className="relative">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="min-h-[46px] p-2 bg-neutral-white dark:bg-neutral-black/50 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap gap-2 cursor-pointer focus-within:ring-2 focus-within:ring-primary transition-all"
            >
                {selected.length === 0 && !isOpen && (
                    <span className="text-slate-400 dark:text-slate-500 text-sm mt-1 ml-2">Chọn các chi nhánh...</span>
                )}
                {selected.map(val => {
                    const opt = options.find(o => o[valueField] === val);
                    return (
                        <div key={val} className="flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary px-3 py-1 rounded-xl text-xs font-bold border border-primary/20 dark:border-primary/30 animate-scale-in">
                            {opt ? opt[labelField] : val}
                            <button onClick={(e) => { e.stopPropagation(); onRemove(val); }} className="hover:text-primary/70">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    )
                })}
            </div>

            {isOpen && (
                <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-neutral-white dark:bg-neutral-black border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden animate-scale-in">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="relative">
                            <i className="fa-solid fa-search absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                            <input
                                autoFocus
                                type="text"
                                className="w-full pl-9 pr-4 py-2 bg-neutral-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary text-neutral-black dark:text-neutral-white"
                                placeholder="Tìm chi nhánh..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar bg-neutral-white dark:bg-neutral-black">
                        {filteredOptions.map(opt => (
                            <div
                                key={opt[valueField]}
                                onClick={() => onAdd(opt[valueField])}
                                className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-neutral-black dark:text-neutral-white cursor-pointer transition-colors border-t border-slate-50 dark:border-slate-800 font-medium"
                            >
                                {opt[labelField]} ({opt[valueField]})
                            </div>
                        ))}
                        {filteredOptions.length === 0 && search && (
                            <div className="px-4 py-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                                Không có kết quả
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminPanel: React.FC<Props> = ({ user, onLogout, onBackToApp }) => {
    const [selectedCollection, setSelectedCollection] = useState('employees');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [references, setReferences] = useState<any>({});

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});

    const { showToast } = useToast();

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData();
        fetchReferences();
        setSelectedIds(new Set());
        setCurrentPage(1);
        setSortConfig(null);
        setSearchTerm('');
    }, [selectedCollection]);

    // Tự động reset về trang 1 khi từ khóa tìm kiếm thay đổi
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchReferences = async () => {
        const locations = await adminGetCollection('config_locations');
        const emps = await adminGetCollection('employees');
        const shifts = await adminGetCollection('config_shifts');
        const kiosks = await adminGetCollection('kiosks');

        setReferences({
            config_locations: locations,
            employees: emps,
            config_shifts: shifts,
            kiosks: kiosks
        });
    };

    const fetchData = async () => {
        setLoading(true);
        const res = await adminGetCollection(selectedCollection);
        setData(res);
        setLoading(false);
    };

    const handleDelete = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            title: "Xác nhận xóa",
            message: "Bạn có chắc chắn muốn xóa bản ghi này? Hành động này không thể hoàn tác.",
            onConfirm: async () => {
                setLoading(true);
                const res = await adminDeleteDoc(selectedCollection, String(id));
                if (res.success) {
                    setData(prev => prev.filter(item => item.id !== id));
                    if (selectedIds.has(id)) {
                        const newSet = new Set(selectedIds);
                        newSet.delete(id);
                        setSelectedIds(newSet);
                    }
                    showToast({ title: "Đã xóa thành công", body: "", type: 'success' });
                } else {
                    showToast({ title: "Lỗi xóa", body: String(res.message), type: 'error' });
                }
                setLoading(false);
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;

        setConfirmDialog({
            isOpen: true,
            title: "Xóa nhiều bản ghi",
            message: `CẢNH BÁO: Bạn sắp xóa vĩnh viễn ${selectedIds.size} bản ghi. Tiếp tục?`,
            onConfirm: async () => {
                setLoading(true);
                let successCount = 0;
                const ids = Array.from(selectedIds);

                for (const id of ids) {
                    const res = await adminDeleteDoc(selectedCollection, String(id));
                    if (res.success) successCount++;
                }

                showToast({
                    title: `Đã xóa ${successCount}/${ids.length} bản ghi`,
                    body: "",
                    type: successCount === ids.length ? 'success' : 'error'
                });
                await fetchData();
                setSelectedIds(new Set());
                setLoading(false);
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSet = new Set(selectedIds);
        const pageIds = paginatedData.map(d => String(d.id));

        if (e.target.checked) {
            pageIds.forEach(id => newSet.add(id));
        } else {
            pageIds.forEach(id => newSet.delete(id));
        }
        setSelectedIds(newSet);
    };

    const toggleSelectOne = (id: string, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) newSet.add(id);
        else newSet.delete(id);
        setSelectedIds(newSet);
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        let dataToEdit = { ...item };
        if (selectedCollection === 'employees') {
            dataToEdit.password = "";
        }
        setFormData(dataToEdit);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingItem(null);
        const schema = SCHEMAS[selectedCollection];
        let template: any = {};
        if (schema && schema.fields) {
            Object.keys(schema.fields).forEach(key => template[key] = '');
        } else if (schema && schema.headers) {
            schema.headers.forEach((h: any) => template[h] = '');
        }
        setFormData(template);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        const payload = { ...formData };
        delete payload.id;

        if (selectedCollection === 'employees') {
            const passwordInput = payload.password ? String(payload.password).trim() : '';

            if (passwordInput) {
                if (passwordInput.length < 6) {
                    showToast({ title: "Lỗi mật khẩu", body: "Mật khẩu phải có ít nhất 6 ký tự", type: 'error' });
                    return;
                }
                if (editingItem && payload.password) {
                    try {
                        // Workaround to update another user's Firebase Auth password from Client SDK:
                        // Sign in as them on secondaryAuth using their OLD password from DB, then update it.
                        if (editingItem.email && editingItem.password) {
                            const userCred = await signInWithEmailAndPassword(secondaryAuth, editingItem.email, editingItem.password);
                            await updatePassword(userCred.user, payload.password);
                            // Sign out secondary auth just in case
                            await secondaryAuth.signOut();
                        }
                    } catch (err: any) {
                        console.error("Auth update error:", err);
                        showToast({ title: "Đã Lưu DB nhưng lỗi Auth", body: "Không thể tự động đồng bộ Mật khẩu lên hệ thống Đăng Nhập. Vui lòng bấm [Cấp Auth] lại.", type: 'warning' });
                    }
                    // Hash the password purely for Firestore display/storage security
                    payload.password = bcrypt.hashSync(String(payload.password), 10);
                } else if (!editingItem) {
                    // It's a creation, it will be hashed down below after Auth creation
                }
            } else {
                if (!editingItem) {
                    showToast({ title: "Lỗi mật khẩu", body: "Mật khẩu là bắt buộc khi tạo nhân viên mới", type: 'error' });
                    return;
                }
            }
        }

        if (selectedCollection === 'config_system') {
            if (!payload.key || String(payload.key).trim() === '') {
                showToast({ title: "Lỗi", body: "Mã cấu hình (key) không được để trống", type: 'error' });
                return;
            }
            if (!payload.value || String(payload.value).trim() === '') {
                showToast({ title: "Lỗi", body: "Giá trị không được để trống", type: 'error' });
                return;
            }
            if (!editingItem) {
                const exists = data.some(item => item.key === payload.key);
                if (exists) {
                    showToast({ title: "Lỗi", body: `Mã cấu hình '${payload.key}' đã tồn tại`, type: 'error' });
                    return;
                }
            }
        }

        const schema = SCHEMAS[selectedCollection];
        if (schema && schema.fields) {
            Object.keys(schema.fields).forEach(key => {
                const field = schema.fields[key];
                if (field.type === 'number' && payload[key] !== undefined && payload[key] !== '') {
                    payload[key] = Number(payload[key]);
                }
            });
        }

        let res;
        if (editingItem) {
            if (selectedCollection === 'employees') {
                if (!payload.password) delete payload.password; // Do not overwrite if blank during edit
            }
            res = await adminUpdateDoc(selectedCollection, String(editingItem.id), payload);
        } else {
            const schema = SCHEMAS[selectedCollection];
            let customId: string | undefined = undefined;
            if (schema && schema.primaryKey && payload[schema.primaryKey]) {
                customId = String(payload[schema.primaryKey]);
            }

            if (selectedCollection === 'employees') {
                try {
                    if (!payload.email && payload.name) {
                        payload.email = generateEmailFromName(payload.name);
                        showToast({ title: "Tự tạo Email", body: `Hệ thống tự động cấp email: ${payload.email}`, type: 'success' });
                    }
                    if (!payload.email) {
                        showToast({ title: "Lỗi", body: "Email là bắt buộc để tạo tài khoản, hoặc nhập tên để tự sinh.", type: 'error' });
                        return;
                    }
                    // Create user in Firebase Auth using secondary app (plain text password). 
                    // Use their generated Email correctly per request
                    await createUserWithEmailAndPassword(secondaryAuth, payload.email, payload.password);

                    // Hash password for Firestore storage where user wants it to be secure
                    payload.password = bcrypt.hashSync(String(payload.password), 10);
                } catch (error: any) {
                    console.error("Error creating Firebase Auth user:", error);
                    showToast({ title: "Lỗi tạo tài khoản", body: error.message, type: 'error' });
                    return;
                }
            }

            res = await adminCreateDoc(selectedCollection, payload, customId);
        }

        if (res.success) {
            showToast({
                title: editingItem ? "Cập nhật thành công" : "Tạo mới thành công",
                body: "",
                type: 'success'
            });
            setIsModalOpen(false);
            fetchData();
        } else {
            showToast({ title: "Lỗi", body: String(res.message), type: 'error' });
        }
    };

    const handleExport = () => {
        const schema = SCHEMAS[selectedCollection];
        let headers: string[] = [];

        if (schema && schema.fields) {
            headers = Object.keys(schema.fields);
            if (schema.primaryKey && !headers.includes(schema.primaryKey)) {
                headers.unshift(schema.primaryKey);
            }
        } else {
            const allKeysSet = new Set<string>();
            data.forEach(item => Object.keys(item).forEach(key => { if (key !== 'id') allKeysSet.add(key); }));
            headers = Array.from(allKeysSet);
        }

        const exportData = data.map(item => {
            const row: any = {};
            headers.forEach(key => {
                let val = item[key];
                if (Array.isArray(val)) {
                    val = val.join(', ');
                } else if (typeof val === 'object' && val !== null) {
                    val = JSON.stringify(val);
                }
                row[key] = val;
            });
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, selectedCollection);
        XLSX.writeFile(wb, `${selectedCollection}_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                if (typeof bstr !== 'string') return;

                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

                setConfirmDialog({
                    isOpen: true,
                    title: "Import Excel",
                    message: `Tìm thấy ${jsonData.length} dòng dữ liệu. Import vào bảng ${selectedCollection}?`,
                    onConfirm: async () => {
                        setLoading(true);
                        let successCount = 0;
                        const schema = SCHEMAS[selectedCollection];

                        for (const row of jsonData) {
                            const payload: any = row;

                            if (schema && schema.fields) {
                                Object.keys(schema.fields).forEach(key => {
                                    const fieldConfig = schema.fields[key];
                                    if (fieldConfig.type === 'multi-select' && payload[key] && typeof payload[key] === 'string') {
                                        payload[key] = payload[key].split(',').map((s: string) => s.trim()).filter(Boolean);
                                    }
                                });
                            }

                            if (selectedCollection === 'employees' && payload.password) {
                                payload.password = bcrypt.hashSync(String(payload.password), 10);
                            }
                            let customId: string | undefined = undefined;
                            if (schema && schema.primaryKey && payload[schema.primaryKey]) {
                                customId = String(payload[schema.primaryKey]);
                            }
                            const res = await adminCreateDoc(selectedCollection, payload, customId);
                            if (res.success) successCount++;
                        }

                        showToast({
                            title: "Import hoàn tất",
                            body: `Đã import ${successCount}/${jsonData.length} dòng`,
                            type: 'success'
                        });
                        fetchData();
                        setLoading(false);
                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    }
                });
            } catch (err) {
                console.error(err);
                showToast({ title: "Lỗi", body: "Lỗi đọc file Excel", type: 'error' });
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSyncAuth = async () => {
        if (selectedCollection !== 'employees') return;

        setConfirmDialog({
            isOpen: true,
            title: "Đồng bộ tài khoản (Auth)",
            message: `Bạn đang chuẩn bị tạo tài khoản Đăng Nhập cho ${data.length} nhân viên (bỏ qua nếu đã có). Tiếp tục?`,
            onConfirm: async () => {
                setLoading(true);
                let successCount = 0;
                let existCount = 0;
                let failCount = 0;

                for (const emp of data) {
                    let currentItem = { ...emp };

                    if (!currentItem.email && currentItem.name) {
                        currentItem.email = generateEmailFromName(currentItem.name);
                        try {
                            // Save automatically generated email back to Firestore
                            await adminUpdateDoc('employees', String(currentItem.id), { email: currentItem.email });
                        } catch (e) {
                            // ignore
                        }
                    }

                    if (!currentItem.password) continue;
                    try {
                        // The user requested: "mật khẩu lưu vào trường password của db employees". 
                        // So we use whatever currentItem.password holds (which is whatever is saved in Firestore)
                        // to initialize their Auth credentials. This requires employee passwords to be at least 6 digits in Firestore.
                        // We use the generated/assigned email for Auth Registration! Note: currentItem.password may be hashed if it was already synced text -> hash. 
                        // If doing Sync Auth on an ALREADY hashed DB, Auth password will become the literal hash string. 
                        // It is assumed Sync Auth is mostly run after explicit resets.
                        await createUserWithEmailAndPassword(secondaryAuth, currentItem.email, String(currentItem.password));
                        successCount++;
                    } catch (error: any) {
                        if (error.code === 'auth/email-already-in-use') {
                            existCount++;
                        } else {
                            console.error("Lỗi tạo user:", emp.email, error);
                            failCount++;
                        }
                    }
                }

                showToast({
                    title: "Đồng bộ hoàn tất",
                    body: `Mới: ${successCount}, Đã có: ${existCount}, Lỗi: ${failCount}. Mật khẩu mặc định là MNV+123.`,
                    type: 'success'
                });
                setLoading(false);
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const resolveDisplayValue = (key: string, val: any) => {
        if (val === null || val === undefined) return '';

        const schema = SCHEMAS[selectedCollection];
        const fieldConfig = schema?.fields?.[key];

        if (fieldConfig?.type === 'date') {
            return formatDateString(String(val));
        }

        if (fieldConfig?.type === 'time') {
            return formatTimeString(String(val));
        }

        if (fieldConfig?.type === 'reference') {
            if (key === 'employee_id') return val;
            const refList = references[fieldConfig.collection];
            if (refList) {
                const match = refList.find((r: any) => String(r[fieldConfig.valueField]) === String(val));
                if (match) return match[fieldConfig.labelField];
            }
        }
        return val;
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processedData = useMemo(() => {
        let res = [...data];
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            res = res.filter(item => JSON.stringify(item).toLowerCase().includes(lowerTerm));
        }
        if (sortConfig) {
            res.sort((a, b) => {
                const valA = resolveDisplayValue(sortConfig.key, a[sortConfig.key]);
                const valB = resolveDisplayValue(sortConfig.key, b[sortConfig.key]);
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return res;
    }, [data, searchTerm, sortConfig, selectedCollection, references]);

    const itemsPerPageNum = itemsPerPage;
    const totalPages = Math.ceil(processedData.length / itemsPerPageNum);
    const paginatedData = processedData.slice((currentPage - 1) * itemsPerPageNum, currentPage * itemsPerPageNum);

    const getOrderedHeaders = () => {
        const schema = SCHEMAS[selectedCollection];
        if (schema && schema.headers) return schema.headers;
        return data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'id') : [];
    };
    const headers = getOrderedHeaders();

    const renderFormFields = () => {
        const schema = SCHEMAS[selectedCollection];
        const fieldsToRender = schema?.fields ? Object.keys(schema.fields) : headers;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fieldsToRender.map((key: string) => {
                    const fieldConfig = schema?.fields?.[key] || { label: key, type: 'text', colSpan: 1 };
                    const val = formData[key];
                    const colSpanClass = fieldConfig.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1';

                    let inputEl;
                    const commonClasses = "block w-full rounded-xl border-0 px-4 py-3 text-neutral-black dark:text-neutral-white ring-1 ring-inset ring-slate-200 dark:ring-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-primary transition-all bg-neutral-white dark:bg-neutral-black/50 font-medium";

                    if (fieldConfig.type === 'select') {
                        inputEl = (
                            <select
                                className={commonClasses}
                                value={val || ''}
                                onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                            >
                                <option value="">-- Chọn --</option>
                                {fieldConfig.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        );
                    } else if (fieldConfig.type === 'reference') {
                        const refData = references[fieldConfig.collection] || [];
                        inputEl = (
                            <select
                                className={commonClasses}
                                value={val || ''}
                                onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                            >
                                <option value="">-- Chọn --</option>
                                {refData.map((item: any) => (
                                    <option key={item.id} value={item[fieldConfig.valueField]}>
                                        {item[fieldConfig.labelField]} ({item[fieldConfig.valueField]})
                                    </option>
                                ))}
                            </select>
                        );
                    } else if (fieldConfig.type === 'multi-select') {
                        const refData = references[fieldConfig.collection] || [];
                        const selected = Array.isArray(val) ? val : [];
                        inputEl = (
                            <MultiSelectTags
                                selected={selected}
                                options={refData}
                                labelField={fieldConfig.labelField}
                                valueField={fieldConfig.valueField}
                                onAdd={(v) => {
                                    if (!selected.includes(v)) {
                                        setFormData({ ...formData, [key]: [...selected, v] });
                                    }
                                }}
                                onRemove={(v) => {
                                    setFormData({ ...formData, [key]: selected.filter(x => x !== v) });
                                }}
                            />
                        );
                    } else if (fieldConfig.type === 'textarea') {
                        inputEl = (
                            <textarea
                                rows={3}
                                className={commonClasses}
                                value={val || ''}
                                onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                                placeholder={fieldConfig.placeholder || ''}
                            />
                        );
                    } else {
                        inputEl = (
                            <input
                                type={fieldConfig.type || 'text'}
                                className={commonClasses}
                                value={typeof val === 'object' ? JSON.stringify(val) : (fieldConfig.type === 'time' ? formatTimeString(val) : (val || ''))}
                                onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                                placeholder={fieldConfig.placeholder || ''}
                                disabled={fieldConfig.disabled}
                            />
                        );
                    }

                    return (
                        <div key={key} className={colSpanClass}>
                            <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase mb-1.5 tracking-wide">
                                {fieldConfig.label || key} {fieldConfig.required && <span className="text-secondary-red">*</span>}
                            </label>
                            {inputEl}
                        </div>
                    )
                })}
            </div>
        )
    };

    const renderStatusBadge = (key: string, val: any) => {
        const displayVal = resolveDisplayValue(key, val);
        if (key === 'status') {
            if (val === 'Active' || val === 'Valid' || val === 'Approved') {
                return <span className="inline-flex items-center rounded-md bg-secondary-green/10 px-2 py-0.5 text-xxs font-extrabold text-secondary-green ring-1 ring-inset ring-secondary-green/20 uppercase tracking-wide">{displayVal}</span>
            }
            if (val === 'Inactive' || val === 'Rejected' || val === 'Invalid') {
                return <span className="inline-flex items-center rounded-md bg-secondary-red/10 px-2 py-0.5 text-xxs font-extrabold text-secondary-red ring-1 ring-inset ring-secondary-red/20 uppercase tracking-wide">{displayVal}</span>
            }
            if (val === 'Pending') {
                return <span className="inline-flex items-center rounded-md bg-secondary-orange/10 px-2 py-0.5 text-xxs font-extrabold text-secondary-orange ring-1 ring-inset ring-secondary-orange/20 uppercase tracking-wide">{displayVal}</span>
            }
            if (val === 'Late') {
                return <span className="inline-flex items-center rounded-md bg-secondary-yellow/10 px-2 py-0.5 text-xxs font-extrabold text-secondary-yellow ring-1 ring-inset ring-secondary-yellow/20 uppercase tracking-wide">{displayVal}</span>
            }
        }
        return <span className="text-sm font-medium text-neutral-black dark:text-neutral-white">{displayVal}</span>;
    }

    return (
        <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-300">
            <div className="w-72 bg-neutral-black text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 z-20 hidden md:flex">
                <div className="p-6 flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-neutral-white font-black">A</div>
                    <div>
                        <h1 className="font-black text-neutral-white tracking-wide text-lg leading-none">Army Admin</h1>
                        <p className="text-xxs text-slate-500 font-extrabold uppercase tracking-widest mt-1">Management System</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
                    <div className="px-3 py-2 text-xxs font-extrabold text-slate-500 uppercase tracking-widest mt-2">Dữ liệu</div>
                    {COLLECTIONS.map(col => (
                        <button key={col.id} onClick={() => setSelectedCollection(col.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${selectedCollection === col.id ? 'bg-primary text-neutral-white' : 'hover:bg-neutral-black/80 hover:text-neutral-white text-slate-400'}`}>
                            <i className={`fa-solid ${col.icon} w-5 text-center`}></i>
                            {col.name}
                        </button>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-800 mt-auto bg-neutral-black">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-neutral-white">
                            {user.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-neutral-white truncate">{user.name}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Administrator</p>
                        </div>
                    </div>
                    <button onClick={onBackToApp} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-neutral-white hover:bg-neutral-black/80 transition-colors text-sm font-bold mb-1 uppercase tracking-wide">
                        <i className="fa-solid fa-mobile-screen w-5 text-center"></i> Về Ứng dụng
                    </button>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-secondary-red/80 hover:text-secondary-red hover:bg-secondary-red/10 transition-colors text-sm font-bold uppercase tracking-wide">
                        <i className="fa-solid fa-right-from-bracket w-5 text-center"></i> Đăng xuất
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 relative bg-slate-50/50 dark:bg-neutral-black/50">
                <header className="h-20 bg-neutral-white/80 dark:bg-neutral-black/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-10 sticky top-0 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="md:hidden w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-neutral-white font-black">A</div>
                        <h2 className="text-2xl font-black text-neutral-black dark:text-neutral-white flex items-center gap-3 tracking-tight">
                            {COLLECTIONS.find(c => c.id === selectedCollection)?.name}
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-lg text-xs font-extrabold border border-slate-200 dark:border-slate-700 uppercase tracking-wide">{processedData.length} records</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {selectedIds.size > 0 && (
                            <button onClick={handleBulkDelete} className="bg-secondary-red/10 text-secondary-red border border-secondary-red/20 px-5 py-3 rounded-xl text-sm font-extrabold hover:bg-secondary-red/20 flex items-center gap-2 transition-all animate-scale-in uppercase tracking-wide">
                                <i className="fa-solid fa-trash-can"></i> <span className="hidden md:inline">Xóa {selectedIds.size} mục</span>
                            </button>
                        )}

                        <div className="relative group hidden md:block">
                            <i className="fa-solid fa-search absolute left-4 top-3 text-slate-400 dark:text-slate-500 text-sm group-focus-within:text-primary transition-colors"></i>
                            <input type="text" placeholder="Tìm kiếm..."
                                className="pl-10 pr-10 py-2.5 bg-neutral-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium w-64 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-neutral-black dark:text-neutral-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>

                        <div className="flex items-center bg-neutral-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 hidden md:flex">
                            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl flex items-center gap-1 transition-colors uppercase tracking-wide">
                                <i className="fa-solid fa-file-import text-primary"></i> Import
                            </button>
                            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <button onClick={handleExport} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl flex items-center gap-1 transition-colors uppercase tracking-wide">
                                <i className="fa-solid fa-file-excel text-secondary-green"></i> Export
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                        </div>

                        {selectedCollection === 'employees' && (
                            <button onClick={handleSyncAuth} className="bg-indigo-600 text-neutral-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 ml-2 transition-all active:scale-95 uppercase tracking-wide shadow-md shadow-indigo-500/30">
                                <i className="fa-solid fa-cloud-arrow-up"></i> <span className="hidden md:inline">Cấp Auth</span>
                            </button>
                        )}

                        <button onClick={handleCreate} className="bg-primary text-neutral-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-primary/90 flex items-center gap-2 ml-2 transition-all active:scale-95 uppercase tracking-wide shadow-md shadow-primary/30">
                            <i className="fa-solid fa-plus"></i> <span className="hidden md:inline">Tạo mới</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden p-6 flex flex-col">
                    <div key={selectedCollection} className="bg-neutral-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 flex flex-col overflow-hidden relative transition-all duration-300 animate-slide-up">
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-neutral-white/60 dark:bg-neutral-black/60 z-30 backdrop-blur-sm">
                                    <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 dark:border-slate-700 border-t-primary"></div>
                                </div>
                            )}

                            <table className="w-full text-left border-collapse table-auto md:w-full">
                                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-20">
                                    <tr>
                                        <th className="px-6 py-4 w-14 border-b border-slate-200 dark:border-slate-700">
                                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary cursor-pointer accent-primary bg-neutral-white dark:bg-slate-700"
                                                checked={paginatedData.length > 0 && paginatedData.every(item => selectedIds.has(String(item.id)))} onChange={toggleSelectAll} />
                                        </th>
                                        <th className="px-4 py-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase w-28 border-b border-slate-200 dark:border-slate-700 tracking-wide">Thao tác</th>
                                        {headers.map((h: string) => {
                                            const schema = SCHEMAS[selectedCollection];
                                            const label = schema?.fields?.[h]?.label || h.replace(/_/g, ' ');
                                            return (
                                                <th key={h} onClick={() => handleSort(h)} className="px-6 py-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-200 dark:border-slate-700 group select-none tracking-wide">
                                                    <div className="flex items-center gap-2">
                                                        {label}
                                                        {sortConfig?.key === h ? (
                                                            <i className={`fa-solid fa-arrow-${sortConfig!.direction === 'asc' ? 'up' : 'down'} text-primary`}></i>
                                                        ) : (
                                                            <i className="fa-solid fa-sort text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                                        )}
                                                    </div>
                                                </th>
                                            )
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {paginatedData.map((item, idx) => (
                                        <tr key={item.id || idx} onClick={() => handleEdit(item)} className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer ${selectedIds.has(item.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                            <td className="px-6 py-4 border-b border-transparent dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary cursor-pointer accent-primary bg-neutral-white dark:bg-slate-700"
                                                    checked={selectedIds.has(item.id)} onChange={(e) => toggleSelectOne(String(item.id), e.target.checked)} />
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap border-b border-transparent dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(item)} className="w-10 h-10 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors">
                                                        <i className="fa-solid fa-pen text-sm"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(String(item.id))} className="w-10 h-10 rounded-lg bg-secondary-red/10 text-secondary-red hover:bg-secondary-red/20 flex items-center justify-center transition-colors">
                                                        <i className="fa-solid fa-trash text-sm"></i>
                                                    </button>
                                                </div>
                                            </td>
                                            {headers.map((h: string) => (
                                                <td key={h} className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap md:whitespace-normal max-w-xs md:max-w-md truncate md:overflow-visible border-b border-transparent dark:border-slate-800 group-hover:border-slate-100 dark:group-hover:border-slate-700/50">
                                                    {h === 'password' ? '••••••' : renderStatusBadge(h, item[h])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={headers.length + 2} className="text-center py-20">
                                                <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                                                    <i className="fa-regular fa-folder-open text-4xl mb-3 opacity-50"></i>
                                                    <span className="text-sm font-medium">Không tìm thấy dữ liệu</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-neutral-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between z-20 transition-colors">
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold px-2 tracking-wide">
                                Hiển thị <span className="font-extrabold text-neutral-black dark:text-neutral-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, processedData.length)}</span> trong <span className="font-extrabold text-neutral-black dark:text-neutral-white">{processedData.length}</span> kết quả
                            </div>

                            <div className="flex items-center gap-4">
                                <select
                                    className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg py-2 pl-3 pr-8 outline-none focus:ring-primary cursor-pointer"
                                    value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                >
                                    <option value={10}>10 / trang</option>
                                    <option value={20}>20 / trang</option>
                                    <option value={50}>50 / trang</option>
                                    <option value={100}>100 / trang</option>
                                </select>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                        className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                    >
                                        <i className="fa-solid fa-chevron-left text-sm"></i>
                                    </button>
                                    <span className="px-3 text-xs font-bold text-slate-700 dark:text-slate-300">Trang {currentPage}</span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
                                        className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                    >
                                        <i className="fa-solid fa-chevron-right text-sm"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-neutral-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-neutral-white dark:bg-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-scale-in shadow-2xl">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 rounded-t-xl">
                            <div>
                                <h3 className="text-xl font-black text-neutral-black dark:text-neutral-white tracking-tight">{editingItem ? 'Cập nhật thông tin' : 'Thêm mới bản ghi'}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase tracking-wide">{COLLECTIONS.find(c => c.id === selectedCollection)?.name}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-neutral-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-300 hover:text-neutral-black dark:hover:text-neutral-white hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center justify-center transition-colors">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            {renderFormFields()}
                        </div>

                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-xl text-base font-bold text-slate-600 dark:text-slate-300 bg-neutral-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all uppercase tracking-wide">
                                Hủy bỏ
                            </button>
                            <button onClick={handleSave} className="px-8 py-4 rounded-xl text-base font-bold bg-primary text-neutral-white hover:bg-primary/90 transition-all active:scale-95 uppercase tracking-wide shadow-sm">
                                {editingItem ? 'Lưu thay đổi' : 'Tạo mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel="Xác nhận"
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                type="danger"
                isLoading={loading}
            />
        </div>
    );
};

export default AdminPanel;