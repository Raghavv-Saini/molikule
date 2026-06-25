import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Navbar } from '../components/Navbar';
import * as usersService from '../services/users';
import type { User } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

const EMPLOYEE_ID_RE = /^\d{6}$/;

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const msg = err.response?.data?.message as string | undefined;
    if (status === 409) return msg ?? 'An employee with that ID already exists.';
    if (status === 404) return msg ?? 'User not found.';
    if (msg) return msg;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── sub-components ─────────────────────────────────────────────────────────

interface ResetPasswordDialogProps {
  user: User;
  onConfirm: (newPassword: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

function ResetPasswordDialog({
  user,
  onConfirm,
  onCancel,
  isLoading,
  error,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [localError, setLocalError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword.trim()) {
      setLocalError('New password is required.');
      return;
    }
    setLocalError('');
    onConfirm(newPassword);
  }

  return (
    <div style={dialogStyles.overlay} role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title">
      <div style={dialogStyles.box}>
        <h2 id="reset-dialog-title" style={dialogStyles.title}>
          Reset Password
        </h2>
        <p style={dialogStyles.subtitle}>
          Set a new password for <strong>{user.name}</strong> ({user.employee_id}).
        </p>
        <form onSubmit={handleSubmit}>
          <div style={dialogStyles.fieldGroup}>
            <label htmlFor="new-password" style={dialogStyles.label}>
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={dialogStyles.input}
              autoFocus
              disabled={isLoading}
            />
            {(localError || error) && (
              <span style={dialogStyles.fieldError}>{localError || error}</span>
            )}
          </div>
          <div style={dialogStyles.actions}>
            <button type="button" onClick={onCancel} style={dialogStyles.cancelBtn} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" style={dialogStyles.confirmBtn} disabled={isLoading}>
              {isLoading ? 'Saving…' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteConfirmDialogProps {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

function DeleteConfirmDialog({
  user,
  onConfirm,
  onCancel,
  isLoading,
  error,
}: DeleteConfirmDialogProps) {
  return (
    <div style={dialogStyles.overlay} role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
      <div style={dialogStyles.box}>
        <h2 id="delete-dialog-title" style={dialogStyles.title}>
          Delete User
        </h2>
        <p style={dialogStyles.subtitle}>
          Are you sure you want to permanently delete{' '}
          <strong>{user.name}</strong> ({user.employee_id})? This action cannot
          be undone.
        </p>
        {error && <p style={dialogStyles.errorText}>{error}</p>}
        <div style={dialogStyles.actions}>
          <button type="button" onClick={onCancel} style={dialogStyles.cancelBtn} disabled={isLoading}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} style={dialogStyles.deleteBtn} disabled={isLoading}>
            {isLoading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── create user form ────────────────────────────────────────────────────────

interface CreateUserFormProps {
  onSuccess: () => void;
}

function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      usersService.createUser({ employee_id: employeeId, name, password, role }),
    onSuccess: () => {
      onSuccess();
      setEmployeeId('');
      setName('');
      setPassword('');
      setRole('user');
      setFieldErrors({});
      setServerError(null);
    },
    onError: (err: unknown) => {
      setServerError(getErrorMessage(err));
    },
  });

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!EMPLOYEE_ID_RE.test(employeeId)) {
      errors.employeeId = 'Employee ID must be exactly 6 digits.';
    }
    if (!name.trim()) {
      errors.name = 'Name is required.';
    }
    if (!password.trim()) {
      errors.password = 'Password is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    mutation.mutate();
  }

  return (
    <div style={styles.createFormCard}>
      <h2 style={styles.sectionTitle}>Create New User</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div style={styles.formRow}>
          {/* Employee ID */}
          <div style={styles.fieldGroup}>
            <label htmlFor="create-employee-id" style={styles.label}>
              Employee ID
            </label>
            <input
              id="create-employee-id"
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. 123456"
              maxLength={6}
              style={{
                ...styles.input,
                ...(fieldErrors.employeeId ? styles.inputError : {}),
              }}
              aria-describedby={fieldErrors.employeeId ? 'create-empid-error' : undefined}
              disabled={mutation.isPending}
            />
            {fieldErrors.employeeId && (
              <span id="create-empid-error" style={styles.fieldError}>
                {fieldErrors.employeeId}
              </span>
            )}
          </div>

          {/* Name */}
          <div style={styles.fieldGroup}>
            <label htmlFor="create-name" style={styles.label}>
              Name
            </label>
            <input
              id="create-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              style={{
                ...styles.input,
                ...(fieldErrors.name ? styles.inputError : {}),
              }}
              aria-describedby={fieldErrors.name ? 'create-name-error' : undefined}
              disabled={mutation.isPending}
            />
            {fieldErrors.name && (
              <span id="create-name-error" style={styles.fieldError}>
                {fieldErrors.name}
              </span>
            )}
          </div>

          {/* Role */}
          <div style={styles.fieldGroup}>
            <label htmlFor="create-role" style={styles.label}>
              Role
            </label>
            <select
              id="create-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              style={styles.select}
              disabled={mutation.isPending}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label htmlFor="create-password" style={styles.label}>
              Initial Password
            </label>
            <input
              id="create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{
                ...styles.input,
                ...(fieldErrors.password ? styles.inputError : {}),
              }}
              aria-describedby={fieldErrors.password ? 'create-password-error' : undefined}
              disabled={mutation.isPending}
            />
            {fieldErrors.password && (
              <span id="create-password-error" style={styles.fieldError}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Submit */}
          <div style={styles.fieldGroupSubmit}>
            <button
              type="submit"
              style={styles.createBtn}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </div>

        {serverError && (
          <div role="alert" style={styles.errorBanner}>
            {serverError}
          </div>
        )}

        {mutation.isSuccess && (
          <div role="status" style={styles.successBanner}>
            User created successfully.
          </div>
        )}
      </form>
    </div>
  );
}

// ─── users table ─────────────────────────────────────────────────────────────

interface UsersTableProps {
  users: User[];
}

function UsersTable({ users }: UsersTableProps) {
  const queryClient = useQueryClient();

  // Dialog state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
      setDeleteError(null);
    },
    onError: (err: unknown) => {
      setDeleteError(getErrorMessage(err));
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      usersService.resetPassword(id, newPassword),
    onSuccess: () => {
      setResetTarget(null);
      setResetError(null);
    },
    onError: (err: unknown) => {
      setResetError(getErrorMessage(err));
    },
  });

  function openDeleteDialog(user: User) {
    setDeleteError(null);
    setDeleteTarget(user);
  }

  function openResetDialog(user: User) {
    setResetError(null);
    setResetTarget(user);
  }

  return (
    <>
      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          user={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          isLoading={deleteMutation.isPending}
          error={deleteError}
        />
      )}

      {/* Reset password dialog */}
      {resetTarget && (
        <ResetPasswordDialog
          user={resetTarget}
          onConfirm={(newPassword) =>
            resetMutation.mutate({ id: resetTarget.id, newPassword })
          }
          onCancel={() => {
            setResetTarget(null);
            setResetError(null);
          }}
          isLoading={resetMutation.isPending}
          error={resetError}
        />
      )}

      <div style={styles.tableWrapper}>
        <table style={styles.table} aria-label="User list">
          <thead>
            <tr>
              <th style={styles.th}>Employee ID</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Created</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} style={styles.emptyRow}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>
                    <code style={styles.code}>{user.employee_id}</code>
                  </td>
                  <td style={styles.td}>{user.name}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.roleBadge,
                        ...(user.role === 'admin'
                          ? styles.roleBadgeAdmin
                          : styles.roleBadgeUser),
                      }}
                    >
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDate(user.created_at)}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={styles.actionGroup}>
                      <button
                        type="button"
                        onClick={() => openResetDialog(user)}
                        style={styles.actionBtn}
                        aria-label={`Reset password for ${user.name}`}
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteDialog(user)}
                        style={styles.deleteActionBtn}
                        aria-label={`Delete user ${user.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── main page content ───────────────────────────────────────────────────────

function UserManagementContent() {
  const { data: users, isLoading, isError, error } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: usersService.listUsers,
  });

  const queryClient = useQueryClient();

  function handleUserCreated() {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }

  return (
    <div style={styles.page}>
      <Navbar />

      <main style={styles.main}>
        <h1 style={styles.pageTitle}>User Management</h1>

        {/* Create user form */}
        <CreateUserForm onSuccess={handleUserCreated} />

        {/* User list */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Users</h2>

          {isLoading && (
            <div role="status" aria-live="polite" style={styles.loadingState}>
              Loading users…
            </div>
          )}

          {isError && error && (
            <div role="alert" style={styles.errorBanner}>
              Failed to load users: {getErrorMessage(error)}
            </div>
          )}

          {!isLoading && !isError && users && (
            <UsersTable users={users} />
          )}
        </div>
      </main>
    </div>
  );
}

// ─── export ──────────────────────────────────────────────────────────────────

export function UserManagement() {
  return (
    <ProtectedRoute requiredRole="admin">
      <UserManagementContent />
    </ProtectedRoute>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f4f3f5',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    maxWidth: '1280px',
    width: '100%',
    margin: '0 auto',
    padding: '24px 24px 48px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#08060d',
    margin: '0 0 4px 0',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#08060d',
    margin: '0 0 16px 0',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '6px',
    padding: '20px 24px',
  },
  createFormCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '6px',
    padding: '20px 24px',
  },
  formRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '16px',
    alignItems: 'flex-end',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    minWidth: '160px',
    flex: '1 1 160px',
  },
  fieldGroupSubmit: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-end',
    flex: '0 0 auto',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b6375',
    letterSpacing: '0.3px',
  },
  input: {
    height: '34px',
    padding: '0 10px',
    fontSize: '13px',
    color: '#08060d',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '5px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    width: '100%',
  },
  inputError: {
    borderColor: '#c0392b',
  },
  select: {
    height: '34px',
    padding: '0 10px',
    fontSize: '13px',
    color: '#08060d',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '5px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  fieldError: {
    fontSize: '12px',
    color: '#c0392b',
    marginTop: '2px',
  },
  createBtn: {
    height: '34px',
    padding: '0 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#08060d',
    border: '1px solid #08060d',
    borderRadius: '5px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  errorBanner: {
    marginTop: '12px',
    backgroundColor: '#fdf0ef',
    border: '1px solid #e8c4c0',
    borderRadius: '5px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#922b21',
  },
  successBanner: {
    marginTop: '12px',
    backgroundColor: '#eafaf1',
    border: '1px solid #a9dfbf',
    borderRadius: '5px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#1e8449',
  },
  tableWrapper: {
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b6375',
    borderBottom: '1px solid #e5e4e7',
    whiteSpace: 'nowrap' as const,
  },
  tr: {
    borderBottom: '1px solid #f0eff2',
  },
  td: {
    padding: '10px 12px',
    color: '#08060d',
    verticalAlign: 'middle' as const,
  },
  emptyRow: {
    padding: '24px 12px',
    textAlign: 'center' as const,
    color: '#6b6375',
    fontSize: '13px',
  },
  code: {
    fontFamily: 'ui-monospace, Consolas, monospace',
    fontSize: '12px',
    color: '#08060d',
    backgroundColor: '#f4f3f5',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  roleBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: '4px',
  },
  roleBadgeAdmin: {
    backgroundColor: '#08060d',
    color: '#ffffff',
  },
  roleBadgeUser: {
    backgroundColor: '#f0eff2',
    color: '#6b6375',
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#08060d',
    backgroundColor: 'transparent',
    border: '1px solid #e5e4e7',
    borderRadius: '4px',
    padding: '4px 10px',
    cursor: 'pointer',
  },
  deleteActionBtn: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#922b21',
    backgroundColor: 'transparent',
    border: '1px solid #e8c4c0',
    borderRadius: '4px',
    padding: '4px 10px',
    cursor: 'pointer',
  },
  loadingState: {
    padding: '24px',
    textAlign: 'center' as const,
    fontSize: '13px',
    color: '#6b6375',
  },
};

const dialogStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(8, 6, 13, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  box: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '8px',
    padding: '24px 28px',
    width: '100%',
    maxWidth: '420px',
    boxSizing: 'border-box',
    boxShadow: 'rgba(0,0,0,0.12) 0 8px 24px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#08060d',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b6375',
    margin: '0 0 20px 0',
    lineHeight: '1.5',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '20px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b6375',
  },
  input: {
    height: '34px',
    padding: '0 10px',
    fontSize: '13px',
    color: '#08060d',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '5px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  fieldError: {
    fontSize: '12px',
    color: '#c0392b',
  },
  errorText: {
    fontSize: '13px',
    color: '#922b21',
    backgroundColor: '#fdf0ef',
    border: '1px solid #e8c4c0',
    borderRadius: '4px',
    padding: '8px 12px',
    margin: '0 0 16px 0',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b6375',
    backgroundColor: 'transparent',
    border: '1px solid #e5e4e7',
    borderRadius: '5px',
    padding: '6px 14px',
    cursor: 'pointer',
  },
  confirmBtn: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#08060d',
    border: '1px solid #08060d',
    borderRadius: '5px',
    padding: '6px 14px',
    cursor: 'pointer',
  },
  deleteBtn: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#c0392b',
    border: '1px solid #c0392b',
    borderRadius: '5px',
    padding: '6px 14px',
    cursor: 'pointer',
  },
};
