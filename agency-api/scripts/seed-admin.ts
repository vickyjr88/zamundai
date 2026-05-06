import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import dataSource from '../src/database/data-source';
import { User } from '../src/users/entities/user.entity';

config();

async function run() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim();
  const password = process.env.ADMIN_SEED_PASSWORD?.trim();
  const mobileNumber = process.env.ADMIN_SEED_MOBILE?.trim();
  const name = process.env.ADMIN_SEED_NAME?.trim() || 'Super Admin';

  if (!email || !password || !mobileNumber) {
    throw new Error(
      'Missing admin seed env vars. Required: ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD, ADMIN_SEED_MOBILE',
    );
  }

  if (password.length < 6) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 6 characters');
  }

  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);

  const existing = await userRepo.findOne({
    where: [{ email }, { mobileNumber }],
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    existing.name = name;
    existing.email = email;
    existing.mobileNumber = mobileNumber;
    existing.password = hashedPassword;
    existing.isAdmin = true;
    await userRepo.save(existing);

    console.log(`Updated existing user as admin: ${existing.email} (${existing.id})`);
  } else {
    const admin = userRepo.create({
      name,
      email,
      mobileNumber,
      password: hashedPassword,
      isAdmin: true,
      creditBalance: 0,
      telegramId: null as unknown as string,
      paystackCustomerId: null as unknown as string,
      resetPasswordToken: null,
    });

    const saved = await userRepo.save(admin);
    console.log(`Created admin user: ${saved.email} (${saved.id})`);
  }

  await dataSource.destroy();
}

run()
  .then(() => {
    console.log('Admin seed complete');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Admin seed failed:', error?.message || error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  });
