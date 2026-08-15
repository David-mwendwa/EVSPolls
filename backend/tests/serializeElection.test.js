import { jest } from '@jest/globals';
import {
  serializeElection,
  serializeElections,
} from '../utils/serializeElection.js';

const VOTER_A = '507f1f77bcf86cd799439011';
const VOTER_B = '507f1f77bcf86cd799439012';

const buildElection = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439099',
  title: 'Student Council President',
  status: 'active',
  voters: [VOTER_A, VOTER_B],
  voted: 2,
  results: { candidate1: 2 },
  ...overrides,
});

describe('serializeElection', () => {
  it('never sends the roll of who voted', () => {
    const result = serializeElection(buildElection(), { id: VOTER_A });

    expect(result.voters).toBeUndefined();
    expect(result.votersCount).toBe(2);
  });

  it('tells the requesting voter whether they have already voted', () => {
    const election = buildElection();

    expect(serializeElection(election, { id: VOTER_A })).toHaveProperty(
      'hasVotedForCurrentUser',
      true
    );
    expect(
      serializeElection(election, { id: '507f1f77bcf86cd799439013' })
    ).toHaveProperty('hasVotedForCurrentUser', false);
  });

  it('reports no vote for an anonymous request', () => {
    const result = serializeElection(buildElection(), undefined);

    expect(result.hasVotedForCurrentUser).toBe(false);
  });

  it.each(['active', 'completed'])(
    'publishes the tally once the election is %s',
    (status) => {
      const result = serializeElection(buildElection({ status }), undefined);

      expect(result.results).toEqual({ candidate1: 2 });
    }
  );

  it.each(['draft', 'upcoming', 'cancelled'])(
    'withholds the tally while the election is %s',
    (status) => {
      const result = serializeElection(buildElection({ status }), undefined);

      expect(result.results).toBeUndefined();
    }
  );

  it('shows an admin the tally of an election that is still a draft', () => {
    const result = serializeElection(buildElection({ status: 'draft' }), {
      id: 'admin-id',
      role: 'admin',
    });

    expect(result.results).toEqual({ candidate1: 2 });
  });

  it('leaves the stored document untouched', () => {
    const election = buildElection();

    serializeElection(election, { id: VOTER_A });

    expect(election.voters).toHaveLength(2);
  });

  it('converts a mongoose document via toJSON', () => {
    const doc = {
      toJSON: jest.fn(() => buildElection()),
    };

    const result = serializeElection(doc, { id: VOTER_A });

    expect(doc.toJSON).toHaveBeenCalled();
    expect(result.votersCount).toBe(2);
  });

  it('handles an election with no voters yet', () => {
    const result = serializeElection(
      buildElection({ voters: undefined, voted: 0 }),
      { id: VOTER_A }
    );

    expect(result.votersCount).toBe(0);
    expect(result.hasVotedForCurrentUser).toBe(false);
  });
});

describe('serializeElections', () => {
  it('serialises every election in the list', () => {
    const result = serializeElections(
      [buildElection(), buildElection({ status: 'draft' })],
      { id: VOTER_A }
    );

    expect(result).toHaveLength(2);
    expect(result.every((election) => election.voters === undefined)).toBe(
      true
    );
    expect(result[1].results).toBeUndefined();
  });

  it('returns an empty array when given nothing', () => {
    expect(serializeElections(undefined, undefined)).toEqual([]);
  });
});
