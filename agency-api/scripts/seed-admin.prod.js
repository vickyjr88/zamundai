/* eslint-disable no-console */
const { config } = require('dotenv');
const bcrypt = require('bcrypt');

config();

function loadDistModule(paths) {
  for (const path of paths) {
    try {
      return require(path);
    } catch {
      // Try next possible dist layout.
    }
  }

  throw new Error(
    'Could not load compiled modules from dist. Run npm run build first.',
  );
}

const dataSourceModule = loadDistModule([
  '../dist/database/data-source',
  '../dist/src/database/data-source',
]);

const userEntityModule = loadDistModule([
  '../dist/users/entities/user.entity',
  '../dist/src/users/entities/user.entity',
]);

const dataSource = dataSourceModule.default || dataSourceModule.dataSource || dataSourceModule;
const { User } = userEntityModule;

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
      telegramId: null,
      paystackCustomerId: null,
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
