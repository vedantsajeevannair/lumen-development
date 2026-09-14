import { Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../database/prisma.service';

/**
 * The next complaint reference, allocated atomically.
 *
 * Shared by both intake paths. The web console used to generate its own by
 * reading the newest complaint and adding one:
 *
 *   const last = await prisma.complaint.findFirst({ orderBy: { createdAt: 'desc' } });
 *   const ref  = `CMP-${parseInt(last.trackingId.split('-')[1]) + 1}`;
 *
 * trackingId is @unique, so concurrent submissions all read the same row,
 * compute the same reference, and every request but one fails on the
 * constraint. Six simultaneous reports on the live deployment produced four
 * complaints and two failures.
 *
 * It leaked storage too. The photograph is uploaded before the insert, so a
 * request that lost the race had already written its image and nothing
 * afterwards removed it — two orphaned objects had to be cleaned out of the
 * bucket by hand.
 *
 * A sequence has no such window: nextval() is atomic and never returns the
 * same value twice, even across separate transactions, and it does not roll
 * back — so a failed insert burns a number rather than handing it to the next
 * caller. Gaps in the reference series are the correct trade for uniqueness.
 */

const SEQUENCE = 'complaint_tracking_seq';

// 10500 rather than continuing from the highest existing reference: the rows
// that predate the sequence were numbered by the old counter, and starting
// above all of them means the two schemes can never collide.
const SEQUENCE_START = 10500;

const logger = new Logger('trackingId');

export async function nextTrackingId(
  prisma: PrismaService | Prisma.TransactionClient,
): Promise<string> {
  const client = prisma as {
    $executeRawUnsafe: (sql: string) => Promise<unknown>;
    $queryRawUnsafe: <T>(sql: string) => Promise<T>;
    complaint: { count: () => Promise<number> };
  };

  try {
    await client.$executeRawUnsafe(
      `CREATE SEQUENCE IF NOT EXISTS ${SEQUENCE} START ${SEQUENCE_START}`,
    );
    const rows = await client.$queryRawUnsafe<{ seq: bigint }[]>(
      `SELECT nextval('${SEQUENCE}') AS seq`,
    );
    return `CMP-${Number(rows[0].seq)}`;
  } catch (error) {
    // Falling back to a count reintroduces the race this function exists to
    // remove, so it is a last resort and says so loudly. It only triggers if
    // the sequence cannot be created at all, which means the database is in a
    // state worth looking at rather than working around.
    logger.error(
      `Could not allocate from ${SEQUENCE}; falling back to a count, which is NOT race-safe`,
      error as Error,
    );
    const count = await client.complaint.count();
    return `CMP-${SEQUENCE_START + count}`;
  }
}
