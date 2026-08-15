import { authorizeRoles } from '../middleware/auth.js';
import { ForbiddenError } from '../errors/customErrors.js';

const runAuthorize = (middleware, role) => {
  const req = { user: { id: 'user-id', role } };
  let called = false;

  middleware(req, {}, () => {
    called = true;
  });

  return called;
};

describe('authorizeRoles', () => {
  it('lets an allowed role through', () => {
    expect(runAuthorize(authorizeRoles('admin'), 'admin')).toBe(true);
  });

  it('accepts roles passed as an array', () => {
    const middleware = authorizeRoles(['admin', 'sysadmin']);

    expect(runAuthorize(middleware, 'sysadmin')).toBe(true);
  });

  it('accepts roles passed as separate arguments', () => {
    const middleware = authorizeRoles('admin', 'sysadmin');

    expect(runAuthorize(middleware, 'admin')).toBe(true);
  });

  it('rejects a role that is not on the list', () => {
    const middleware = authorizeRoles(['admin', 'sysadmin']);

    expect(() => runAuthorize(middleware, 'user')).toThrow(ForbiddenError);
  });

  it('names the offending role in the error', () => {
    const middleware = authorizeRoles('sysadmin');

    expect(() => runAuthorize(middleware, 'admin')).toThrow(/admin/);
  });
});
