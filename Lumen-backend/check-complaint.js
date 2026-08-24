const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestComplaint = await prisma.complaint.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log("Latest Complaint:", latestComplaint);
}

main().catch(console.error).finally(() => prisma.$disconnect());
