import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Suspense, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import WakingNotice from './components/WakingNotice.jsx';
import usePageMeta from './lib/pageMeta';

// Every page is loaded on demand — see routes.jsx. The admin console and the
// results view were already lazy because they pull in the reporting
// dependencies (jsPDF, html2canvas); the voter-facing pages are now too, so a
// visitor reading the home page no longer downloads the ballot screen with it.
import {
  Home,
  HowItWorks,
  Elections,
  Vote,
  Profile,
  Admin,
  CreateElection,
  ElectionDetails,
  Results,
} from './routes.jsx';

import { ElectionProvider } from './context/ElectionContext.jsx';
import { VoterProvider } from './context/VoterContext.jsx';
import { SettingsProvider, useSettings } from './context/SettingsContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

// Component to scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Component to handle maintenance mode redirection
const MaintenanceRedirect = () => {
  const navigate = useNavigate();
  const { maintenanceMode } = useSettings();
  const location = useLocation();

  useEffect(() => {
    // If in maintenance mode and not on an allowed path, redirect to the
    // maintenance notice. `/maintenance` itself has to be on the list, or the
    // effect would fire again on arrival and redirect the page to itself.
    const allowedPaths = ['/admin', '/maintenance'];

    if (
      maintenanceMode &&
      !allowedPaths.some((path) => location.pathname.startsWith(path))
    ) {
      navigate('/maintenance');
    }
  }, [maintenanceMode, navigate, location.pathname]);

  return null;
};

// Shown while a lazily-loaded route is being fetched
const RouteFallback = () => (
  <div className='flex justify-center items-center py-24 text-gray-500'>
    Loading…
  </div>
);

// Catch-all for unknown URLs. Without it, React Router matches nothing and
// renders a blank page.
const NotFoundPage = () => {
  usePageMeta('Page not found', 'That page does not exist on EVSPolls.', { noindex: true });

  return (
  <div className='py-20 text-center'>
    <p className='text-sm font-semibold tracking-wider text-primary-600 uppercase'>
      404
    </p>
    <h1 className='mt-2 text-3xl md:text-4xl font-bold text-gray-900'>
      Page not found
    </h1>
    <p className='mt-3 max-w-md mx-auto text-gray-600'>
      The page you are looking for doesn't exist or may have been moved.
    </p>
    <Link
      to='/'
      className='mt-8 inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary-600 text-white text-sm font-medium shadow-sm hover:bg-primary-700 transition-colors duration-200'>
      Back to home
    </Link>
  </div>
  );
};

// Maintenance page component
const MaintenancePage = () => {
  usePageMeta('Under maintenance', 'EVSPolls is briefly offline for scheduled maintenance.', { noindex: true });

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8 text-center'>
        <div className='bg-white p-8 rounded-lg shadow-md'>
          <div className='mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100'>
            <svg
              className='h-10 w-10 text-yellow-500'
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
              />
            </svg>
          </div>
          <h2 className='mt-6 text-3xl font-extrabold text-gray-900'>
            Under Maintenance
          </h2>
          <p className='mt-2 text-sm text-gray-600'>
            We're currently performing scheduled maintenance. We'll be back
            online shortly.
          </p>
          <div className='mt-6'>
            <p className='text-sm text-gray-500'>Estimated time: 30 minutes</p>
          </div>
          <div className='mt-6'>
            <button
              onClick={() => window.location.reload()}
              className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'>
              Refresh Page
            </button>
            <div className='mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded'>
              <div className='flex'>
                <div className='flex-shrink-0'>
                  <svg
                    className='h-5 w-5 text-blue-400'
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 20 20'
                    fill='currentColor'>
                    <path
                      fillRule='evenodd'
                      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div className='ml-3'>
                  <p className='text-sm text-blue-700'>
                    Admin: To disable maintenance mode, go to the{' '}
                    <a
                      href='/admin?tab=settings'
                      className='font-medium text-blue-700 underline hover:text-blue-600'>
                      Settings
                    </a>{' '}
                    page and toggle off the maintenance mode.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// The router is a parameter rather than a fixed <BrowserRouter> because this
// same tree is rendered twice: by main.jsx in the browser, and by
// scripts/prerender.mjs under a MemoryRouter at build time. Defining the
// provider stack once is the point — a prerendered page assembled from a
// second, hand-kept copy drifts from the real app the first time a provider is
// added, and the failure surfaces as a hydration mismatch that blanks the page
// rather than as anything obviously wrong here.
function App({ router: Router, routerProps }) {
  return (
    <Router {...routerProps}>
      <SettingsProvider>
        <AuthProvider>
          <ElectionProvider>
            <VoterProvider>
              <div className='min-h-screen bg-gray-50 flex flex-col'>
                <Navbar />
                <ScrollToTop />
                <WakingNotice />
                <MaintenanceRedirect />
                {/* The navbar is fixed and about 88px tall, so the main region
                    has to clear it. It previously offset only 32–48px, which
                    slid the top of every page under the bar. */}
                <main className='flex-1 pt-20 md:pt-24'>
                  <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full'>
                    <Suspense fallback={<RouteFallback />}>
                      <Routes>
                        <Route path='/' element={<Home />} />
                        <Route path='/how-it-works' element={<HowItWorks />} />
                        {/* Protected voter routes */}
                        <Route
                          element={<ProtectedRoute unauthRedirectTo='/' />}>
                          <Route path='/elections' element={<Elections />} />
                          <Route path='/profile' element={<Profile />} />
                        </Route>
                        {/* Public voting result routes (can remain accessible by link) */}
                        <Route path='/vote/:electionId' element={<Vote />} />
                        <Route
                          path='/results/:electionId'
                          element={<Results />}
                        />
                        <Route
                          path='/maintenance'
                          element={<MaintenancePage />}
                        />

                        {/* Protected admin routes. Sign-in happens in a modal
                            rather than on a page, so an unauthenticated
                            visitor is sent home to sign in there. */}
                        <Route
                          element={
                            <ProtectedRoute
                              allowedRoles={['admin', 'sysadmin']}
                              unauthRedirectTo='/'
                            />
                          }>
                          <Route path='/admin' element={<Admin />} />
                          <Route path='/create' element={<CreateElection />} />
                          <Route
                            path='/admin/elections/:id'
                            element={<ElectionDetails />}
                          />
                          <Route path='/admin/*' element={<Admin />} />
                          {/* Add other admin-only routes here */}
                        </Route>

                        <Route path='*' element={<NotFoundPage />} />
                      </Routes>
                    </Suspense>
                  </div>
                </main>
                <Footer />
                <ToastContainer
                  position='top-right'
                  autoClose={3500}
                  hideProgressBar={false}
                  newestOnTop
                  closeOnClick
                  pauseOnFocusLoss={false}
                  pauseOnHover
                  draggable
                  theme='colored'
                  limit={3}
                />
              </div>
            </VoterProvider>
          </ElectionProvider>
        </AuthProvider>
      </SettingsProvider>
    </Router>
  );
}

export default App;
