// frontend/src/components/auth/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Defaults to '/' because sign-in is a modal on the home page — there is no
// standalone /login route to redirect to.
const ProtectedRoute = ({ allowedRoles = [], unauthRedirectTo = '/' }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    // Show loading state while checking authentication
    return (
      <div className='flex justify-center items-center min-h-screen'>
        Loading...
      </div>
    );
  }

  // If no specific roles are provided, allow any authenticated user
  if (
    isAuthenticated &&
    (!allowedRoles.length || allowedRoles.includes(user?.role))
  ) {
    return <Outlet />;
  }

  if (!isAuthenticated) {
    // User not logged in, redirect to the configured path (defaults to login)
    return (
      <Navigate
        to={unauthRedirectTo}
        state={{ from: window.location.pathname }}
        replace
      />
    );
  }

  // User is logged in but doesn't have required role
  return <Navigate to='/' replace />;
};

export default ProtectedRoute;
