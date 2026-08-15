import { useEffect, useMemo, useState } from 'react';
import { FiUser, FiMail, FiLock, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
import SubmitButton from '../ui/SubmitButton';

const EMPTY_FORM = {
  name: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  password: '',
  confirmPassword: '',
};

// zxcvbn scores 0–4. The backend's floor is 6 characters, so this is advice
// rather than a gate — it tells the voter how their choice measures up without
// blocking a password the API would accept.
const STRENGTH_LEVELS = [
  { label: 'Very weak', bar: 'bg-red-500', text: 'text-red-600', width: 'w-1/5' },
  { label: 'Weak', bar: 'bg-orange-500', text: 'text-orange-600', width: 'w-2/5' },
  { label: 'Fair', bar: 'bg-yellow-500', text: 'text-yellow-700', width: 'w-3/5' },
  { label: 'Good', bar: 'bg-lime-500', text: 'text-lime-700', width: 'w-4/5' },
  { label: 'Strong', bar: 'bg-green-600', text: 'text-green-700', width: 'w-full' },
];

const Register = ({ open, onClose, onSwitchToLogin }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // zxcvbn ships a large dictionary — bigger than the rest of the app put
  // together. It is fetched the first time someone types a password rather
  // than bundled into the initial load, so the meter simply appears a moment
  // later instead of taxing every visitor.
  const [scorePassword, setScorePassword] = useState(null);

  const { login, register } = useAuth();

  useEffect(() => {
    if (open) {
      setFormData(EMPTY_FORM);
      setTouched({});
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!formData.password || scorePassword) return;

    let cancelled = false;

    import('zxcvbn').then((module) => {
      if (!cancelled) setScorePassword(() => module.default);
    });

    return () => {
      cancelled = true;
    };
  }, [formData.password, scorePassword]);

  // Scoring is not cheap; only re-run when the password actually changes.
  const strength = useMemo(() => {
    if (!formData.password || !scorePassword) return null;

    const { score, feedback } = scorePassword(formData.password);

    return { ...STRENGTH_LEVELS[score], score, warning: feedback?.warning };
  }, [formData.password, scorePassword]);

  const validate = () => {
    const errors = {};

    if (!formData.name) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters';
    }

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }

    if (formData.dateOfBirth && new Date(formData.dateOfBirth) >= new Date()) {
      errors.dateOfBirth = 'Date of birth must be in the past';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const errors = validate();
  const isFormValid = Object.keys(errors).length === 0;
  const passwordsMatch =
    formData.confirmPassword && formData.password === formData.confirmPassword;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const markTouched = (field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid || isLoading) {
      setTouched({
        name: true,
        email: true,
        dateOfBirth: true,
        password: true,
        confirmPassword: true,
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.confirmPassword,
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
        ...(formData.gender && { gender: formData.gender }),
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      // Sign the new voter straight in with the credentials they just chose.
      await login(
        { email: formData.email, password: formData.password },
        false
      );

      if (onClose) onClose();
      toast.success(result.message || 'Account created. You are signed in.');
    } catch (err) {
      setError(
        err.message || 'Something went wrong while creating your account.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const brandMark = (
    <div className='h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm'>
      <FiUser className='h-5 w-5 text-white' />
    </div>
  );

  const footer = (
    <p className='text-center text-sm text-gray-600 mb-0'>
      Already registered?{' '}
      <button
        type='button'
        onClick={onSwitchToLogin}
        className='font-semibold text-primary-600 hover:text-primary-700 focus:outline-none focus:underline'>
        Sign in instead
      </button>
    </p>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={brandMark}
      title='Create your voter account'
      subtitle='This is a demo environment — sample details are fine.'
      footer={footer}
      size='lg'>
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
          label='Full name'
          name='name'
          icon={FiUser}
          value={formData.name}
          onChange={handleChange}
          onBlur={() => markTouched('name')}
          error={errors.name}
          touched={touched.name}
          placeholder='John Mwangi'
          autoComplete='name'
          disabled={isLoading}
          required
        />

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
          disabled={isLoading}
          required
        />

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <FormField
            label='Date of birth'
            name='dateOfBirth'
            type='date'
            value={formData.dateOfBirth}
            onChange={handleChange}
            onBlur={() => markTouched('dateOfBirth')}
            error={errors.dateOfBirth}
            touched={touched.dateOfBirth}
            max={new Date().toISOString().split('T')[0]}
            autoComplete='bday'
            disabled={isLoading}
          />

          <FormField label='Gender' name='gender'>
            <select
              id='gender'
              name='gender'
              value={formData.gender}
              onChange={handleChange}
              disabled={isLoading}
              className='block w-full pl-3 pr-8 py-2.5 text-sm bg-white border border-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-primary-500/30 focus:border-primary-500 disabled:bg-gray-50'>
              <option value=''>Prefer not to say</option>
              <option value='male'>Male</option>
              <option value='female'>Female</option>
              <option value='other'>Other</option>
            </select>
          </FormField>
        </div>

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
          placeholder='At least 6 characters'
          autoComplete='new-password'
          disabled={isLoading}
          required
          hint={
            strength && (
              <div className='mt-2'>
                <div className='h-1 w-full bg-gray-200 rounded-full overflow-hidden'>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.bar} ${strength.width}`}
                  />
                </div>
                <p className={`mt-1 text-xs ${strength.text}`}>
                  {strength.label}
                  {strength.warning && (
                    <span className='text-gray-500'> — {strength.warning}</span>
                  )}
                </p>
              </div>
            )
          }
        />

        <FormField
          label='Confirm password'
          name='confirmPassword'
          type='password'
          icon={FiLock}
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={() => markTouched('confirmPassword')}
          error={errors.confirmPassword}
          touched={touched.confirmPassword}
          placeholder='Re-enter your password'
          autoComplete='new-password'
          disabled={isLoading}
          required
          hint={
            passwordsMatch && (
              <p className='mt-1.5 flex items-center gap-1 text-xs text-green-700'>
                <FiCheck className='w-3.5 h-3.5' aria-hidden='true' />
                Passwords match
              </p>
            )
          }
        />

        <div className='pt-1'>
          <SubmitButton
            pending={isLoading}
            disabled={!isFormValid}
            pendingLabel='Creating account…'>
            Create account
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
};

export default Register;
