import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const data = await prisma.complaint.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { aiPrediction: true }
  });
  console.log(JSON.stringify(data, null, 2));
}
main().finally(() => prisma.$disconnect());
