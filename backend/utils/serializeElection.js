const ADMIN_ROLES = ['admin', 'sysadmin'];

/**
 * Statuses at which a tally may be shown to the public.
 *
 * This mirrors the rule already enforced by the dedicated results endpoint:
 * a draft or upcoming election must not reveal counts, and a cancelled one
 * has no meaningful outcome to publish.
 */
const PUBLIC_RESULT_STATUSES = ['active', 'completed'];

/**
 * Shape an election document for an API response.
 *
 * Two things are deliberately not sent as stored:
 *
 * 1. `voters` — the list of user IDs who have cast a ballot. Turnout is public
 *    information, but the roll of who voted is not, so it is replaced by
 *    `votersCount` plus a `hasVotedForCurrentUser` flag for the requester.
 * 2. `results` — the per-candidate tally, which is withheld until the election
 *    is active or completed so that draft and upcoming elections cannot be
 *    read early. Admins always see it.
 *
 * @param {import('mongoose').Document|Object} election - Election document or
 *   plain object to serialise.
 * @param {{ id?: string, role?: string }} [user] - The authenticated user
 *   making the request, if any.
 * @returns {Object} Plain object safe to send to the client.
 */
export const serializeElection = (election, user) => {
  if (!election) return election;

  // toJSON, not toObject: `results` is a Mongoose Map, and only toJSON
  // flattens it into a plain object. toObject leaves a Map instance behind,
  // which JSON.stringify silently renders as `{}` — every tally reads as zero.
  const plain = election.toJSON ? election.toJSON() : { ...election };

  const voters = Array.isArray(plain.voters) ? plain.voters : [];
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  delete plain.voters;

  plain.votersCount = voters.length;
  plain.hasVotedForCurrentUser = user?.id
    ? voters.some((voterId) => String(voterId) === String(user.id))
    : false;

  if (!isAdmin && !PUBLIC_RESULT_STATUSES.includes(plain.status)) {
    delete plain.results;
  }

  return plain;
};

/**
 * Serialise a list of elections. See {@link serializeElection}.
 *
 * @param {Array<import('mongoose').Document|Object>} elections - Documents to
 *   serialise.
 * @param {{ id?: string, role?: string }} [user] - The authenticated user
 *   making the request, if any.
 * @returns {Object[]} Plain objects safe to send to the client.
 */
export const serializeElections = (elections, user) =>
  (elections || []).map((election) => serializeElection(election, user));
