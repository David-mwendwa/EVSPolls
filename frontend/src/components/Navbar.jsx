import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiMenu,
  FiX,
  FiHome,
  FiPlusCircle,
  FiUser,
  FiLogIn,
  FiLogOut,
  FiCheckCircle,
  FiChevronDown,
  FiUser as FiUserIcon,
  FiLayout,
} from 'react-icons/fi';

const Navbar = () => {
  // Get auth state and methods from context
  const { isAuthenticated, user, logout } = useAuth();

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Refs and router hooks
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Track scroll position for navbar style
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    document.addEventListener('scroll', handleScroll);
    return () => document.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout(); // This handles all auth state and localStorage cleanup
      setIsDropdownOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'sysadmin';
  const isAdminPage = location.pathname === '/admin';

  const navLinks = [
    { name: 'Home', path: '/', icon: <FiHome className='mr-2' /> },
    {
      name: 'Elections',
      path: '/elections',
      icon: <FiCheckCircle className='mr-2' />,
    },
  ];

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white shadow-md py-2'
          : 'bg-white/95 backdrop-blur-sm py-3'
      }`}>
      <div className='max-w-7xl mx-auto px-3 sm:px-4 lg:px-6'>
        <div className='flex justify-between items-center h-14 sm:h-16'>
          {/* Logo */}
          <div className='flex-shrink-0 flex items-center'>
            <Link to='/' className='flex items-center group'>
              <div className='relative h-8 w-8 md:h-9 md:w-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 transform group-hover:scale-105 overflow-hidden border border-primary-400/20'>
                <div className='absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                <div className='absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/10 transform rotate-12 group-hover:scale-150 transition-all duration-500'></div>
                <span className='text-white font-bold text-sm md:text-base tracking-tight relative z-10'>
                  EV
                </span>
              </div>
              <span className='ml-3'>
                <span className='block text-[9px] md:text-[10px] font-medium text-gray-500 -mb-0.5 tracking-wider uppercase'>
                  E-Voting
                </span>
                <span className='text-sm md:text-base font-semibold text-gray-800 tracking-tight'>
                  EVSPolls
                </span>
              </span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className='md:hidden flex items-center'>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className='inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500'
              aria-expanded='false'>
              <span className='sr-only'>Open main menu</span>
              {isOpen ? (
                <FiX className='block h-6 w-6' aria-hidden='true' />
              ) : (
                <FiMenu className='block h-6 w-6' aria-hidden='true' />
              )}
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className='hidden md:flex md:items-center md:space-x-4 lg:space-x-6'>
            {navLinks.map((link) => {
              if (!isAuthenticated && link.name === 'Home') return null;
              if (!isAuthenticated && link.name === 'Elections') return null;

              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`${
                    location.pathname === link.path
                      ? 'text-primary-600 font-medium'
                      : 'text-gray-600 hover:text-primary-600'
                  } inline-flex items-center text-sm font-medium transition-colors duration-200`}>
                  {link.name === 'Home' ? (
                    <FiHome className='mr-1.5 h-5 w-5' />
                  ) : (
                    <FiCheckCircle className='mr-1.5 h-5 w-5' />
                  )}
                  {link.name}
                </Link>
              );
            })}
          </div>
          {/* Right-aligned items - Auth */}
          <div className='hidden md:flex md:items-center md:space-x-6'>
            {isAuthenticated ? (
              <div className='flex items-center'>
                <div className='relative' ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className='flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'>
                    <span className='sr-only'>Open user menu</span>
                    <div className='h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600'>
                      <FiUserIcon className='h-4 w-4' />
                    </div>
                    <span className='ml-2 text-sm font-medium text-gray-700'>
                      {user?.name ? user.name.split(' ')[0] : 'User'}
                    </span>
                    <FiChevronDown className='ml-1 h-4 w-4 text-gray-500' />
                  </button>

                  {/* Dropdown menu */}
                  {isDropdownOpen && (
                    <div className='origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50'>
                      <div className='py-1' role='none'>
                        <Link
                          to='/profile'
                          onClick={() => setIsDropdownOpen(false)}
                          className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'>
                          <FiUserIcon className='inline-block mr-2 h-4 w-4' />
                          Your Profile
                        </Link>
                        {isAdmin && (
                          <Link
                            to='/admin'
                            onClick={() => setIsDropdownOpen(false)}
                            className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'>
                            <FiLayout className='inline-block mr-2 h-4 w-4' />
                            Dashboard
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className='w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md'>
                          <FiLogOut className='inline-block mr-2 h-4 w-4' />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className='flex items-center'>
                {/* No login button here - using the one in hero section */}
                <Link
                  to='/'
                  className={`inline-flex items-center text-sm font-medium transition-colors duration-200 ${
                    location.pathname === '/'
                      ? 'text-primary-600 font-medium'
                      : 'text-gray-600 hover:text-primary-600'
                  }`}>
                  <FiHome className='mr-1.5 h-5 w-5' />
                  Home
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {/* Backdrop for mobile menu - clicking it closes the menu */}
      {isOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/30 md:hidden'
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`${
          isOpen ? 'block' : 'hidden'
        } md:hidden fixed inset-x-0 top-14 sm:top-16 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg rounded-b-xl`}>
        <div className='pt-3 pb-3 space-y-1 px-2'>
          {navLinks.map((link) => {
            if (!isAuthenticated && link.name === 'Elections') return null;

            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`${
                  location.pathname === link.path
                    ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500'
                    : 'text-gray-700 hover:bg-gray-50 hover:border-l-4 hover:border-gray-200'
                } flex items-center justify-between rounded-lg pl-3 pr-3 py-2 text-sm font-medium transition-colors duration-150`}>
                <div className='flex items-center'>
                  {link.icon}
                  {link.name}
                </div>
              </Link>
            );
          })}
        </div>
        <div className='pt-3 pb-4 border-t border-gray-100 px-4'>
          {isAuthenticated ? (
            <div className='space-y-3'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <div className='h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600'>
                    <FiUser className='h-5 w-5' />
                  </div>
                </div>
                <div className='ml-3'>
                  <div className='text-sm font-medium text-gray-800'>
                    {user?.name ? user.name.split(' ')[0] : 'User'}
                  </div>
                  <div className='text-xs text-gray-500'>View profile</div>
                </div>
              </div>
              <div className='border-t border-gray-100'></div>
              <Link
                to='/profile'
                onClick={() => setIsOpen(false)}
                className='block px-0 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md'>
                <FiUser className='inline-block mr-2 h-4 w-4' />
                Your Profile
              </Link>
              {isAdmin && (
                <Link
                  to='/admin'
                  onClick={() => setIsOpen(false)}
                  className='block px-0 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md'>
                  <FiLayout className='inline-block mr-2 h-4 w-4' />
                  Dashboard
                </Link>
              )}
              <button
                onClick={async () => {
                  setIsOpen(false);
                  await handleLogout();
                }}
                className='w-full text-left px-0 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md'>
                <FiLogOut className='inline-block mr-2 h-4 w-4' />
                Sign out
              </button>
            </div>
          ) : (
            <div className='px-4'>
              {/* No login button here - using the one in hero section */}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
