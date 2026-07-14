import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskgenius.com' },
    update: {},
    create: {
      email: 'admin@taskgenius.com',
      name: 'Admin',
      password: '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Qm0n0n0n0n0n0n0n0n0n0',
      role: 'admin',
      dailyTarget: 10,
    },
  });
  console.log('Seed completed:', admin.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
