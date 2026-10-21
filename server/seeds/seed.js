/* CommonJS seed - run with `npm run seed` (requires DATABASE_URL + `npx prisma generate`) */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const demoPassword = await bcrypt.hash('Demo@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskgenius.com' },
    update: {},
    create: {
      email: 'admin@taskgenius.com',
      name: 'Admin',
      password: adminPassword,
      role: 'admin',
      dailyTarget: 10,
    },
  });

  const demo = await prisma.user.upsert({
    where: { email: 'demo@taskgenius.com' },
    update: {},
    create: {
      email: 'demo@taskgenius.com',
      name: 'Demo User',
      password: demoPassword,
      role: 'user',
      goals: 'Ship TaskGenius, stay consistent with daily targets, and protect deep-work time.',
      dailyTarget: 5,
    },
  });

  const existingTasks = await prisma.task.count({ where: { userId: demo.id } });
  if (existingTasks === 0) {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    await prisma.task.createMany({
      data: [
        {
          userId: demo.id,
          title: 'Review project roadmap',
          description: 'Align Q-next priorities with the team.',
          priority: 'high',
          category: 'work',
          status: 'completed',
          estimatedDuration: 45,
          deadline: new Date(now - 2 * hour),
          completedAt: new Date(now - 3 * hour),
        },
        {
          userId: demo.id,
          title: 'Finish analytics dashboard fixes',
          description: 'Reconcile client/server response shapes.',
          priority: 'high',
          category: 'work',
          status: 'in-progress',
          estimatedDuration: 90,
          deadline: new Date(now + 3 * hour),
        },
        {
          userId: demo.id,
          title: '30 minute focus session',
          priority: 'medium',
          category: 'study',
          status: 'pending',
          estimatedDuration: 30,
          deadline: new Date(now + 6 * hour),
        },
        {
          userId: demo.id,
          title: 'Evening workout',
          priority: 'low',
          category: 'health',
          status: 'pending',
          estimatedDuration: 60,
          deadline: new Date(now + 10 * hour),
        },
        {
          userId: demo.id,
          title: 'Read 20 pages',
          priority: 'medium',
          category: 'personal',
          status: 'pending',
          estimatedDuration: 30,
          deadline: new Date(now + 26 * hour),
        },
      ],
    });
  }

  console.log('Seed completed:', admin.email, demo.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
