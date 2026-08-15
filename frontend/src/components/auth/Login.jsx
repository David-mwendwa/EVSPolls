import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiMail,
  FiLock,
  FiAlertCircle,
  FiChevronDown,
  FiShield,
  FiSettings,
  FiUser,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
import SubmitButton from '../ui/SubmitButton';

// The accounts the demo environment ships with. `voter.user@evs.ke` rather
// than `voter@evs.ke`: the User schema derives a unique id from the email
// prefix and `voter` is already taken, so the shorter address cannot exist.
const DEMO_ACCOUNTS = [
  {
    label: 'Voter',
    email: 'voter.user@evs.ke',
    password: 'voter123',
    blurb: 'Browse elections and cast a ballot',
    icon: FiUser,
  },
  {
    label: 'Administrator',
    email: 'admin@evs.ke',
    password: 'admin123',
    blurb: 'Manage elections, candidates and results',
    icon: FiSettings,
  },
  {
    label: 'System administrator',
    email: 'sysadmin@evs.ke',
    password: 'sysadmin123',
    blurb: 'Full access, including system settings',
    icon: FiShield,
  },
];

const EMPTY_FORM = { email: '', password: '' };

const Login = ({ open, onClose, onSwitchToRegister }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const { login, rememberMe, setRememberMe } = useAuth();
  const navigate = useNavigate();

  // The dialog stays mounted between openings so it can animate out; reset the
  // form on each open rather than showing the previous attempt's state.
  useEffect(() => {
    if (open) {
      setFormData(EMPTY_FORM);
      setTouched({});
      setError('');
      setShowDemoAccounts(false);
    }
  }, [open]);

  const validate = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    return errors;
  };

  const errors = validate();
  const isFormValid = Object.keys(errors).length === 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const markTouched = (field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const applyDemoAccount = (account) => {
    setFormData({ email: account.email, password: account.password });
    setTouched({ email: true, password: true });
    setError('');
    setShowDemoAccounts(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid || isSubmitting) {
      setTouched({ email: true, password: true });
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const data = await login(formData, rememberMe);
      const role = data?.user?.role;

      toast.success('Welcome back! You are now signed in.');
      if (onClose) onClose();

      if (role === 'admin' || role === 'sysadmin') {
        navigate('/admin');
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Sign in failed. Check your details and try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const brandMark = (
    <div className='h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm'>
      <FiLock className='h-5 w-5 text-white' />
    </div>
  );

  const footer = (
    <p className='text-center text-sm text-gray-600 mb-0'>
      New to EVSPolls?{' '}
      <button
        type='button'
        onClick={onSwitchToRegister}
        className='font-semibold text-primary-600 hover:text-primary-700 focus:outline-none focus:underline'>
        Create an account
      </button>
    </p>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={brandMark}
      title='Sign in to EVSPolls'
      subtitle='Use your institutional account, or try one of the demo logins.'
      footer={footer}>
      {error && (
        <div
          role='alert'
          className='flex items-start gap-2 p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg'>
          <FiAlertCircle className='w-4 h-4 mt-0.5 flex-shrink-0' />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4' noValidate>
        <FormField
          label='Email address'
          name='email'
          type='email'
          icon={FiMail}
          value={formData.email}
          onChange={handleChange}
          onBlur={() => markTouched('email')}
          error={errors.email}
          touched={touched.email}
          placeholder='you@institution.ac.ke'
          autoComplete='email'
          disabled={isSubmitting}
          required
        />

        <FormField
          label='Password'
          name='password'
          type='password'
          icon={FiLock}
          value={formData.password}
          onChange={handleChange}
          onBlur={() => markTouched('password')}
          error={errors.password}
          touched={touched.password}
          placeholder='••••••••'
          autoComplete='current-password'
          disabled={isSubmitting}
          required
        />

        <label className='flex items-center gap-2 cursor-pointer select-none'>
          <input
            type='checkbox'
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className='h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded'
          />
          <span className='text-sm text-gray-600'>
            Keep me signed in on this device
          </span>
        </label>

        <SubmitButton
          pending={isSubmitting}
          disabled={!isFormValid}
          pendingLabel='Signing in…'>
          Sign in
        </SubmitButton>
      </form>

      {/* Demo accounts, collapsed by default so the real form stays the focus */}
      <div className='mt-5 pt-5 border-t border-gray-100'>
        <button
          type='button'
          onClick={() => setShowDemoAccounts((prev) => !prev)}
          aria-expanded={showDemoAccounts}
          className='w-full flex items-center justify-between gap-2 text-sm font-medium text-gray-700 hover:text-primary-700 focus:outline-none focus:text-primary-700 transition-colors'>
          <span>Try a demo account</span>
          <FiChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              showDemoAccounts ? 'rotate-180' : ''
            }`}
            aria-hidden='true'
          />
        </button>

        {showDemoAccounts && (
          <ul className='mt-3 space-y-2'>
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;

              return (
                <li key={account.email}>
                  <button
                    type='button'
                    onClick={() => applyDemoAccount(account)}
                    className='w-full flex items-start gap-3 p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/60 focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors'>
                    <span className='flex-shrink-0 h-8 w-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center'>
                      <Icon className='w-4 h-4' aria-hidden='true' />
                    </span>
                    <span className='min-w-0'>
                      <span className='block text-sm font-medium text-gray-900'>
                        {account.label}
                      </span>
                      <span className='block text-xs text-gray-500 truncate'>
                        {account.blurb}
                      </span>
                      <span className='block mt-1 text-[11px] font-mono text-gray-400 truncate'>
                        {account.email} · {account.password}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default Login;
