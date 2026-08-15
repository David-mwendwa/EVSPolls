import { useState, useEffect } from 'react';
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router-dom';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';
import { useElection } from '../context/ElectionContext';
import { useVoter } from '../context/VoterContext';
import { useAuth } from '../context/AuthContext';
import {
  FiArrowLeft,
  FiUsers,
  FiAward,
  FiClock,
  FiCalendar,
  FiCheckCircle,
  FiBarChart2,
  FiUserCheck,
  FiEdit2,
  FiTrash2,
  FiDownload,
  FiUserPlus,
  FiPlusCircle,
  FiMail,
  FiUser,
} from 'react-icons/fi';

const ElectionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    getElectionById,
    updateElection,
    updateElectionStatus,
    deleteElection,
    loading: electionsLoading,
  } = useElection();
  const hash = location.hash;
  const { voters: allVoters } = useVoter();
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const isAdminNotSysadmin = user?.role === 'admin';

  // Set active tab from URL query parameter and handle hash-based scrolling
  useEffect(() => {
    const tab = searchParams.get('tab');
    const hash = window.location.hash;

    // Set active tab if a valid tab is in the URL
    if (
      tab &&
      ['overview', 'voters', 'candidates', 'results', 'settings'].includes(tab)
    ) {
      setActiveTab(tab);
    }

    // Handle scrolling to the delete section if hash is present
    if (hash === '#delete') {
      // Ensure settings tab is active
      setActiveTab('settings');

      // Small timeout to ensure the tab content is rendered before scrolling
      const timer = setTimeout(() => {
        const element = document.getElementById('danger-zone');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          // Update URL to remove the hash without scrolling
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
          );
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [hash]);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'hasVoted',
    direction: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const votersPerPage = 10;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  // Function to format date for datetime-local input
  const formatForDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format: YYYY-MM-DDTHH:MM
    return date.toISOString().slice(0, 16);
  };

  // Initialize form data when election data is loaded
  useEffect(() => {
    if (election) {
      setFormData({
        title: election.title,
        description: election.description || '',
        startDate: formatForDateTimeLocal(election.startDate),
        endDate: formatForDateTimeLocal(election.endDate),
      });
    }
  }, [election]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Create updated election object with new dates
    const updatedElection = {
      ...election,
      title: formData.title.trim(),
      description: formData.description || '',
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Persist update via API/context
      const saved = await updateElection(updatedElection);

      // Sync local state with what the backend returned
      setElection(saved || updatedElection);
      setIsEditing(false);
      toast.success('Election updated successfully');
    } catch (error) {
      console.error('Failed to update election:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update election';
      toast.error(message);
    }
  };

  // Load election from context using the ID from the URL
  useEffect(() => {
    // Wait until elections have finished loading in the context
    if (electionsLoading) return;

    const selectedElection = getElectionById(id);

    if (!selectedElection) {
      setElection(null);
      setLoading(false);
      return;
    }

    setElection(selectedElection);
    setLoading(false);
  }, [id, getElectionById, electionsLoading]);

  const getStatusBadge = (status) => {
    const normalized = (status || '').toLowerCase();
    const statusClasses = {
      draft: 'bg-yellow-100 text-yellow-800',
      upcoming: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const label =
      status && typeof status === 'string'
        ? status.charAt(0).toUpperCase() + status.slice(1)
        : 'Unknown';

    return (
      <span
        className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${
          statusClasses[normalized] || 'bg-gray-100 text-gray-800'
        }`}>
        {label}
      </span>
    );
  };

  // Get all voters who are eligible for this election
  const electionVoters = allVoters;

  // Get voters who have voted in this election
  const votedVoters = (election?.voters || [])
    .map((vote) => {
      const voter = allVoters.find((v) => v.id === vote.id);
      return voter ? { ...voter, ...vote } : null;
    })
    .filter(Boolean);

  // Get voters who haven't voted yet
  const nonVotedVoters =
    allVoters.filter(
      (voter) => !election?.voters?.some((v) => v.id === voter.id)
    ) || [];

  // Combine all voters for sorting
  const allVotersWithStatus = [
    ...votedVoters.map((v) => ({ ...v, hasVoted: true })),
    ...nonVotedVoters.map((v) => ({ ...v, hasVoted: false })),
  ];

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort voters based on sort configuration
  const sortedVoters = [...allVotersWithStatus].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle nested properties
    if (sortConfig.key === 'votedFor') {
      const candidateA = election?.candidates?.find((c) => c.id === a.votedFor);
      const candidateB = election?.candidates?.find((c) => c.id === b.votedFor);
      aValue = candidateA?.name || '';
      bValue = candidateB?.name || '';
    } else if (sortConfig.key === 'votedAt') {
      aValue = a.votedAt ? new Date(a.votedAt) : new Date(0);
      bValue = b.votedAt ? new Date(b.votedAt) : new Date(0);
    }

    // Handle string comparison
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Get current voters for pagination
  const indexOfLastVoter = currentPage * votersPerPage;
  const indexOfFirstVoter = indexOfLastVoter - votersPerPage;
  const currentVoters = sortedVoters.slice(indexOfFirstVoter, indexOfLastVoter);
  const totalPages = Math.ceil(sortedVoters.length / votersPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  // Get sort direction indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const candidateResults =
    election && Array.isArray(election.candidates)
      ? election.candidates.map((candidate) => ({
          ...candidate,
          votes: election.results?.[candidate.id] || 0,
        }))
      : [];

  const totalVotes =
    typeof election?.voted === 'number'
      ? election.voted
      : candidateResults.reduce((sum, c) => sum + c.votes, 0);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateTimeRemaining = () => {
    if (!election) return '';

    const now = new Date();
    const endDate = new Date(election.endDate);
    const startDate = new Date(election.startDate);

    if (election.status === 'Completed') {
      return 'Election ended';
    }

    if (election.status === 'Upcoming') {
      const diffTime = startDate - now;
      if (diffTime <= 0) return 'Starting soon';

      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `Starts in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }

    // For active elections
    const diffTime = endDate - now;
    if (diffTime <= 0) return 'Ending soon';

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      return `${diffDays} days left`;
    }

    // Less than a day left
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    if (diffHours > 1) {
      return `${diffHours} hours left`;
    }

    // Less than an hour left
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    return `${diffMinutes} minutes left`;
  };

  if (loading) {
    return (
      <div className='bg-gray-50'>
        <div className='flex justify-center items-center min-h-screen'>
          <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500'></div>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className='bg-gray-50'>
        <div className='text-center py-12'>
          <h2 className='text-xl font-medium text-gray-900'>
            Election not found
          </h2>
          <p className='mt-2 text-gray-600'>
            The requested election could not be found.
          </p>
          <button
            onClick={() => navigate('/admin?tab=elections')}
            className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'>
            <FiArrowLeft className='-ml-1 mr-2 h-5 w-5' />
            Back to Elections
          </button>
        </div>
      </div>
    );
  }

  const deleteTitle = isAdminNotSysadmin
    ? 'Cancel Election'
    : 'Delete Election';
  const deleteMessage = isAdminNotSysadmin
    ? 'Are you sure you want to cancel this election? Voters will no longer be able to participate, but the record will be kept for reference.'
    : 'Are you sure you want to delete this election? This action cannot be undone.';
  const deleteNote = isAdminNotSysadmin
    ? '⚠️ Only system administrators can permanently delete elections. As an admin, you can cancel elections by changing their status.'
    : undefined;
  const deleteConfirmText = isAdminNotSysadmin ? 'Cancel Election' : 'Delete';

  const handleConfirmDeleteElection = async () => {
    if (!election) return;
    try {
      if (isAdminNotSysadmin) {
        // Admin: cancel the election by updating its status via dedicated endpoint
        const updated = await updateElectionStatus(
          election._id || election.id,
          'cancelled'
        );
        if (updated) {
          toast.success('Election cancelled successfully');
          setElection(updated);
        } else {
          toast.success('Election cancelled successfully');
        }
      } else {
        // Sysadmin: hard delete
        await deleteElection(election._id || election.id);
        toast.success('Election deleted successfully');
        navigate('/admin?tab=elections');
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        (isAdminNotSysadmin
          ? 'Failed to cancel election'
          : 'Failed to delete election');
      toast.error(message);
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className='bg-gray-50'>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title={deleteTitle}
        message={deleteMessage}
        note={deleteNote}
        confirmText={deleteConfirmText}
        cancelText='Cancel'
        onConfirm={handleConfirmDeleteElection}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate('/admin?tab=elections')}
            className='inline-flex items-center text-sm font-medium text-gray-700 hover:text-primary-600'>
            <FiArrowLeft className='mr-2 h-5 w-5' />
            Back to Elections
          </button>
          <div className='mt-2 flex items-center space-x-4'>
            <h1 className='text-2xl font-bold text-gray-900'>
              {election.title}
            </h1>
            {getStatusBadge(election.status)}
          </div>
          <p className='mt-1 text-sm text-gray-500'>
            {election.description || 'No description provided.'}
          </p>
        </div>
        <button className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'>
          <FiDownload className='-ml-1 mr-2 h-5 w-5' />
          Export Results
        </button>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='bg-white overflow-hidden shadow rounded-lg'>
          <div className='p-5'>
            <div className='flex items-center'>
              <div className='flex-shrink-0 bg-blue-500 rounded-md p-3'>
                <FiUsers className='h-6 w-6 text-white' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Total Voters
                  </dt>
                  <dd className='flex items-baseline'>
                    <div className='text-2xl font-semibold text-gray-900'>
                      {allVoters.length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white overflow-hidden shadow rounded-lg'>
          <div className='p-5'>
            <div className='flex items-center'>
              <div className='flex-shrink-0 bg-green-500 rounded-md p-3'>
                <FiUserCheck className='h-6 w-6 text-white' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Votes Cast
                  </dt>
                  <dd className='flex items-baseline'>
                    <div className='text-2xl font-semibold text-gray-900'>
                      {votedVoters.length}
                    </div>
                    {allVoters.length > 0 ? (
                      <div className='ml-2 flex items-baseline text-sm font-semibold text-green-600'>
                        {Math.round(
                          (votedVoters.length / allVoters.length) * 100
                        )}
                        %
                      </div>
                    ) : (
                      <div className='ml-2 flex items-baseline text-sm font-semibold text-gray-500'>
                        N/A
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white overflow-hidden shadow rounded-lg'>
          <div className='p-5'>
            <div className='flex items-center'>
              <div className='flex-shrink-0 bg-purple-500 rounded-md p-3'>
                <FiAward className='h-6 w-6 text-white' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Candidates
                  </dt>
                  <dd className='flex items-baseline'>
                    <div className='text-2xl font-semibold text-gray-900'>
                      {Array.isArray(election.candidates)
                        ? election.candidates.length
                        : 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white overflow-hidden shadow rounded-lg'>
          <div className='p-5'>
            <div className='flex items-center'>
              <div className='flex-shrink-0 bg-yellow-500 rounded-md p-3'>
                <FiClock className='h-6 w-6 text-white' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Time Remaining
                  </dt>
                  <dd className='text-sm font-medium text-gray-900'>
                    {calculateTimeRemaining()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='border-b border-gray-200'>
        <nav className='-mb-px flex space-x-8'>
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
            Overview
          </button>
          <button
            onClick={() => setActiveTab('voters')}
            className={`${
              activeTab === 'voters'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
            Voters
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`${
              activeTab === 'candidates'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
            Candidates
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`${
              activeTab === 'results'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
            Results
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
        <div className='px-4 py-5 sm:px-6'>
          <h3 className='text-lg leading-6 font-medium text-gray-900'>
            {activeTab === 'overview' && 'Election Overview'}
            {activeTab === 'voters' && 'Voter Management'}
            {activeTab === 'candidates' && 'Candidates'}
            {activeTab === 'results' && 'Election Results'}
            {activeTab === 'settings' && 'Election Settings'}
          </h3>
          <p className='mt-1 max-w-2xl text-sm text-gray-500'>
            {activeTab === 'overview' &&
              'Detailed information about this election.'}
            {activeTab === 'voters' &&
              'Manage voters and their participation status.'}
            {activeTab === 'candidates' &&
              'View and manage election candidates.'}
            {activeTab === 'results' && 'View and analyze election results.'}
            {activeTab === 'settings' &&
              'Configure election settings and options.'}
          </p>
        </div>
        <div className='border-t border-gray-200 px-4 py-5 sm:p-0'>
          <dl className='sm:divide-y sm:divide-gray-200'>
            {activeTab === 'overview' && (
              <>
                <div className='py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
                  <dt className='text-sm font-medium text-gray-500'>
                    Election ID
                  </dt>
                  <dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>
                    {election._id || election.id}
                  </dd>
                </div>
                <div className='py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
                  <dt className='text-sm font-medium text-gray-500'>Status</dt>
                  <dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>
                    {getStatusBadge(election.status)}
                  </dd>
                </div>
                <div className='py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
                  <dt className='text-sm font-medium text-gray-500'>
                    Start Date
                  </dt>
                  <dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>
                    {formatDate(election.startDate)}
                  </dd>
                </div>
                <div className='py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
                  <dt className='text-sm font-medium text-gray-500'>
                    End Date
                  </dt>
                  <dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>
                    {formatDate(election.endDate)}
                  </dd>
                </div>
                <div className='py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
                  <dt className='text-sm font-medium text-gray-500'>
                    Description
                  </dt>
                  <dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>
                    {election.description || 'No description provided.'}
                  </dd>
                </div>
                <div className='py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
                  <dt className='text-sm font-medium text-gray-500'>Created</dt>
                  <dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>
                    {new Date(election.createdAt).toLocaleString()}
                  </dd>
                </div>
                <div className='py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6'>
                  <dt className='text-sm font-medium text-gray-500'>
                    Last Updated
                  </dt>
                  <dd className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2'>
                    {new Date(election.updatedAt).toLocaleString()}
                  </dd>
                </div>
              </>
            )}

            {activeTab === 'voters' && (
              <div className='py-5 sm:py-5 sm:px-6'>
                <div className='flex justify-between items-center mb-4'>
                  <div>
                    <h4 className='text-lg font-medium text-gray-900'>
                      Voter Activity
                    </h4>
                    <p className='mt-1 text-sm text-gray-500'>
                      View all voters and their voting status for this election
                    </p>
                  </div>
                  <div className='flex items-center space-x-4'>
                    <div className='flex items-center'>
                      <span className='h-3 w-3 rounded-full bg-green-500 mr-1'></span>
                      <span className='text-sm text-gray-600'>
                        Voted: {votedVoters.length}
                      </span>
                    </div>
                    <div className='flex items-center'>
                      <span className='h-3 w-3 rounded-full bg-yellow-500 mr-1'></span>
                      <span className='text-sm text-gray-600'>
                        Not Voted: {nonVotedVoters.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm'>
                  <div
                    className='overflow-x-auto'
                    style={{ maxWidth: '100%', display: 'block' }}>
                    <table
                      className='min-w-full divide-y divide-gray-200'
                      style={{ minWidth: '800px' }}>
                      <thead className='bg-gray-50'>
                        <tr>
                          <th
                            scope='col'
                            className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap'
                            onClick={() => handleSort('name')}>
                            <div className='flex items-center'>
                              <FiUser className='mr-1.5 h-4 w-4 text-gray-400' />
                              <span>Voter</span>
                              <span className='ml-1'>
                                {getSortIndicator('name')}
                              </span>
                            </div>
                          </th>
                          <th
                            scope='col'
                            className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap'
                            onClick={() => handleSort('email')}>
                            <div className='flex items-center'>
                              <FiMail className='mr-1.5 h-4 w-4 text-gray-400' />
                              <span>Email</span>
                              <span className='ml-1'>
                                {getSortIndicator('email')}
                              </span>
                            </div>
                          </th>
                          <th
                            scope='col'
                            className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap'
                            onClick={() => handleSort('votedFor')}>
                            <div className='flex items-center'>
                              <FiCheckCircle className='mr-1.5 h-4 w-4 text-gray-400' />
                              <span>Voted For</span>
                              <span className='ml-1'>
                                {getSortIndicator('votedFor')}
                              </span>
                            </div>
                          </th>
                          <th
                            scope='col'
                            className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap'
                            onClick={() => handleSort('votedAt')}>
                            <div className='flex items-center'>
                              <FiCalendar className='mr-1.5 h-4 w-4 text-gray-400' />
                              <span>Voted At</span>
                              <span className='ml-1'>
                                {getSortIndicator('votedAt')}
                              </span>
                            </div>
                          </th>
                          <th
                            scope='col'
                            className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap'
                            onClick={() => handleSort('hasVoted')}>
                            <div className='flex items-center'>
                              <FiUserCheck className='mr-1.5 h-4 w-4 text-gray-400' />
                              <span>Status</span>
                              <span className='ml-1'>
                                {getSortIndicator('hasVoted')}
                              </span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white divide-y divide-gray-200'>
                        {currentVoters.length > 0 ? (
                          currentVoters.map((voter) => {
                            const candidate = voter.votedFor
                              ? election.candidates?.find(
                                  (c) => c.id === voter.votedFor
                                )
                              : null;

                            return (
                              <tr
                                key={voter.id}
                                className={`${
                                  !voter.hasVoted ? 'bg-gray-50' : ''
                                } hover:bg-gray-50`}>
                                <td className='px-4 py-4 whitespace-nowrap'>
                                  <div className='flex items-center'>
                                    <div className='text-sm font-medium text-gray-900'>
                                      {voter.name}
                                    </div>
                                  </div>
                                </td>
                                <td className='px-4 py-4 whitespace-nowrap'>
                                  <div
                                    className='text-sm text-gray-900 truncate'
                                    style={{ maxWidth: '200px' }}
                                    title={voter.email}>
                                    {voter.email}
                                  </div>
                                </td>
                                <td className='px-4 py-4 whitespace-nowrap'>
                                  {candidate ? (
                                    <div className='text-sm text-gray-900 whitespace-nowrap'>
                                      {candidate.name}
                                    </div>
                                  ) : (
                                    <span className='text-sm text-gray-500'>
                                      -
                                    </span>
                                  )}
                                </td>
                                <td className='px-4 py-4 whitespace-nowrap text-sm text-gray-500'>
                                  {voter.votedAt
                                    ? new Date(voter.votedAt).toLocaleString()
                                    : '-'}
                                </td>
                                <td className='px-4 py-4 whitespace-nowrap'>
                                  {voter.hasVoted ? (
                                    <span className='px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800'>
                                      Voted
                                    </span>
                                  ) : (
                                    <span className='px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800'>
                                      Not Voted
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan='5'
                              className='px-6 py-4 text-center text-sm text-gray-500'>
                              No voters found for this election.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className='bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6'>
                  <div className='flex-1 flex justify-between sm:hidden'>
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}>
                      Previous
                    </button>
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}>
                      Next
                    </button>
                  </div>
                  <div className='hidden sm:flex-1 sm:flex sm:items-center sm:justify-between'>
                    <div>
                      <p className='text-sm text-gray-700'>
                        Showing{' '}
                        <span className='font-medium'>
                          {indexOfFirstVoter + 1}
                        </span>{' '}
                        to{' '}
                        <span className='font-medium'>
                          {Math.min(indexOfLastVoter, sortedVoters.length)}
                        </span>{' '}
                        of{' '}
                        <span className='font-medium'>
                          {sortedVoters.length}
                        </span>{' '}
                        voters
                      </p>
                    </div>
                    <div>
                      <nav
                        className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px'
                        aria-label='Pagination'>
                        <button
                          onClick={prevPage}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === 1
                              ? 'text-gray-300'
                              : 'text-gray-500 hover:bg-gray-50'
                          }`}>
                          <span className='sr-only'>Previous</span>
                          <svg
                            className='h-5 w-5'
                            xmlns='http://www.w3.org/2000/svg'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                            aria-hidden='true'>
                            <path
                              fillRule='evenodd'
                              d='M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z'
                              clipRule='evenodd'
                            />
                          </svg>
                        </button>

                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            // Show first 2 pages, current page, and last 2 pages
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            if (pageNum > 0 && pageNum <= totalPages) {
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => paginate(pageNum)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    currentPage === pageNum
                                      ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  }`}>
                                  {pageNum}
                                </button>
                              );
                            }
                            return null;
                          }
                        )}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <span className='relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700'>
                            ...
                          </span>
                        )}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <button
                            onClick={() => paginate(totalPages)}
                            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                              currentPage === totalPages
                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}>
                            {totalPages}
                          </button>
                        )}

                        <button
                          onClick={nextPage}
                          disabled={currentPage === totalPages}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === totalPages
                              ? 'text-gray-300'
                              : 'text-gray-500 hover:bg-gray-50'
                          }`}>
                          <span className='sr-only'>Next</span>
                          <svg
                            className='h-5 w-5'
                            xmlns='http://www.w3.org/2000/svg'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                            aria-hidden='true'>
                            <path
                              fillRule='evenodd'
                              d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                              clipRule='evenodd'
                            />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'candidates' && (
              <div className='py-5 sm:py-5 sm:px-6'>
                <div className='flex justify-between items-center mb-4'>
                  <h4 className='text-lg font-medium text-gray-900'>
                    Candidates
                  </h4>
                </div>
                {candidateResults.length > 0 ? (
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {candidateResults.map((candidate) => {
                      const percentage = totalVotes
                        ? Math.round((candidate.votes / totalVotes) * 100)
                        : 0;
                      return (
                        <div
                          key={candidate.id}
                          className='bg-white overflow-hidden shadow rounded-lg'>
                          <div className='px-4 py-5 sm:p-6'>
                            <div className='flex items-center'>
                              <div className='flex-shrink-0 bg-indigo-500 rounded-md p-3'>
                                <FiUserCheck className='h-6 w-6 text-white' />
                              </div>
                              <div className='ml-5 w-0 flex-1'>
                                <dl>
                                  <dt className='text-sm font-medium text-gray-500 truncate'>
                                    {candidate.name}
                                  </dt>
                                  {candidate.party && (
                                    <dd className='text-xs text-primary-600 truncate mb-1'>
                                      {candidate.party}
                                    </dd>
                                  )}
                                  <dd className='flex items-baseline'>
                                    <div className='text-2xl font-semibold text-gray-900'>
                                      {candidate.votes}
                                    </div>
                                    <div className='ml-2 flex items-baseline text-sm font-semibold text-green-600'>
                                      {percentage}%
                                    </div>
                                  </dd>
                                </dl>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className='bg-white shadow rounded-md p-6 text-sm text-gray-500'>
                    No candidates are defined for this election.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'results' && (
              <div className='py-5 sm:py-5 sm:px-6'>
                <div className='bg-white overflow-hidden'>
                  <div className='p-6'>
                    <h4 className='text-lg font-medium text-gray-900 mb-4'>
                      Election Results
                    </h4>
                    {candidateResults.length > 0 ? (
                      <div className='space-y-6'>
                        {candidateResults.map((candidate) => {
                          const percentage = totalVotes
                            ? Math.round((candidate.votes / totalVotes) * 100)
                            : 0;
                          return (
                            <div key={candidate.id}>
                              <div className='flex justify-between text-sm font-medium text-gray-700 mb-1'>
                                <span>{candidate.name}</span>
                                <span>
                                  {candidate.votes} vote
                                  {candidate.votes === 1 ? '' : 's'} (
                                  {percentage}%)
                                </span>
                              </div>
                              <div className='w-full bg-gray-200 rounded-full h-4'>
                                <div
                                  className='bg-primary-600 h-4 rounded-full'
                                  style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className='text-sm text-gray-500'>
                        No results are available for this election yet.
                      </div>
                    )}
                    <div className='mt-8 flex justify-end'>
                      <button className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'>
                        <FiDownload className='-ml-1 mr-2 h-5 w-5' />
                        Export Results
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className='py-5 sm:py-5 sm:px-6'>
                <div className='space-y-6'>
                  <div>
                    <h4 className='text-lg font-medium text-gray-900 mb-4'>
                      Election Settings
                    </h4>
                    <div className='bg-white shadow overflow-hidden sm:rounded-lg'>
                      <div className='px-4 py-5 sm:p-6'>
                        <form onSubmit={handleSubmit} className='space-y-6'>
                          <div>
                            <label
                              htmlFor='election-title'
                              className='block text-sm font-medium text-gray-700'>
                              Election Title
                            </label>
                            <input
                              type='text'
                              id='election-title'
                              name='title'
                              value={formData.title}
                              onChange={handleInputChange}
                              className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm'
                              disabled={!isEditing}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor='election-description'
                              className='block text-sm font-medium text-gray-700'>
                              Description
                            </label>
                            <textarea
                              id='election-description'
                              name='description'
                              rows={3}
                              value={formData.description}
                              onChange={handleInputChange}
                              className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm'
                              disabled={!isEditing}
                            />
                          </div>

                          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                            <div>
                              <label
                                htmlFor='start-date'
                                className='block text-sm font-medium text-gray-700'>
                                Start Date
                              </label>
                              <input
                                type='datetime-local'
                                id='start-date'
                                name='startDate'
                                value={formData.startDate}
                                onChange={handleInputChange}
                                className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm'
                                disabled={!isEditing}
                                min={new Date().toISOString().slice(0, 16)}
                              />
                            </div>

                            <div>
                              <label
                                htmlFor='end-date'
                                className='block text-sm font-medium text-gray-700'>
                                End Date
                              </label>
                              <input
                                type='datetime-local'
                                id='end-date'
                                name='endDate'
                                value={formData.endDate}
                                onChange={handleInputChange}
                                className='mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm'
                                disabled={!isEditing}
                                min={
                                  formData.startDate ||
                                  new Date().toISOString().slice(0, 16)
                                }
                              />
                            </div>
                          </div>

                          <div className='pt-5'>
                            <div className='flex justify-end space-x-3'>
                              {isEditing ? (
                                <>
                                  <button
                                    type='button'
                                    onClick={() => {
                                      setIsEditing(false);
                                      // Reset form data when canceling
                                      setFormData({
                                        title: election.title,
                                        description: election.description || '',
                                        startDate: formatForDateTimeLocal(
                                          election.startDate
                                        ),
                                        endDate: formatForDateTimeLocal(
                                          election.endDate
                                        ),
                                      });
                                    }}
                                    className='bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'>
                                    Cancel
                                  </button>
                                  <button
                                    type='submit'
                                    className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'>
                                    Save Changes
                                  </button>
                                </>
                              ) : (
                                <button
                                  type='button'
                                  onClick={() => setIsEditing(true)}
                                  className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'>
                                  <FiEdit2 className='-ml-1 mr-2 h-5 w-5' />
                                  Edit Election
                                </button>
                              )}
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div
                    id='danger-zone'
                    className='bg-white shadow sm:rounded-lg'>
                    <div className='px-4 py-5 sm:p-6'>
                      <h3 className='text-lg leading-6 font-medium text-gray-900'>
                        Danger Zone
                      </h3>
                      <div className='mt-2 max-w-xl text-sm text-gray-500'>
                        <p>
                          Once you delete an election, there is no going back.
                          Please be certain.
                        </p>
                      </div>
                      <div className='mt-5'>
                        <button
                          type='button'
                          className='inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm'
                          onClick={() => setIsDeleteModalOpen(true)}>
                          <FiTrash2 className='-ml-1 mr-2 h-5 w-5' />
                          Delete Election
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default ElectionDetails;
