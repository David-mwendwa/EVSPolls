import { useAuth } from '../context/AuthContext';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiShield,
  FiUserCheck,
  FiClock,
} from 'react-icons/fi';
import usePageMeta from '../lib/pageMeta';

const Profile = () => {
  usePageMeta('Your profile', 'Your voter profile and voting history.', { noindex: true });
  const { user } = useAuth();

  const displayName = user?.name || 'Your Account';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const role = user?.role || 'user';
  const email = user?.email || 'Not provided';
  const phone = user?.phone || 'Not provided';
  const address = user?.address || 'Not provided';
  const status = (user?.status || 'active').toLowerCase();

  const statusClasses =
    status === 'active'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : status === 'inactive'
        ? 'bg-gray-50 text-gray-600 border border-gray-200'
        : 'bg-yellow-50 text-yellow-700 border border-yellow-200';

  return (
    <div className='bg-gray-50 pb-12'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>
            My Profile
          </h1>
          <p className='mt-2 text-sm text-gray-600 max-w-2xl'>
            Review your account details as they are registered in the electronic
            voting system. These details help administrators verify your
            eligibility and keep your votes secure.
          </p>
        </div>

        <div className='grid gap-6 lg:grid-cols-3'>
          {/* Left column: identity card */}
          <div className='lg:col-span-1'>
            <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center'>
              <div className='h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-semibold mb-4'>
                {initials || <FiUser className='h-8 w-8' />}
              </div>
              <h2 className='text-lg font-semibold text-gray-900 mb-1'>
                {displayName}
              </h2>
              <p className='text-xs uppercase tracking-wide text-gray-500 mb-3'>
                {role === 'admin' || role === 'sysadmin'
                  ? 'Administrator'
                  : 'Registered Voter'}
              </p>

              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses}`}>
                <FiUserCheck className='mr-1.5 h-3.5 w-3.5' />
                {status.charAt(0).toUpperCase() + status.slice(1)} account
              </span>

              <div className='mt-4 w-full border-t border-gray-100 pt-4 text-left text-xs text-gray-500 space-y-1'>
                <div className='flex items-center justify-between'>
                  <span className='flex items-center'>
                    <FiShield className='mr-1.5 h-3.5 w-3.5 text-primary-500' />
                    Role
                  </span>
                  <span className='font-medium text-gray-700 capitalize'>
                    {role}
                  </span>
                </div>
                {user?.createdAt && (
                  <div className='flex items-center justify-between'>
                    <span className='flex items-center'>
                      <FiClock className='mr-1.5 h-3.5 w-3.5 text-primary-500' />
                      Member since
                    </span>
                    <span className='font-medium text-gray-700'>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: details */}
          <div className='lg:col-span-2 space-y-6'>
            <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
              <h3 className='text-sm font-semibold text-gray-900 mb-4 flex items-center'>
                <FiUser className='h-4 w-4 mr-2 text-primary-500' />
                Personal information
              </h3>
              <dl className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm'>
                <div>
                  <dt className='text-gray-500'>Full name</dt>
                  <dd className='mt-1 font-medium text-gray-900 break-words'>
                    {displayName}
                  </dd>
                </div>
                <div>
                  <dt className='text-gray-500'>Email address</dt>
                  <dd className='mt-1 font-medium text-gray-900 break-words flex items-center'>
                    <FiMail className='h-4 w-4 mr-1.5 text-gray-400' />
                    <span>{email}</span>
                  </dd>
                </div>
                <div>
                  <dt className='text-gray-500'>Phone number</dt>
                  <dd className='mt-1 font-medium text-gray-900 break-words flex items-center'>
                    <FiPhone className='h-4 w-4 mr-1.5 text-gray-400' />
                    <span>{phone}</span>
                  </dd>
                </div>
                <div>
                  <dt className='text-gray-500'>Address</dt>
                  <dd className='mt-1 font-medium text-gray-900 break-words'>
                    {address}
                  </dd>
                </div>
              </dl>
            </div>

            <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
              <h3 className='text-sm font-semibold text-gray-900 mb-3 flex items-center'>
                <FiShield className='h-4 w-4 mr-2 text-primary-500' />
                Account & security
              </h3>
              <p className='text-sm text-gray-600 mb-3'>
                Your profile details are managed by your organization's election
                administrator. If any of this information looks incorrect,
                please reach out to your administrator so they can update your
                record.
              </p>
              <ul className='text-xs text-gray-500 list-disc pl-5 space-y-1'>
                <li>
                  Your identity is verified before you can participate in
                  elections.
                </li>
                <li>
                  Your ballot choices remain anonymous and are never linked back
                  to this profile.
                </li>
                <li>
                  Only authorized administrators can update core account
                  attributes such as status or role.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
