import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await hashPassword('Admin@1234');
  const userPassword = await hashPassword('User@1234');

  // Create default rooms
  await prisma.room.createMany({
    data: [
      { code: 'Sala 1', name: 'Sala de Cirurgia 1', capacity: 1 },
      { code: 'Sala 2', name: 'Sala de Cirurgia 2', capacity: 1 },
      { code: 'Sala 3', name: 'Sala de Cirurgia 3', capacity: 1 },
      { code: 'Sala 4', name: 'Sala de Cirurgia 4', capacity: 1 }
    ],
    skipDuplicates: true
  });

  // Create test users for role validation
  await prisma.user.upsert({
    where: { email: 'admin@setupso.com' },
    update: {
      fullName: 'Admin SetupSO',
      badgeNumber: 'ADM001',
      corenNumber: 'COREN-ADM-001',
      department: 'Administração',
      function: 'Enfermeiro',
      role: 'Admin',
      password: adminPassword,
    },
    create: {
      email: 'admin@setupso.com',
      fullName: 'Admin SetupSO',
      badgeNumber: 'ADM001',
      corenNumber: 'COREN-ADM-001',
      department: 'Administração',
      function: 'Enfermeiro',
      role: 'Admin',
      password: adminPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@setupso.com' },
    update: {
      fullName: 'Usuário Teste',
      badgeNumber: 'USR001',
      corenNumber: 'COREN-USR-001',
      department: 'Centro Cirúrgico',
      function: 'Técnico',
      role: 'User',
      password: userPassword,
    },
    create: {
      email: 'user@setupso.com',
      fullName: 'Usuário Teste',
      badgeNumber: 'USR001',
      corenNumber: 'COREN-USR-001',
      department: 'Centro Cirúrgico',
      function: 'Técnico',
      role: 'User',
      password: userPassword,
    },
  });

  // Create default status legends
  await prisma.statusLegend.createMany({
    data: [
      { status: 'LIBERADO', color: '#10b981', label: 'Sala liberada' },
      { status: 'EM_PREPARO', color: '#f59e0b', label: 'Em preparo' },
      { status: 'EM_TRANSPORTE', color: '#3b82f6', label: 'Paciente em transporte' },
      { status: 'EM_ATRASO', color: '#ef4444', label: 'Em atraso' },
      { status: 'TERMINO_CIRURGIA', color: '#8b5cf6', label: 'Término da cirurgia' },
      { status: 'PACIENTE_RPA', color: '#06b6d4', label: 'Paciente em RPA' },
      { status: 'ADIANTADO', color: '#14b8a6', label: 'Adiantado' },
      { status: 'INICIO_CIRURGIA', color: '#f97316', label: 'Início da cirurgia' },
      { status: 'TERMINO_ANESTESIA', color: '#6366f1', label: 'Término da anestesia' },
      { status: 'INICIO_ANESTESIA', color: '#a855f7', label: 'Início da anestesia' }
    ],
    skipDuplicates: true
  });

  // Create default card config fields
  await prisma.cardConfig.createMany({
    data: [
      { fieldName: 'roomCode', label: 'Sala', visible: true, order: 1 },
      { fieldName: 'patientName', label: 'Paciente', visible: true, order: 2 },
      { fieldName: 'procedureName', label: 'Procedimento', visible: true, order: 3 },
      { fieldName: 'surgeonName', label: 'Cirurgião', visible: true, order: 4 },
      { fieldName: 'anesthesiologist', label: 'Anestesiologista', visible: true, order: 5 },
      { fieldName: 'surgeryStartTime', label: 'Início da Cirurgia', visible: true, order: 6 },
      { fieldName: 'surgeryEndTime', label: 'Término da Cirurgia', visible: true, order: 7 },
      { fieldName: 'status', label: 'Status', visible: true, order: 8 }
    ],
    skipDuplicates: true
  });

  console.log('Database seeded successfully!');
  console.log('Admin test login: admin@setupso.com / Admin@1234');
  console.log('User test login: user@setupso.com / User@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
