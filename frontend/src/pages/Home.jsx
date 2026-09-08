import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useElection } from '../context/ElectionContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/apiClient';
import { Spinner } from '../components/ui/Loaders';
import { FiX, FiCheckCircle, FiLogIn } from 'react-icons/fi';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import usePageMeta from '../lib/pageMeta';

const Home = () => {
  usePageMeta();
  const [showElectionModal, setShowElectionModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { elections, loading: electionsLoading } = useElection();

  // Use real elections from context and filter to active ones
  const activeElections = elections.filter(
    (election) => election.status === 'Active' || election.status === 'active'
  );

  const handleElectionSelect = async (electionId) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setShowElectionModal(false);
    try {
      const response = await api.get(`/elections/${electionId}`);
      const election =
        response?.data?.data || response?.data?.election || response?.data;

      if (election?.hasVotedForCurrentUser) {
        navigate(`/results/${electionId}`);
      } else {
        navigate(`/vote/${electionId}`);
      }
    } catch (error) {
      // On any error, fall back to the vote page so the user can proceed
      navigate(`/vote/${electionId}`);
    }
  };

  // Modal handlers
  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
  };

  const handleShowRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleShowLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
  };

  const handleRegisterSuccess = () => {
    setShowRegisterModal(false);
    // Show success message or redirect
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Auth dialogs. Each renders its own backdrop through a portal, so they
          need no wrapper here — the previous one stacked a second, opaque
          layer behind the blurred backdrop. */}
      <Login
        open={showLoginModal}
        onClose={handleCloseLoginModal}
        onSwitchToRegister={handleShowRegister}
      />
      <Register
        open={showRegisterModal}
        onClose={handleCloseRegisterModal}
        onSwitchToLogin={handleShowLogin}
      />
      {/* Hero Section */}
      <div className='relative overflow-hidden bg-gradient-to-t from-gray-50 to-white'>
        <div className='py-16 md:py-20 lg:py-24'>
          <div className='text-center'>
            <h1 className='text-3xl md:text-4xl font-bold text-gray-900 mb-4'>
              <span className='block'>EVSPolls</span>
              <span className='block text-xl md:text-2xl font-semibold text-primary-600 mt-1'>
                Secure, transparent elections for modern institutions
              </span>
            </h1>

            <p className='mt-3 max-w-2xl mx-auto text-sm sm:text-base md:text-base text-gray-600 md:mt-5'>
              EVSPolls is a web-based voting platform for universities and
              organizations. Voters can securely participate in elections from
              any device, while administrators manage ballots, monitor turnout,
              and review results in real time.
            </p>
            <div className='mt-10 flex flex-col sm:flex-row justify-center gap-4 px-4 sm:px-0'>
              <div className='w-full sm:w-auto'>
                {/* Main button - simple, solid primary style */}
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowLoginModal(true);
                    } else {
                      navigate('/elections');
                    }
                  }}
                  className='w-full sm:w-auto inline-flex items-center justify-center text-sm sm:text-base font-medium px-7 sm:px-8 py-3 rounded-lg border border-primary-600 bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:border-primary-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white'>
                  {isAuthenticated ? 'Browse elections' : 'Sign in to EVSPolls'}
                </button>
              </div>
              <Link
                to='/how-it-works'
                className='inline-flex items-center justify-center text-sm sm:text-base font-medium px-7 sm:px-8 py-3 rounded-lg border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-2 focus:ring-offset-white'>
                Learn about EVSPolls
              </Link>
            </div>

            {/* Election Selection Modal */}
            {showElectionModal && (
              <div className='fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6'>
                <div
                  className='fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity'
                  aria-hidden='true'
                />
                <div className='relative z-10 bg-white/95 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-black/5'>
                  <div className='p-6'>
                    <div className='flex justify-between items-center mb-6'>
                      <h3 className='text-xl font-bold text-gray-900'>
                        Select an Election
                      </h3>
                      <button
                        onClick={() => setShowElectionModal(false)}
                        className='text-gray-400 hover:text-gray-500'>
                        <FiX className='h-6 w-6' />
                      </button>
                    </div>

                    <div className='space-y-3'>
                      <div className='mb-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700'>
                        Click an election below to vote or view results (where
                        you have already cast your vote).
                      </div>
                      {electionsLoading ? (
                        <Spinner />
                      ) : activeElections.length > 0 ? (
                        activeElections.map((election) => (
                          <button
                            key={election._id || election.id}
                            onClick={() =>
                              handleElectionSelect(election._id || election.id)
                            }
                            className='w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left'>
                            <div className='flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-4'>
                              <FiCheckCircle className='h-5 w-5' />
                            </div>
                            <div>
                              <h4 className='font-medium text-gray-900'>
                                {election.title}
                              </h4>
                              <p className='text-sm text-gray-500'>
                                Click to vote or view results
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className='text-center py-8'>
                          <p className='text-gray-500'>
                            No active elections at the moment.
                          </p>
                          <p className='text-sm text-gray-400 mt-2'>
                            Please check back later.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className='mt-6'>
                      <button
                        onClick={() => setShowElectionModal(false)}
                        className='w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-2 focus:ring-offset-white'>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className='max-w-7xl mx-auto w-full py-12 space-y-12'>
        {/* Features Highlight Section */}
        <div className='bg-gray-100 rounded-xl p-8 shadow-sm mx-auto'>
          <div className='text-center'>
            <h2 className='text-xl md:text-2xl font-semibold text-gray-900'>
              Why Institutions Choose EVSPolls
            </h2>
            <div className='mt-10 grid gap-8 md:grid-cols-3'>
              <div className='bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow'>
                <div className='w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-6 h-6 text-primary-600'
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
                </div>
                <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-1.5'>
                  Enterprise‑grade security
                </h3>
                <p className='text-sm text-gray-600'>
                  Every ballot is encrypted and anonymized to protect voter
                  privacy. EVSPolls applies strong authentication and modern security
                  practices end‑to‑end.
                </p>
              </div>

              <div className='bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow'>
                <div className='w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-6 h-6 text-primary-600'
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
                </div>
                <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-1.5'>
                  Simple for voters and admins
                </h3>
                <p className='text-sm text-gray-600'>
                  Voters cast ballots in a few guided steps, while
                  administrators configure elections and monitor participation
                  from an intuitive dashboard.
                </p>
              </div>

              <div className='bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow'>
                <div className='w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-6 h-6 text-primary-600'
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
                </div>
                <h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-1.5'>
                  Transparent, verifiable outcomes
                </h3>
                <p className='text-sm text-gray-600'>
                  Track election status in real time and access clear, auditable
                  results once voting closes, so every stakeholder can trust the
                  final tally.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
