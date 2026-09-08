import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import usePageMeta from '../lib/pageMeta';

const HowItWorks = () => {
  usePageMeta('How it works', 'How an EVSPolls election runs end to end: voter roll, ballot, one vote per voter, and results published the moment polls close.');
  const { isAuthenticated } = useAuth();
  const steps = [
    {
      number: '01',
      title: 'Sign in to EVSPolls',
      description:
        'From the homepage, use the "Sign in to EVSPolls" button and sign in with the credentials provided by your institution or the account you signed up with. For demo and testing purposes, sample login credentials are listed on the login page. Your role determines whether you access the voter experience, the admin dashboard, or the system admin console.',
      icon: (
        <svg
          className='w-8 h-8 text-primary-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
          />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'Go to the Elections page',
      description:
        'Use the top navigation or the main action button on the homepage ("Sign in to EVSPolls" before signing in and "Browse elections" afterwards) to open the Elections page. Here you will see all elections you are eligible for, along with clear status labels (upcoming, active, completed, or cancelled) and a "You voted" tag where you have already cast a ballot.',
      icon: (
        <svg
          className='w-8 h-8 text-primary-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
          />
        </svg>
      ),
    },
    {
      number: '03',
      title: 'Open an active election and cast your vote',
      description:
        'When an election becomes active, click the "Open ballot" button to review the candidates and cast your vote. Each eligible voter can vote only once per election. After you submit your ballot, the election card displays a "You voted" badge and the primary action changes to "View results" for convenient follow-up.',
      icon: (
        <svg
          className='w-8 h-8 text-primary-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M5 13l4 4L19 7'
          />
        </svg>
      ),
    },
    {
      number: '04',
      title: 'View results and track status',
      description:
        'As elections progress from upcoming to active and then to completed or cancelled, their status is updated on the Elections page. Upcoming elections are clearly marked and their action buttons are disabled so you cannot open or vote in them early. For completed elections (or those where you have already voted), use the "View results" button to see the final outcome. Cancelled elections are clearly labeled and their actions are disabled so no additional votes can be cast.',
      icon: (
        <svg
          className='w-8 h-8 text-primary-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M13 10V3L4 14h7v7l9-11h-7z'
          />
        </svg>
      ),
    },
  ];

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Hero Section */}
      <div className='bg-white'>
        <div className='py-16 md:py-20 lg:py-24'>
          <div className='text-center'>
            <h1 className='text-3xl md:text-4xl font-bold text-gray-900 mb-4'>
              <span className='block'>How EVSPolls works</span>
              <span className='block text-xl md:text-2xl font-semibold text-primary-600 mt-1'>
                A clear, secure voting experience for your elections
              </span>
            </h1>
            <p className='mt-3 max-w-2xl mx-auto text-sm sm:text-base md:text-base text-gray-600 md:mt-5'>
              Understand the key steps for signing in, finding the elections you
              are eligible for, casting a secure ballot, and reviewing results
              in EVSPolls &mdash; designed for both
              security and convenience.
            </p>
          </div>
        </div>
      </div>

      {/* Steps Section */}
      <div className='py-12 bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='lg:text-center'>
            <h2 className='text-xs font-semibold tracking-wide text-primary-600 uppercase'>
              Process
            </h2>
            <p className='mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900'>
              Steps to cast your vote securely
            </p>
          </div>

          <div className='mt-8 md:mt-10'>
            <div className='space-y-8 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-10'>
              {steps.map((step) => (
                <div key={step.number} className='relative'>
                  <div className='flex items-start'>
                    <div className='flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white flex-shrink-0'>
                      {step.icon}
                    </div>
                    <div className='ml-4'>
                      <h3 className='text-base sm:text-lg font-semibold text-gray-900'>
                        <span className='text-primary-600'>{step.number}.</span>{' '}
                        {step.title}
                      </h3>
                      <p className='mt-2 text-sm text-gray-600'>
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Back link (variant depends on auth state) */}
      <div className='bg-gray-50 py-6 border-t border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-center'>
            <Link
              to={isAuthenticated ? '/elections' : '/'}
              className='inline-flex items-center text-primary-700 hover:text-primary-800 font-medium transition-all duration-300 transform hover:translate-x-1 group'>
              <div className='relative'>
                <div className='absolute h-8 w-8 -left-1.5 -top-1.5 rounded-full bg-primary-100 opacity-75 animate-ping'></div>
                <svg
                  className='h-5 w-5 mr-2 text-primary-600 relative z-10 animate-pulse'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M10 19l-7-7m0 0l7-7m-7 7h18'
                  />
                </svg>
              </div>
              <span className='border-b-2 border-transparent hover:border-primary-600 transition-colors duration-200'>
                {isAuthenticated ? 'Back to Elections' : 'Back to homepage'}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
