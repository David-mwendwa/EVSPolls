import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = path.join(__dirname, '../../data/exports');

dotenv.config();

/**
 * Restores the users and elections collections from the newest snapshot in
 * `data/exports`, which is what `export:users` / `export:elections` write.
 *
 * The faker seeders invent data; this one puts back the real thing, with the
 * original `_id`s so the references elections hold to their creator and voters
 * still point at the right people.
 *
 * Passwords are not exported (the field is `select: false`), so accounts are
 * restored with the same derived password the user seeder uses: the part of
 * the email before the first separator, plus `123` — `admin@evs.ke` becomes
 * `admin123`.
 */

/** @param {string} email @returns {string} */
const derivePassword = (email) =>
  `${email.split('@')[0].split(/[._-]/)[0].toLowerCase()}123`;

/**
 * Finds the most recent export file for a collection.
 * @param {string} prefix
 * @returns {Promise<string>} absolute path
 */
const newestExport = async (prefix) => {
  const files = (await readdir(EXPORTS_DIR))
    .filter((f) => f.startsWith(`${prefix}-export-`) && f.endsWith('.json'))
    .sort();
  if (!files.length) {
    throw new Error(`No ${prefix} export found in data/exports`);
  }
  return path.join(EXPORTS_DIR, files[files.length - 1]);
};

/** @param {string} file @returns {Promise<any[]>} */
const readSnapshot = async (file) => {
  const parsed = JSON.parse(await readFile(file, 'utf-8'));
  const rows = Array.isArray(parsed) ? parsed : parsed.data || [];
  console.log(`  ${path.basename(file)} → ${rows.length} documents`);
  return rows;
};

const restore = async () => {
  const url = process.env.MONGO_URL;
  if (!url) {
    console.error('MONGO_URL is not set');
    process.exit(1);
  }

  // The Atlas string sits in the same .env as the local one, so a restore that
  // wipes collections is refused against anything remote unless asked twice.
  const isLocal = /localhost|127\.0\.0\.1|mongo:27017/.test(url);
  if (!isLocal && !process.argv.includes('--force')) {
    console.error(
      `Refusing to wipe a non-local database (${url.replace(/\/\/[^@]+@/, '//***@')}).\n` +
        'Re-run with --force if that is really the intent.'
    );
    process.exit(1);
  }

  console.log('Reading snapshot...');
  const [users, elections] = await Promise.all([
    newestExport('users').then(readSnapshot),
    newestExport('elections').then(readSnapshot),
  ]);

  await mongoose.connect(url);
  console.log(`Connected to ${mongoose.connection.name}`);

  const User = (await import('../models/User.js')).default;
  const Election = (await import('../models/Election.js')).default;

  await Promise.all([User.deleteMany({}), Election.deleteMany({})]);
  console.log('Cleared existing users and elections');

  let restored = 0;
  const failures = [];

  for (const row of users) {
    const password = derivePassword(row.email);
    try {
      // Plain text on both fields: the model's pre-save hook does the hashing,
      // so handing it an already-hashed value would hash it twice and leave
      // nobody able to sign in.
      await new User({ ...row, password, passwordConfirm: password }).save();
      restored += 1;
    } catch (error) {
      failures.push(`${row.email}: ${error.message}`);
    }
  }
  console.log(`Users restored: ${restored}/${users.length}`);

  const inserted = await Election.insertMany(elections, { ordered: false });
  console.log(`Elections restored: ${inserted.length}/${elections.length}`);

  if (failures.length) {
    console.log(`\n${failures.length} user(s) failed:`);
    failures.slice(0, 10).forEach((f) => console.log(`  ${f}`));
  }

  const admins = await User.find({ role: { $ne: 'user' } }).select('email role');
  console.log('\nSign in with:');
  admins.forEach((a) =>
    console.log(`  ${a.role.padEnd(9)} ${a.email} / ${derivePassword(a.email)}`)
  );

  await mongoose.disconnect();
};

restore().catch((error) => {
  console.error('Restore failed:', error.message);
  process.exit(1);
});
