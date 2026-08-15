import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Copies every collection from one database to another — documents and
 * indexes, `_id`s preserved — so a local database can be pushed up to Atlas
 * (or one cluster moved to another) without going through the JSON exports,
 * which omit password hashes and the settings collection.
 *
 * Usage:
 *   SOURCE_URL=mongodb://localhost:27017/e-vote \
 *   TARGET_URL='mongodb+srv://.../e-vote' \
 *   npm run db:copy -- --replace
 *
 * SOURCE_URL falls back to MONGO_URL. Existing collections on the target are
 * left alone unless `--replace` is passed.
 */

const BATCH = 500;

/** @param {string} url @returns {string} url with any password masked */
const mask = (url) => url.replace(/\/\/([^:]+):[^@]+@/, '//$1:***@');

const copy = async () => {
  const sourceUrl = process.env.SOURCE_URL || process.env.MONGO_URL;
  const targetUrl = process.env.TARGET_URL;
  const replace = process.argv.includes('--replace');

  if (!sourceUrl || !targetUrl) {
    console.error('Set SOURCE_URL (or MONGO_URL) and TARGET_URL');
    process.exit(1);
  }
  if (sourceUrl === targetUrl) {
    console.error('SOURCE_URL and TARGET_URL are the same database');
    process.exit(1);
  }

  const source = await mongoose.createConnection(sourceUrl).asPromise();
  const target = await mongoose.createConnection(targetUrl).asPromise();
  console.log(`From ${mask(sourceUrl)} (${source.name})`);
  console.log(`To   ${mask(targetUrl)} (${target.name})\n`);

  const collections = (await source.db.listCollections().toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'));

  for (const name of collections) {
    const from = source.db.collection(name);
    const to = target.db.collection(name);

    const existing = await to.countDocuments();
    if (existing > 0) {
      if (!replace) {
        console.log(`${name}: skipped — ${existing} documents already there (use --replace)`);
        continue;
      }
      await to.deleteMany({});
      console.log(`${name}: cleared ${existing} existing documents`);
    }

    const total = await from.countDocuments();
    let copied = 0;
    let batch = [];
    const cursor = from.find({});

    // Batched so a large collection does not have to be held in memory.
    for await (const doc of cursor) {
      batch.push(doc);
      if (batch.length === BATCH) {
        await to.insertMany(batch, { ordered: false });
        copied += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      await to.insertMany(batch, { ordered: false });
      copied += batch.length;
    }

    // Unique constraints (email, id) are part of the schema's guarantees, so
    // they have to come across with the documents.
    let indexes = 0;
    for (const index of await from.indexes()) {
      if (index.name === '_id_') continue;
      const { key, name: indexName, v, ns, ...options } = index;
      try {
        await to.createIndex(key, { name: indexName, ...options });
        indexes += 1;
      } catch (error) {
        console.log(`  index ${indexName} failed: ${error.message}`);
      }
    }

    console.log(`${name}: ${copied}/${total} documents, ${indexes} index(es)`);
  }

  console.log('\nVerifying target:');
  for (const name of collections) {
    console.log(`  ${name}: ${await target.db.collection(name).countDocuments()}`);
  }

  await Promise.all([source.close(), target.close()]);
};

copy().catch((error) => {
  console.error('Copy failed:', error.message);
  process.exit(1);
});
