import Election from '../models/Election.js';
import User from '../models/User.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../errors/customErrors.js';
import { APIFeatures, deleteOne } from '../utils/handleAPI.js';
import {
  serializeElection,
  serializeElections,
} from '../utils/serializeElection.js';

/**
 * Count the accounts eligible to cast a ballot: active, non-administrative
 * users. Used to express turnout as a share of the electorate.
 *
 * @returns {Promise<number|undefined>} The count, or `undefined` if it could
 *   not be computed — the frontend falls back to its own estimate.
 */
const countEligibleVoters = async () => {
  try {
    return await User.countDocuments({
      role: { $nin: ['admin', 'sysadmin'] },
      status: 'active',
    });
  } catch (err) {
    console.error('Failed to compute eligibleVotersCount:', err);
    return undefined;
  }
};

// Get all elections (with filtering, search, pagination via APIFeatures)
export const getElections = async (req, res) => {
  const pageSize = 10;

  const features = new APIFeatures(Election.find(), req.query)
    .search()
    .filter()
    .sort()
    .limitFields()
    .paginate(pageSize);

  // Reuse the same filters for the count so `total` describes the result set
  // rather than the whole collection.
  const [elections, total] = await Promise.all([
    features.query,
    Election.countDocuments(features.query.getFilter()),
  ]);

  res.status(200).json({
    success: true,
    data: serializeElections(elections, req.user),
    meta: {
      pagination: {
        page: Number(req.query.page) || 1,
        pageSize: Number(req.query.limit) || pageSize,
        pageCount: elections.length,
        total,
      },
    },
  });
};

// Get single election
export const getElection = async (req, res) => {
  const electionDoc = await Election.findById(req.params.id);

  if (!electionDoc) {
    throw new NotFoundError('Election not found');
  }

  const election = serializeElection(electionDoc, req.user);

  const eligibleVotersCount = await countEligibleVoters();
  if (eligibleVotersCount !== undefined) {
    election.eligibleVotersCount = eligibleVotersCount;
  }

  res.json(election);
};

// Create election (admin only)
export const createElection = async (req, res) => {
  const { title, description, startDate, endDate, candidates = [] } = req.body;

  if (!title) {
    throw new BadRequestError('Title is required');
  }

  // For new elections, we'll let the pre-save hook handle status
  // based on the provided dates and validation rules
  const election = new Election({
    title,
    description,
    startDate: startDate || null,
    endDate: endDate || null,
    candidates,
    status: 'draft', // Default status
    createdBy: req.user.id,
  });

  await election.save();
  res.status(201).json(serializeElection(election, req.user));
};

// Update election (admin only)
export const updateElection = async (req, res) => {
  const { title, description, startDate, endDate, candidates } = req.body;

  const election = await Election.findById(req.params.id);

  if (!election) {
    throw new NotFoundError('Election not found');
  }

  // Only update fields that were provided (status is computed from dates)
  if (title !== undefined) election.title = title;
  if (description !== undefined) election.description = description;
  if (startDate !== undefined) election.startDate = startDate;
  if (endDate !== undefined) election.endDate = endDate;
  if (candidates !== undefined) election.candidates = candidates;

  await election.save();

  res.json(serializeElection(election, req.user));
};

// Update election status (admin only) - only allow cancelling
export const updateElectionStatus = async (req, res) => {
  const { status } = req.body;

  if (!status) {
    throw new BadRequestError('Status is required');
  }

  if (status !== 'cancelled') {
    throw new BadRequestError(
      'Status can only be set to cancelled manually; other states are computed from dates'
    );
  }

  const election = await Election.findById(req.params.id);

  if (!election) {
    throw new NotFoundError('Election not found');
  }

  election.status = 'cancelled';

  await election.save();

  res.json(serializeElection(election, req.user));
};

