import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav style={styles.navbar} role="navigation" aria-label="Main navigation">
      <div style={styles.left}>
        <Link to="/" style={styles.brand}>
          Molikule
        </Link>
      </div>

      <div style={styles.right}>
        {user && (
          <>
            {user.role === 'admin' && (
              <Link to="/users" style={styles.navLink}>
                User Management
              </Link>
            )}

            <div style={styles.userInfo}>
              <span style={styles.userName}>{user.name}</span>
              <span
                style={{
                  ...styles.roleBadge,
                  ...(user.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeUser),
                }}
              >
                {user.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>

            <button onClick={handleLogout} style={styles.logoutButton} type="button">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  navbar: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e4e7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: '56px',
    boxSizing: 'border-box',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
  },
  brand: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#08060d',
    textDecoration: 'none',
    letterSpacing: '-0.3px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  navLink: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#08060d',
    textDecoration: 'none',
    padding: '6px 10px',
    borderRadius: '5px',
    border: '1px solid #e5e4e7',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#08060d',
  },
  roleBadge: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '2px 8px',
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
  logoutButton: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b6375',
    backgroundColor: 'transparent',
    border: '1px solid #e5e4e7',
    borderRadius: '5px',
    padding: '6px 12px',
    cursor: 'pointer',
  },
};
