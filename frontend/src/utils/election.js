import { format, formatDistanceToNowStrict, isAfter, isBefore } from 'date-fns';

/**
 * Presentation metadata for each election status.
 *
 * Status was previously styled ad hoc on every page — green here, gray there,
 * a different label each time. This is the single source of truth for what a
 * status is called and how it looks.
 *
 * `rank` drives ordering: what a voter can act on comes first, then what is
 * coming, then what is over. Sorting by date alone buried the only open
 * ballot below five finished elections.
 */
export const STATUS_META = {
  active: {
    label: 'Open for voting',
    short: 'Open',
    rank: 0,
    pill: 'bg-success-50 text-success-700 ring-1 ring-success-200',
    dot: 'bg-success-500',
  },
  upcoming: {
    label: 'Opens soon',
    short: 'Upcoming',
    rank: 1,
    pill: 'bg-primary-50 text-primary-700 ring-1 ring-primary-200',
    dot: 'bg-primary-500',
  },
  draft: {
    label: 'Draft',
    short: 'Draft',
    rank: 2,
    pill: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    dot: 'bg-gray-400',
  },
  completed: {
    label: 'Closed',
    short: 'Closed',
    rank: 3,
    pill: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    dot: 'bg-gray-400',
  },
  cancelled: {
    label: 'Cancelled',
    short: 'Cancelled',
    rank: 4,
    pill: 'bg-danger-50 text-danger-700 ring-1 ring-danger-200',
    dot: 'bg-danger-500',
  },
};

const FALLBACK = STATUS_META.draft;

/**
 * Look up the presentation metadata for an election's status.
 *
 * @param {string} [status] - Raw status from the API, any casing.
 * @returns {typeof FALLBACK} Metadata for the status, falling back to draft.
 */
export const statusMeta = (status) =>
  STATUS_META[String(status || '').toLowerCase()] || FALLBACK;

/**
 * Order elections so the ones a voter can act on come first.
 *
 * Within a status group, open and upcoming elections are sorted by the date
 * that matters next (when they close, or when they open), and finished ones by
 * how recently they ended.
 *
 * @param {Object[]} elections - Elections to order.
 * @returns {Object[]} A new, sorted array.
 */
export const sortForVoter = (elections = []) =>
  [...elections].sort((a, b) => {
    const rankDiff = statusMeta(a.status).rank - statusMeta(b.status).rank;
    if (rankDiff !== 0) return rankDiff;

    const status = String(a.status || '').toLowerCase();

    if (status === 'active') {
      return new Date(a.endDate || 0) - new Date(b.endDate || 0);
    }

    if (status === 'upcoming') {
      return new Date(a.startDate || 0) - new Date(b.startDate || 0);
    }

    return new Date(b.endDate || 0) - new Date(a.endDate || 0);
  });

/**
 * Format an absolute date for display, tolerating missing or invalid values.
 *
 * @param {string|Date} [value] - Date to format.
 * @param {string} [pattern] - date-fns format pattern.
 * @returns {string} Formatted date, or an em dash when unavailable.
 */
export const formatDate = (value, pattern = 'd MMM yyyy') => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return format(date, pattern);
};

/**
 * Describe, in plain language, the deadline that matters for an election.
 *
 * A date on its own ("Ends: Jul 15, 2026 20:00") makes the reader do the
 * arithmetic. This answers the question they actually have: how long do I
 * have, or how long ago did it finish.
 *
 * @param {Object} election - Election document.
 * @returns {{ text: string, urgent: boolean }} Human-readable timing and
 *   whether it deserves emphasis.
 */
export const timingLabel = (election) => {
  const now = new Date();
  const status = String(election?.status || '').toLowerCase();
  const start = election?.startDate ? new Date(election.startDate) : null;
  const end = election?.endDate ? new Date(election.endDate) : null;

  if (status === 'cancelled') return { text: 'Cancelled', urgent: false };

  if (status === 'active' && end && isAfter(end, now)) {
    const remaining = formatDistanceToNowStrict(end);
    // Under a day left is worth flagging; a month out is not.
    const urgent = end - now < 24 * 60 * 60 * 1000;
    return { text: `Closes in ${remaining}`, urgent };
  }

  if (status === 'upcoming' && start && isBefore(now, start)) {
    return { text: `Opens in ${formatDistanceToNowStrict(start)}`, urgent: false };
  }

  if (end && isBefore(end, now)) {
    return { text: `Closed ${formatDistanceToNowStrict(end)} ago`, urgent: false };
  }

  if (start) return { text: `Starts ${formatDate(start)}`, urgent: false };

  return { text: 'Dates not set', urgent: false };
};

/**
 * Turnout for an election, expressed as a share of the eligible electorate.
 *
 * @param {Object} election - Election document.
 * @returns {{ votes: number, eligible: number|null, percent: number|null }}
 */
export const turnoutOf = (election) => {
  // `voted` is the turnout counter the vote path increments, and the figure
  // the results endpoint reports. `votersCount` is derived from the roll,
  // which imported data may not carry — preferring it here made cards read
  // "0 votes cast" for elections whose results page showed hundreds.
  const votes = election?.voted ?? election?.votersCount ?? 0;
  const eligible = election?.eligibleVotersCount ?? null;

  return {
    votes,
    eligible,
    percent: eligible ? Math.round((votes / eligible) * 100) : null,
  };
};
