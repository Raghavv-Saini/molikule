import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { AxiosError } from 'axios';

interface BackendError {
  error: string;
  message: string;
}

const EMPLOYEE_ID_PATTERN = /^\d{6}$/;

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [employeeIdError, setEmployeeIdError] = useState('');
  const [backendError, setBackendError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateEmployeeId(value: string): string {
    if (!value) return 'Employee ID is required.';
    if (!EMPLOYEE_ID_PATTERN.test(value)) return 'Employee ID must be exactly 6 numeric digits.';
    return '';
  }

  function handleEmployeeIdBlur() {
    setEmployeeIdError(validateEmployeeId(employeeId));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBackendError('');

    const idError = validateEmployeeId(employeeId);
    if (idError) {
      setEmployeeIdError(idError);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(employeeId, password);
      navigate('/', { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<BackendError>;
      const message =
        axiosErr.response?.data?.message ??
        axiosErr.message ??
        'An unexpected error occurred. Please try again.';
      setBackendError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Molikule</h1>
          <p style={styles.subtitle}>Supply Chain Analytics</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.fieldGroup}>
            <label htmlFor="employee-id" style={styles.label}>
              Employee ID
            </label>
            <input
              id="employee-id"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="username"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                if (employeeIdError) setEmployeeIdError(validateEmployeeId(e.target.value));
              }}
              onBlur={handleEmployeeIdBlur}
              aria-describedby={employeeIdError ? 'employee-id-error' : undefined}
              aria-invalid={employeeIdError ? true : undefined}
              style={{
                ...styles.input,
                ...(employeeIdError ? styles.inputError : {}),
              }}
              placeholder="6-digit employee ID"
            />
            {employeeIdError && (
              <span id="employee-id-error" role="alert" style={styles.errorText}>
                {employeeIdError}
              </span>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Password"
            />
          </div>

          {backendError && (
            <div role="alert" style={styles.backendError}>
              {backendError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.submitButton,
              ...(isSubmitting ? styles.submitButtonDisabled : {}),
            }}
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f5f7',
    padding: '24px',
    boxSizing: 'border-box',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '8px',
    padding: '40px 36px',
    boxSizing: 'border-box',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#08060d',
    margin: '0 0 4px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b6375',
    margin: 0,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '20px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#08060d',
    marginBottom: '6px',
  },
  input: {
    fontSize: '15px',
    lineHeight: '1.5',
    padding: '9px 12px',
    border: '1px solid #e5e4e7',
    borderRadius: '5px',
    color: '#08060d',
    backgroundColor: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: '#c0392b',
  },
  errorText: {
    marginTop: '5px',
    fontSize: '13px',
    color: '#c0392b',
  },
  backendError: {
    backgroundColor: '#fdf0ef',
    border: '1px solid #e8c4c0',
    borderRadius: '5px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#922b21',
    marginBottom: '20px',
  },
  submitButton: {
    width: '100%',
    padding: '10px',
    fontSize: '15px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#08060d',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    marginTop: '4px',
  },
  submitButtonDisabled: {
    backgroundColor: '#6b6375',
    cursor: 'not-allowed',
  },
};
