import User from '../models/User.js';
import { BadRequestError } from '../errors/customErrors.js';
import { deleteOne, getMany, getOne } from '../utils/handleAPI.js';

// Log out user (GET /user/logout)
export const logout = async (req, res, next) => {
  res.cookie('token', '', { expires: new Date(Date.now()), httpOnly: true });
  delete req.headers.authorization;
  res.status(204).json({ success: true, data: null });
};

// Update current user (PATCH /users/me)
export const updateMe = async (req, res) => {
  if (req.body.password || req.body.passwordConfirm || req.body.role) {
    throw new BadRequestError(
      'You cannot update password or role on this route'
    );
  }

  const allowedFields = [
    'name',
    'phone',
    'address',
    'dateOfBirth',
    'gender',
    'status',
  ];
  const updateInfo = {};

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updateInfo[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, updateInfo, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({ success: true, data: user });
};

/******************[ ADMIN CONTROLLERS ]******************/
// Update user role (PATCH admin/user/:id)
export const updateUser = async (req, res) => {
  if (req.body.password || req.body.passwordConfirm || req.body.role)
    throw new BadRequestError(
      'You cannot update password or role on this route'
    );

  const allowedFields = [
    'name',
    'phone',
    'address',
    'dateOfBirth',
    'gender',
    'status',
  ];
  const updateInfo = {};

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updateInfo[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(req.params.id, updateInfo, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({ success: true, data: user });
};

export const getUsers = getMany(User);

export const getUser = getOne(User);

export const deleteUser = deleteOne(User);

// The demo voter is spared so the account advertised on the sign-in page keeps
// working after a purge.
const DEMO_VOTER_EMAIL = 'voter.user@evs.ke';

export const deleteNonAdminUsers = async (req, res) => {
  const result = await User.deleteMany({
    role: { $nin: ['admin', 'sysadmin'] },
    email: { $ne: DEMO_VOTER_EMAIL },
  });

  res.status(200).json({
    success: true,
    deletedCount: result.deletedCount,
    message: `All non-admin and non-sysadmin users (except ${DEMO_VOTER_EMAIL}) have been deleted`,
  });
};
