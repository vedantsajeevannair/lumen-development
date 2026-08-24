
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const complaint = await prisma.complaint.findFirst({
    where: { id: 'ba61d80e-faf4-4a56-b19f-1949c9acr800' },
    include: {
      aiPrediction: true
    }
  });
  console.log("Complaint from DB:", JSON.stringify(complaint, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