// Get elections by status (delegates to getElections with a status preset)
export const getElectionsByStatus = async (req, res, next) => {
  const { status } = req.params;

  const validStatuses = [
    'draft',
    'upcoming',
    'active',
    'completed',
    'cancelled',
  ];

  if (status && !validStatuses.includes(status)) {
    throw new BadRequestError('Invalid status');
  }

  // Inject status into the query so getElections can filter on it
  req.query.status = status;

  return getElections(req, res, next);
};

// Delete election (admin only)
export const deleteElection = deleteOne(Election);

export const deleteAllElections = async (req, res) => {
  const result = await Election.deleteMany({});

  res.status(200).json({
    success: true,
    deletedCount: result.deletedCount,
    message: 'All elections have been deleted',
  });
};

// Cast a vote in an election (authenticated user).
//
// This is the single implementation behind both POST /elections/:id/vote and
// POST /voters/election/:electionId, which is why it accepts either param
// name. Keeping one hardened path avoids the situation where the alternate
// route quietly skips a check the main one enforces.
export const voteElection = async (req, res) => {
  const id = req.params.id || req.params.electionId;
  const { candidateId } = req.body;

  if (!candidateId) {
    throw new BadRequestError('candidateId is required');
  }

  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    throw new ForbiddenError('You must be authenticated to vote');
  }

  // Prevent admin and sysadmin accounts from voting in elections
  if (userRole === 'admin' || userRole === 'sysadmin') {
    throw new ForbiddenError(
      `${userRole} accounts are not allowed to vote in elections`
    );
  }

  // Ensure only active users can vote
  const voter = await User.findById(userId).select('status');

  if (!voter) {
    throw new ForbiddenError(
      'Your account could not be found. Please contact support.'
    );
  }

  if (String(voter.status).toLowerCase() !== 'active') {
    throw new ForbiddenError(
      'Your account is not active. Inactive users cannot cast votes.'
    );
  }

  const election = await Election.findById(id);

  if (!election) {
    throw new NotFoundError('Election not found');
  }

  // Ensure candidate exists in this election
  const candidateExists = election.candidates.some(
    (candidate) => String(candidate._id) === String(candidateId)
  );

  if (!candidateExists) {
    throw new BadRequestError(
      'Selected candidate does not belong to this election'
    );
  }

  // Record the ballot as a single conditional update rather than a
  // read-modify-write. Every precondition that must hold at the moment of the
  // write — the election is open, and this voter is not already on the roll —
  // is part of the filter, so two ballots arriving at once cannot both read a
  // stale document and clobber each other's tally.
  //
  // The dates, not the stored status, decide whether the election is open. A
  // status field only moves when something writes to it, so an election whose
  // start time has passed can still be sitting at `upcoming`; refusing that
  // ballot would close a poll that is genuinely open. Statuses that must never
  // accept a ballot regardless of the calendar — draft and cancelled — are
  // excluded explicitly, and the status is corrected in the same write.
  const now = new Date();

  const updated = await Election.findOneAndUpdate(
    {
      _id: id,
      status: { $in: ['upcoming', 'active'] },
      startDate: { $lte: now },
      endDate: { $gte: now },
      voters: { $ne: userId },
    },
    {
      $set: { status: 'active' },
      $push: { voters: userId },
      $inc: { voted: 1, [`results.${candidateId}`]: 1 },
    },
    { new: true }
  );

  // A null result means one of the preconditions failed. Re-read the document
  // to tell the voter which one, rather than returning a generic rejection.
  if (!updated) {
    const current = await Election.findById(id).select('status voters');

    if (!current) {
      throw new NotFoundError('Election not found');
    }

    const alreadyVoted = current.voters.some(
      (voterId) => String(voterId) === String(userId)
    );

    if (alreadyVoted) {
      throw new BadRequestError('You have already voted in this election');
    }

    throw new BadRequestError('This election is not currently open for voting');
  }

  res.status(200).json(serializeElection(updated, req.user));
};
