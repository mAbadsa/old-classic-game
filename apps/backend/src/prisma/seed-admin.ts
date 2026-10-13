// Creates or updates the admin account from .env. Run with `npm run seed:admin`.
// Same bare-`node` client setup as seed.ts (see the comment there for why).
//
// Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_USERNAME so no
// password lives in committed code. Re-running updates the existing admin's
// password and forces role=admin, status=active.
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});

const SALT_ROUNDS = 12;

async function main() {
  const email = process.env['ADMIN_EMAIL'];
  const password = process.env['ADMIN_PASSWORD'];
  const username = process.env['ADMIN_USERNAME'] ?? 'admin';
  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in apps/backend/.env first.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const existing = await db.orm.public.User.where((u) => u.email.eq(email)).first();

  if (existing) {
    await db.orm.public.User.where((u) => u.id.eq(existing.id)).update({
      passwordHash,
      role: 'admin',
      status: 'active',
    });
    console.log(`Updated admin ${email}`);
  } else {
    await db.orm.public.User.create({ email, username, passwordHash, role: 'admin', status: 'active' });
    console.log(`Created admin ${email}`);
  }
}

await main();
process.exit(0);
