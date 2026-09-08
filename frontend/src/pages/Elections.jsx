import { useMemo, useState } from 'react';
import { useElection } from '../context/ElectionContext.jsx';
import { TableSkeleton } from '../components/ui/Loaders.jsx';
import {
  FiCheckCircle,
  FiBarChart2,
  FiClock,
  FiInbox,
  FiUsers,
  FiAlertCircle,
} from 'react-icons/fi';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import FilterTabs from '../components/ui/FilterTabs.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import {
  sortForVoter,
  timingLabel,
  formatDate,
  turnoutOf,
} from '../utils/election.js';
import usePageMeta from '../lib/pageMeta';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open', statuses: ['active'] },
  { id: 'upcoming', label: 'Upcoming', statuses: ['upcoming'] },
  { id: 'closed', label: 'Closed', statuses: ['completed', 'cancelled'] },
];

/**
 * One election in the list.
 *
 * The card leads with what the voter can do about it. Every card previously
 * repeated a sentence of boilerplate ("This election has ended. You can view
 * the final results.") which added a line of noise per row without saying
 * anything the status pill did not.
 */
const ElectionCard = ({ election, hasVoted }) => {
  const id = election._id || election.id;
  const status = String(election.status || '').toLowerCase();
  const timing = timingLabel(election);

  const isOpen = status === 'active';
  const isClosed = status === 'completed';
  const { votes } = turnoutOf(election);

  return (
    <Card
      interactive
      padded={false}
      className='flex flex-col h-full overflow-hidden'>
      <div className='p-5 flex-1 flex flex-col'>
        <div className='flex items-start justify-between gap-3 mb-3'>
          <StatusBadge status={election.status} />
          {hasVoted && (
            <span className='inline-flex items-center gap-1 text-xs font-medium text-success-700'>
              <FiCheckCircle className='w-3.5 h-3.5' aria-hidden='true' />
              You voted
            </span>
          )}
        </div>

        <h2 className='text-base font-semibold text-gray-900 leading-snug mb-1.5'>
          {election.title || 'Untitled election'}
        </h2>

        <p className='text-sm text-gray-600 line-clamp-2 mb-4'>
          {election.description || 'No description provided.'}
        </p>

        {/* Timing and turnout sit together at the bottom so cards in a row
            line up regardless of how long the description runs. */}
        <div className='mt-auto space-y-2'>
          <p
            className={`flex items-center gap-1.5 text-xs mb-0 ${
              timing.urgent ? 'text-warning-700 font-medium' : 'text-gray-500'
            }`}>
            <FiClock className='w-3.5 h-3.5 flex-shrink-0' aria-hidden='true' />
            {timing.text}
          </p>
          <p className='flex items-center gap-1.5 text-xs text-gray-500 mb-0'>
            <FiUsers className='w-3.5 h-3.5 flex-shrink-0' aria-hidden='true' />
            {votes.toLocaleString()} {votes === 1 ? 'vote' : 'votes'} cast
            <span className='text-gray-300'>·</span>
            {formatDate(election.startDate)} – {formatDate(election.endDate)}
          </p>
        </div>
      </div>

      <div className='px-5 py-3 border-t border-gray-100 bg-gray-50/60'>
        {isOpen && !hasVoted && (
          <Button to={`/vote/${id}`} size='sm' block icon={FiCheckCircle}>
            Cast your vote
          </Button>
        )}
        {isOpen && hasVoted && (
          <Button
            to={`/results/${id}`}
            size='sm'
            variant='secondary'
            block
            icon={FiBarChart2}>
            View live results
          </Button>
        )}
        {isClosed && (
          <Button
            to={`/results/${id}`}
            size='sm'
            variant='secondary'
            block
            icon={FiBarChart2}>
            View final results
          </Button>
        )}
        {!isOpen && !isClosed && (
          <p className='text-xs text-gray-500 text-center mb-0 py-1'>
            {status === 'cancelled'
              ? 'This election was cancelled.'
              : 'Voting has not opened yet.'}
          </p>
        )}
      </div>
    </Card>
  );
};

const Elections = () => {
  // Which elections an institution is running is that institution's business.
  usePageMeta('Elections', 'Elections you are eligible to vote in.', { noindex: true });
  const { elections, loading, error } = useElection();
  const [filter, setFilter] = useState('all');

  const ordered = useMemo(
    () => sortForVoter(Array.isArray(elections) ? elections : []),
    [elections]
  );

  const counts = useMemo(() => {
    const tally = { all: ordered.length };

    FILTERS.filter((f) => f.statuses).forEach((f) => {
      tally[f.id] = ordered.filter((e) =>
        f.statuses.includes(String(e.status || '').toLowerCase())
      ).length;
    });

    return tally;
  }, [ordered]);

  const visible = useMemo(() => {
    const active = FILTERS.find((f) => f.id === filter);
    if (!active?.statuses) return ordered;

    return ordered.filter((e) =>
      active.statuses.includes(String(e.status || '').toLowerCase())
    );
  }, [ordered, filter]);

  const openCount = counts.open || 0;

  if (loading) {
    return (
      <div className='py-8'>
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className='py-8'>
        <EmptyState
          icon={FiAlertCircle}
          title='We could not load your elections'
          description='Something went wrong reaching the server. Refresh the page, or contact your administrator if it keeps happening.'
          action={
            <Button onClick={() => window.location.reload()}>Try again</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className='py-8'>
      <PageHeader
        title='Elections'
        description={
          openCount > 0
            ? `You have ${openCount} ${
                openCount === 1 ? 'ballot' : 'ballots'
              } open for voting.`
            : 'Every election you are eligible for, newest activity first.'
        }
        meta={
          ordered.length > 0 && (
            <FilterTabs
              label='Filter elections by status'
              options={FILTERS.map((f) => ({
                id: f.id,
                label: f.label,
                count: counts[f.id] ?? 0,
              }))}
              value={filter}
              onChange={setFilter}
            />
          )
        }
      />

      {ordered.length === 0 && (
        <EmptyState
          icon={FiInbox}
          title='No elections yet'
          description='Once an administrator publishes an election for your organisation, it will appear here.'
          action={<Button to='/'>Back to home</Button>}
        />
      )}

      {ordered.length > 0 && visible.length === 0 && (
        <EmptyState
          icon={FiInbox}
          title='Nothing in this view'
          description='There are no elections with this status right now.'
          action={
            <Button variant='secondary' onClick={() => setFilter('all')}>
              Show all elections
            </Button>
          }
        />
      )}

      {visible.length > 0 && (
        <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {visible.map((election) => (
            <ElectionCard
              key={election._id || election.id}
              election={election}
              hasVoted={!!election.hasVotedForCurrentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Elections;
