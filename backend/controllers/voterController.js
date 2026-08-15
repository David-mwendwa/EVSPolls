import Election from '../models/Election.js';
import { NotFoundError, ForbiddenError } from '../errors/customErrors.js';

export { voteElection as castVote } from './electionController.js';

// Get election results
export const getResults = async (req, res) => {
  const election = await Election.findById(req.params.electionId);
  if (!election) {
    throw new NotFoundError('Election not found');
  }

  // Only show results to the public when the election is active or completed
  if (election.status !== 'active' && election.status !== 'completed') {
    throw new ForbiddenError(
      'Results are only available while the election is active or after it is completed'
    );
  }

  const results = election.candidates.map((candidate) => {
    const candidateId = String(candidate._id);
    const votes = election.results ? election.results.get(candidateId) || 0 : 0;

    return {
      id: candidate._id,
      name: candidate.name,
      party: candidate.party,
      gender: candidate.gender,
      votes,
      percentage:
        election.voted > 0 ? ((votes / election.voted) * 100).toFixed(2) : 0,
    };
  });

  results.sort((a, b) => b.votes - a.votes);

  res.json({
    election: {
      id: election._id,
      title: election.title,
      totalVoters: election.voters.length,
      voted: election.voted,
      startDate: election.startDate,
      endDate: election.endDate,
    },
    results,
  });
};
