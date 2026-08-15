import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

/**
 * Creates (or repairs) the demo accounts that the sign-in page advertises.
 *
 * The login screen lists three click-to-fill accounts. The two administrative
 * ones come from the real data snapshot, but the voter never did — anyone
 * following the on-screen instructions got "incorrect email or password". This
 * script guarantees all three exist with the advertised passwords, and is safe
 * to run repeatedly: existing accounts have their password and role reset
 * rather than being duplicated.
 *
 * Passwords follow the same convention as the other seeders: the part of the
 * email before the first separator, plus `123`.
 */
const DEMO_ACCOUNTS = [
  {
    name: 'System Administrator',
    email: 'sysadmin@evs.ke',
    password: 'sysadmin123',
    role: 'sysadmin',
    description: 'Demo system administrator account.',
  },
  {
    name: 'Administrator',
    email: 'admin@evs.ke',
    password: 'admin123',
    role: 'admin',
    description: 'Demo administrator account.',
  },
  // Not `voter@evs.ke`: the User schema derives a unique `id` from the email
  // prefix, and `voter` is already taken by this account. The sign-in page
  // advertised the shorter address for a while, which is why the demo voter
  // login used to fail.
  {
    name: 'Voter',
    email: 'voter.user@evs.ke',
    password: 'voter123',
    role: 'user',
    description: 'Demo voter account.',
  },
];

const seedDemoAccounts = async () => {
  const url = process.env.MONGO_URL;

  if (!url) {
    console.error('MONGO_URL is not set');
    process.exit(1);
  }

  const DB = url.replace('<PASSWORD>', process.env.MONGO_PASSWORD || '');

  await mongoose.connect(DB);
  console.log(`Connected to ${mongoose.connection.name}`);

  for (const account of DEMO_ACCOUNTS) {
    // `password` is `select: false`, and the pre-save hook is what hashes it,
    // so an existing account has to be loaded and saved rather than updated in
    // place — findOneAndUpdate would store the password as plain text.
    const existing = await User.findOne({ email: account.email })
      .select('+password +active')
      .setOptions({ bypassActiveFilter: true });

    if (existing) {
      existing.name = existing.name || account.name;
      existing.role = account.role;
      existing.status = 'active';
      existing.active = true;
      existing.password = account.password;
      existing.passwordConfirm = account.password;
      await existing.save();
      console.log(`  updated  ${account.email} (${account.role})`);
      continue;
    }

    await User.create({
      ...account,
      passwordConfirm: account.password,
      status: 'active',
    });
    console.log(`  created  ${account.email} (${account.role})`);
  }

  console.log('\nSign in with:');
  DEMO_ACCOUNTS.forEach(({ role, email, password }) =>
    console.log(`  ${role.padEnd(9)} ${email} / ${password}`)
  );

  await mongoose.disconnect();
};

seedDemoAccounts().catch((err) => {
  console.error('Failed to seed demo accounts:', err.message);
  process.exit(1);
});
