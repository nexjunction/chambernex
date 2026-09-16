import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = 'nexjunction@gmail.com';
  // Hash the password properly just in case, though the bypass handles plain text
  const hashedPassword = await bcrypt.hash('2320587NexJunction!@', 10);

  // Upsert ensures it creates it if missing, or updates it if it exists
  const superAdmin = await prisma.user.upsert({
    where: { email: targetEmail },
    update: {
      role: 'ADMIN',
      position: 'Super Admin',
      subStatus: 'ACTIVE',
      password: hashedPassword,
    },
    create: {
      email: targetEmail,
      name: 'Super Admin',
      position: 'Super Admin',
      role: 'ADMIN',
      password: hashedPassword,
      subStatus: 'ACTIVE',
      planType: 'LIFETIME',
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  console.log('✅ Super Admin record verified/created for:', superAdmin.email);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });