import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useElection } from '../context/ElectionContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/apiClient';
import { Spinner } from '../components/ui/Loaders';
import { toast } from 'react-toastify';
import {
  FiCheckCircle,
  FiCheck,
  FiClock,
  FiLock,
  FiAlertTriangle,
  FiBarChart2,
} from 'react-icons/fi';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { timingLabel } from '../utils/election';
import usePageMeta from '../lib/pageMeta';

/** Initials used for a candidate's avatar. */
const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/**
 * A single candidate option.
 *
 * Rendered as a real radio input rather than a clickable div, so the ballot is
 * navigable by keyboard and announced as a choice among options. The previous
 * version used `onClick` on a `div`, which a keyboard or screen-reader user
 * could not operate at all.
 */
const CandidateOption = ({ candidate, selected, disabled, onSelect }) => {
  const id = candidate._id || candidate.id;

  return (
    <label
      className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${
        disabled
          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
          : selected
            ? 'border-primary-500 bg-primary-50/70 cursor-pointer'
            : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50 cursor-pointer'
      }`}>
      <input
        type='radio'
        name='candidate'
        value={id}
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect(id)}
        className='sr-only peer'
      />

      <span
        className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-base font-semibold ${
          selected
            ? 'bg-primary-600 text-white'
            : 'bg-primary-100 text-primary-700'
        }`}
        aria-hidden='true'>
        {initialsOf(candidate.name)}
      </span>

      <span className='min-w-0 flex-1'>
        <span className='block text-sm font-semibold text-gray-900 truncate'>
          {candidate.name}
        </span>
        {candidate.party && (
          <span className='block text-xs text-gray-500 truncate'>
            {candidate.party}
          </span>
        )}
      </span>

      <span
        className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected
            ? 'border-primary-600 bg-primary-600'
            : 'border-gray-300 bg-white'
        }`}
        aria-hidden='true'>
        {selected && <FiCheck className='h-3 w-3 text-white' />}
      </span>
    </label>
  );
};

const Vote = () => {
  // A ballot is never search-engine material.
  usePageMeta('Cast your vote', 'Cast your ballot.', { noindex: true });
  const { electionId } = useParams();
  const { submitVote, loading: electionsLoading } = useElection();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [election, setElection] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isAdminLike = user?.role === 'admin' || user?.role === 'sysadmin';

  useEffect(() => {
    const loadElection = async () => {
      if (electionsLoading) return;

      try {
        // Always read from the API so `hasVotedForCurrentUser` is current.
        const response = await api.get(`/elections/${electionId}`);
        const remoteElection =
          response?.data?.data || response?.data?.election || response?.data;

        if (!remoteElection) {
          toast.error('Election not found');
          navigate('/elections');
          return;
        }

        if (remoteElection.hasVotedForCurrentUser) {
          navigate(
            `/results/${remoteElection._id || remoteElection.id || electionId}`
          );
          return;
        }

        setElection(remoteElection);
      } catch (error) {
        toast.error('Election not found');
        navigate('/elections');
      }
    };

    loadElection();
  }, [electionId, navigate, electionsLoading]);

  const confirmVote = async () => {
    if (!selectedCandidate) return;

    setIsSubmitting(true);

    try {
      await submitVote(electionId, selectedCandidate);
      setShowConfirmation(false);
      setHasVoted(true);
      toast.success('Your vote has been recorded.');
    } catch (error) {
      const backendMessage = error?.response?.data?.message;
      setShowConfirmation(false);

      if (backendMessage?.includes('already voted')) {
        toast.info('You have already voted in this election.');
        navigate(`/results/${election._id || election.id || electionId}`);
      } else {
        toast.error(backendMessage || 'Failed to submit vote. Please retry.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!election) {
    return <Spinner />;
  }

  const electionKey = election._id || election.id;

  if (hasVoted) {
    return (
      <div className='py-12 max-w-lg mx-auto text-center'>
        <div className='h-14 w-14 rounded-full bg-success-100 text-success-700 flex items-center justify-center mx-auto mb-5'>
          <FiCheckCircle className='h-7 w-7' aria-hidden='true' />
        </div>
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>
          Your vote has been recorded
        </h1>
        <p className='text-sm text-gray-600 mb-7'>
          Thank you for voting in{' '}
          <span className='font-semibold text-gray-900'>{election.title}</span>.
          Your ballot is counted but never linked to you.
        </p>
        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <Button to={`/results/${electionKey}`} icon={FiBarChart2}>
            View results
          </Button>
          <Button to='/elections' variant='secondary'>
            Back to elections
          </Button>
        </div>
      </div>
    );
  }

  const selectedCandidateData = election.candidates.find(
    (c) => (c._id || c.id) === selectedCandidate
  );
  const timing = timingLabel(election);

  return (
    <div className='py-8 max-w-3xl mx-auto'>
      <PageHeader
        title={election.title}
        description={election.description}
        back={{ to: '/elections', label: 'Back to elections' }}
        meta={
          <div className='flex flex-wrap items-center gap-3'>
            <StatusBadge status={election.status} />
            <span className='inline-flex items-center gap-1.5 text-xs text-gray-500'>
              <FiClock className='w-3.5 h-3.5' aria-hidden='true' />
              {timing.text}
            </span>
          </div>
        }
      />

      {isAdminLike ? (
        <Card accent='warning' className='mb-6'>
          <div className='flex gap-3'>
            <FiAlertTriangle
              className='w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5'
              aria-hidden='true'
            />
            <div>
              <p className='text-sm font-medium text-gray-900 mb-1'>
                Administrator accounts cannot vote
              </p>
              <p className='text-sm text-gray-600 mb-3'>
                You are signed in as {user.role}. Admin accounts manage
                elections and voters, but never cast ballots.
              </p>
              <Button to='/admin' size='sm' variant='secondary'>
                Go to admin dashboard
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card accent='primary' className='mb-6'>
          <div className='flex gap-3'>
            <FiLock
              className='w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5'
              aria-hidden='true'
            />
            <p className='text-sm text-gray-600 mb-0'>
              Choose one candidate and confirm. Your ballot is counted without
              being linked to your identity, and{' '}
              <span className='font-medium text-gray-900'>
                cannot be changed once submitted
              </span>
              .
            </p>
          </div>
        </Card>
      )}

      <Card padded={false}>
        <fieldset className='p-5' disabled={isAdminLike || isSubmitting}>
          <legend className='text-sm font-semibold text-gray-900 mb-1'>
            Select your candidate
          </legend>
          <p className='text-xs text-gray-500 mb-4'>
            {election.candidates.length} candidates standing in this election.
          </p>

          <div className='grid gap-3 sm:grid-cols-2'>
            {election.candidates.map((candidate) => {
              const id = candidate._id || candidate.id;

              return (
                <CandidateOption
                  key={id}
                  candidate={candidate}
                  selected={selectedCandidate === id}
                  disabled={isAdminLike || isSubmitting}
                  onSelect={setSelectedCandidate}
                />
              );
            })}
          </div>
        </fieldset>

        <div className='px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex flex-col sm:flex-row sm:justify-end gap-3'>
          <Button
            variant='secondary'
            onClick={() => navigate('/elections')}
            disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={!selectedCandidate || isAdminLike || isSubmitting}
            icon={FiCheckCircle}>
            Review and submit
          </Button>
        </div>
      </Card>

      <Modal
        open={showConfirmation}
        onClose={() => !isSubmitting && setShowConfirmation(false)}
        title='Confirm your vote'
        subtitle='This cannot be undone once submitted.'
        icon={
          <div className='h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center'>
            <FiCheckCircle className='h-5 w-5 text-primary-600' />
          </div>
        }
        footer={
          <div className='flex flex-col sm:flex-row gap-3'>
            <Button
              variant='secondary'
              block
              onClick={() => setShowConfirmation(false)}
              disabled={isSubmitting}>
              Go back
            </Button>
            <Button
              block
              onClick={confirmVote}
              disabled={isSubmitting}
              icon={isSubmitting ? undefined : FiCheckCircle}>
              {isSubmitting ? 'Submitting…' : 'Confirm vote'}
            </Button>
          </div>
        }>
        <p className='text-sm text-gray-600 mb-4'>
          You are casting your vote in{' '}
          <span className='font-medium text-gray-900'>{election.title}</span>{' '}
          for:
        </p>

        <div className='flex items-center gap-4 p-4 rounded-xl bg-primary-50 ring-1 ring-primary-100'>
          <span
            className='flex-shrink-0 h-12 w-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-base font-semibold'
            aria-hidden='true'>
            {initialsOf(selectedCandidateData?.name)}
          </span>
          <span>
            <span className='block text-sm font-semibold text-gray-900'>
              {selectedCandidateData?.name}
            </span>
            {selectedCandidateData?.party && (
              <span className='block text-xs text-gray-600'>
                {selectedCandidateData.party}
              </span>
            )}
          </span>
        </div>
      </Modal>
    </div>
  );
};

export default Vote;
