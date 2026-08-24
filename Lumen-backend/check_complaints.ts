import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const predictions = await prisma.aiPrediction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { complaint: true }
  });

  console.log(JSON.stringify(predictions, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
