import express from 'express';
import {
  getElections,
  getElection,
  createElection,
  updateElection,
  deleteElection,
  updateElectionStatus,
  getElectionsByStatus,
  voteElection,
  deleteAllElections,
} from '../controllers/electionController.js';
import {
  authenticate,
  optionalAuthenticate,
  authorizeRoles,
} from '../middleware/auth.js';
const router = express.Router();

/******************[ PUBLIC ROUTES ]******************/
// Anyone can view elections and their status. Optional authentication lets a
// signed-in viewer see which ballots they have already cast, and lets admins
// see tallies that are still withheld from the public.
router.route('/').get(optionalAuthenticate, getElections);
router.route('/status/:status').get(optionalAuthenticate, getElectionsByStatus);
router.route('/:id').get(optionalAuthenticate, getElection);

// Cast a vote in an election (authenticated users)
router.route('/:id/vote').post(authenticate, voteElection);

/******************[ ADMIN ROUTES ]******************/
// Both admin and sysadmin can manage elections
const adminRoles = ['admin', 'sysadmin'];

// Create new election
router
  .route('/')
  .post(authenticate, authorizeRoles(adminRoles), createElection);

// Update and delete election
router
  .route('/:id')
  .patch(authenticate, authorizeRoles(adminRoles), updateElection)
  .delete(authenticate, authorizeRoles(adminRoles), deleteElection);

router
  .route('/purge/all')
  .delete(authenticate, authorizeRoles(['sysadmin']), deleteAllElections);

// Update election status
router
  .route('/:id/status')
  .patch(authenticate, authorizeRoles(adminRoles), updateElectionStatus);

export default router;
