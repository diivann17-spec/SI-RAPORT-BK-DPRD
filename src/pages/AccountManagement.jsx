import React, { useState, useEffect } from 'react';
import { authService } from '../firebase/authService';
import { useAttendance } from '../context/AttendanceContext';
import {
  createAccount,
  updateAccount,
  deactivateAccount,
  reactivateAccount,
  suspendAccount,
  fetchAllAccounts,
  resetAccountPassword,
  ACCOUNT_STATUS,
  ACCOUNT_ROLES
} from '../firebase/accountService';
import {
  Plus,
  Trash2,
  RotateCcw,
  Lock,
  Unlock,
  Edit2,
  X,
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

/**
 * ADMIN ACCOUNT MANAGEMENT PANEL - SI-RAPORT BK DPRD
 * 
 * Fitur:
 * - Membuat akun baru (whitelist)
 * - Edit data akun
 * - Reset password
 * - Deactivate/Reactivate akun
 * - Suspend akun (tindakan disipliner)
 * - Hapus akun (hard delete - testing only)
 * - Audit trail lengkap
 * 
 * Akses: Hanya SECRETARIAT_ADMIN dan PETUGAS_BK
 */
export default function AccountManagement() {
  const { currentRole } = useAttendance();
  const currentSession = authService.getSession();
  const canManageAccounts = authService.hasPermission('MANAGE_ACCOUNTS') ||
    currentRole === 'SECRETARIAT_ADMIN' ||
    currentRole === 'PETUGAS_BK';

  // State Management
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');

  // Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'PETUGAS_SCAN',
    status: 'ACTIVE',
    department: '',
    memberId: '',
    notes: ''
  });

  // Feedback State
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load accounts on mount
  useEffect(() => {
    if (canManageAccounts) {
      loadAccounts();
    }
  }, [canManageAccounts]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await fetchAllAccounts();
      setAccounts(data);
      setMessage({ type: '', text: '' });
    } catch (error) {
      console.error('Error loading accounts:', error);
      setMessage({
        type: 'error',
        text: 'Gagal memuat data akun. Silakan coba lagi.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validasi
    const missingIdentifier = formData.role === ACCOUNT_ROLES.MEMBER
      ? !formData.memberId
      : !formData.username;

    if (missingIdentifier || !formData.fullName || !formData.role) {
      setMessage({
        type: 'error',
        text: 'Username atau ID Anggota, nama lengkap, dan role wajib diisi.'
      });
      return;
    }

    if (!editingId && !formData.password) {
      setMessage({
        type: 'error',
        text: 'Password wajib diisi untuk akun baru.'
      });
      return;
    }

    try {
      if (editingId) {
        // Update akun
        const updateData = {
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          department: formData.department,
          memberId: formData.memberId || null,
          notes: formData.notes
        };

        await updateAccount(editingId, updateData, currentSession.accountId);
        setMessage({
          type: 'success',
          text: `Akun "${formData.fullName}" berhasil diperbarui.`
        });
      } else {
        // Buat akun baru
        await createAccount(formData, currentSession.accountId);
        setMessage({
          type: 'success',
          text: `Akun "${formData.fullName}" berhasil dibuat.`
        });
      }

      // Reset form
      resetForm();
      setShowCreateForm(false);
      loadAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Gagal menyimpan akun. Silakan coba lagi.'
      });
    }
  };

  const handleEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      username: account.username,
      password: '', // Don't pre-fill password
      fullName: account.fullName,
      email: account.email || '',
      role: account.role,
      status: account.status,
      department: account.department || '',
      memberId: account.memberId || '',
      notes: account.notes || ''
    });
    setShowCreateForm(true);
  };

  const handleDeactivate = async (accountId, accountName) => {
    if (!window.confirm(`Nonaktifkan akun "${accountName}"? Pengguna tidak akan bisa login.`)) {
      return;
    }

    try {
      await deactivateAccount(accountId, currentSession.accountId, 'Deactivated by admin');
      setMessage({
        type: 'success',
        text: `Akun "${accountName}" berhasil dinonaktifkan.`
      });
      loadAccounts();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Gagal menonaktifkan akun. Silakan coba lagi.'
      });
    }
  };

  const handleReactivate = async (accountId, accountName) => {
    if (!window.confirm(`Aktifkan kembali akun "${accountName}"?`)) {
      return;
    }

    try {
      await reactivateAccount(accountId, currentSession.accountId);
      setMessage({
        type: 'success',
        text: `Akun "${accountName}" berhasil diaktifkan kembali.`
      });
      loadAccounts();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Gagal mengaktifkan kembali akun. Silakan coba lagi.'
      });
    }
  };

  const handleSuspend = async (accountId, accountName) => {
    const reason = prompt(`Alasan suspend akun "${accountName}":`);
    if (reason === null) return;

    try {
      await suspendAccount(accountId, currentSession.accountId, reason);
      setMessage({
        type: 'success',
        text: `Akun "${accountName}" berhasil disuspend.`
      });
      loadAccounts();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Gagal mensuspend akun. Silakan coba lagi.'
      });
    }
  };

  const handleResetPassword = async (accountId, accountName) => {
    const newPassword = prompt(`Masukkan password baru untuk "${accountName}":`);
    if (newPassword === null) return;

    if (!newPassword.trim()) {
      alert('Password tidak boleh kosong.');
      return;
    }

    try {
      await resetAccountPassword(accountId, newPassword, currentSession.accountId);
      setMessage({
        type: 'success',
        text: `Password akun "${accountName}" berhasil direset.`
      });
      loadAccounts();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Gagal mereset password. Silakan coba lagi.'
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      email: '',
      role: 'PETUGAS_SCAN',
      status: 'ACTIVE',
      department: '',
      memberId: '',
      notes: ''
    });
  };

  // Filter accounts secara aman
  const filteredAccounts = accounts.filter(account => {
    const uName = String(account?.username || '').toLowerCase();
    const fName = String(account?.fullName || '').toLowerCase();
    const mail = String(account?.email || '').toLowerCase();
    const mId = String(account?.memberId || '').toLowerCase();
    const term = (searchTerm || '').trim().toLowerCase();

    const matchSearch = !term || uName.includes(term) || fName.includes(term) || mail.includes(term) || mId.includes(term);
    const matchStatus = filterStatus === 'ALL' || account?.status === filterStatus;
    const matchRole = filterRole === 'ALL' || account?.role === filterRole;

    return matchSearch && matchStatus && matchRole;
  });

  // Authorization check
  if (!canManageAccounts) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Akses Ditolak</p>
            <p className="text-sm mt-1">Anda tidak memiliki izin untuk mengelola akun.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-black text-white mb-2">Manajemen Akun</h1>
          <p className="text-slate-400 text-sm">
            Kelola whitelist akun terdaftar, reset password, dan kontrol akses pengguna.
          </p>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`p-4 rounded-lg border flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/50 border-rose-800 text-rose-300'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Edit Akun' : 'Buat Akun Baru'}
              </h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateForm(false);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Username*</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="username"
                  disabled={!!editingId}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Kata Sandi {editingId ? '(kosongkan jika tidak diubah)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nama Lengkap*</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nama lengkap pengguna"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Role*</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500 outline-none"
                >
                  <option value="SECRETARIAT_ADMIN">Admin Sekretariat DPRD</option>
                  <option value="PETUGAS_BK">Petugas Badan Kehormatan (BK)</option>
                  <option value="PETUGAS_SCAN">Operator Laptop Presensi</option>
                  <option value="ANGGOTA_DPRD">Anggota Dewan (DPRD)</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500 outline-none"
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Tidak Aktif</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Departemen</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Departemen"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Member ID */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">ID Anggota DPRD</label>
                <input
                  type="text"
                  value={formData.memberId}
                  onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  placeholder="ID Anggota (opsional)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan atau keterangan tambahan..."
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(false);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold transition"
                >
                  {editingId ? 'Perbarui Akun' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filter */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari username, nama, atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadAccounts}
                disabled={isLoading}
                title="Muat ulang data akun"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Refresh</span>
              </button>

              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Buat Akun Baru
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:border-emerald-500 outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Tidak Aktif</option>
              <option value="SUSPENDED">Disuspend</option>
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:border-emerald-500 outline-none"
            >
              <option value="ALL">Semua Role</option>
              <option value="SECRETARIAT_ADMIN">Admin</option>
              <option value="PETUGAS_BK">BK Staff</option>
              <option value="PETUGAS_SCAN">Scan Operator</option>
              <option value="ANGGOTA_DPRD">Anggota</option>
            </select>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-300">Username</th>
                <th className="px-4 py-3 text-left font-bold text-slate-300">Nama Lengkap</th>
                <th className="px-4 py-3 text-left font-bold text-slate-300">Role</th>
                <th className="px-4 py-3 text-left font-bold text-slate-300">Status</th>
                <th className="px-4 py-3 text-left font-bold text-slate-300">Login Terakhir</th>
                <th className="px-4 py-3 text-center font-bold text-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                    Memuat data akun...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                    Tidak ada akun yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(account => (
                  <tr key={account.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-4 py-3 font-mono text-emerald-400">{account.username}</td>
                    <td className="px-4 py-3">{account.fullName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-semibold">
                        {account.role === 'SECRETARIAT_ADMIN' && 'Admin'}
                        {account.role === 'PETUGAS_BK' && 'BK'}
                        {account.role === 'PETUGAS_SCAN' && 'Scan Op'}
                        {account.role === 'ANGGOTA_DPRD' && 'Anggota'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-semibold ${
                        account.status === 'ACTIVE'
                          ? 'bg-emerald-900/50 text-emerald-300'
                          : account.status === 'SUSPENDED'
                          ? 'bg-rose-900/50 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {account.status === 'ACTIVE' && '✓ Aktif'}
                        {account.status === 'INACTIVE' && 'Nonaktif'}
                        {account.status === 'SUSPENDED' && '⛔ Disuspend'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {account.lastLoginAt
                        ? new Date(account.lastLoginAt.toDate?.() || account.lastLoginAt).toLocaleDateString('id-ID')
                        : 'Belum pernah login'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-1.5 hover:bg-slate-800 rounded transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-400" />
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => handleResetPassword(account.id, account.fullName)}
                          className="p-1.5 hover:bg-slate-800 rounded transition"
                          title="Reset Password"
                        >
                          <RotateCcw className="w-4 h-4 text-slate-400 hover:text-amber-400" />
                        </button>

                        {/* Deactivate/Reactivate */}
                        {account.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleDeactivate(account.id, account.fullName)}
                            className="p-1.5 hover:bg-slate-800 rounded transition"
                            title="Nonaktifkan"
                          >
                            <Lock className="w-4 h-4 text-slate-400 hover:text-rose-400" />
                          </button>
                        ) : account.status === 'INACTIVE' ? (
                          <button
                            onClick={() => handleReactivate(account.id, account.fullName)}
                            className="p-1.5 hover:bg-slate-800 rounded transition"
                            title="Aktifkan"
                          >
                            <Unlock className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
                          </button>
                        ) : null}

                        {/* Suspend/Unsuspend */}
                        {account.status !== 'SUSPENDED' && (
                          <button
                            onClick={() => handleSuspend(account.id, account.fullName)}
                            className="p-1.5 hover:bg-slate-800 rounded transition"
                            title="Suspend"
                          >
                            <AlertCircle className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800">
          <div className="p-4 bg-slate-900 rounded-lg text-center">
            <p className="text-slate-400 text-xs font-semibold mb-1">Total Akun</p>
            <p className="text-2xl font-black text-emerald-400">{accounts.length}</p>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg text-center">
            <p className="text-slate-400 text-xs font-semibold mb-1">Aktif</p>
            <p className="text-2xl font-black text-emerald-400">
              {accounts.filter(a => a.status === 'ACTIVE').length}
            </p>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg text-center">
            <p className="text-slate-400 text-xs font-semibold mb-1">Nonaktif</p>
            <p className="text-2xl font-black text-amber-400">
              {accounts.filter(a => a.status === 'INACTIVE').length}
            </p>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg text-center">
            <p className="text-slate-400 text-xs font-semibold mb-1">Disuspend</p>
            <p className="text-2xl font-black text-rose-400">
              {accounts.filter(a => a.status === 'SUSPENDED').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
