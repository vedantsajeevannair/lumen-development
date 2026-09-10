import { PrismaService } from '../../database/prisma.service';
import { DUPLICATE_RADIUS_METERS } from '../derivations';

/**
 * "Has this defect already been reported?"
 *
 * Shared by both intake paths — the mobile API (complaints.service) and the web
 * console (web-integration.service). It lived only in the mobile path, so every
 * report filed from the console skipped the check entirely and duplicates went
 * straight into the queue.
 */

export type NearbyDuplicate = {
  id: string;
  trackingId: string;
  category: string;
  distanceMeters: number;
};

/**
 * Complaints of the same category within `radiusMeters`, nearest first.
 *
 * Great-circle distance in SQL rather than fetching rows and filtering in
 * Node: the filter has to run across every open complaint, and pulling the
 * whole table over the wire to reject one report does not scale past a pilot.
 *
 * The acos argument is clamped to [-1, 1] because floating-point error pushes
 * it fractionally outside that range when the two points are the same spot —
 * which is exactly the case this function exists to detect — and Postgres
 * raises `input is out of range` rather than returning 0.
 *
 * Category is compared case-insensitively on purpose. Intake writes whatever
 * the client sent ('Pothole'), and the AI service later overwrites it with its
 * own class name ('POTHOLE'), so the same defect is stored under two spellings
 * depending on whether detection has run yet. An exact match would miss every
 * complaint that had already been analysed.
 */
export async function findNearbyDuplicates(
  prisma: PrismaService,
  lat: number,
  lng: number,
  category: string,
  radiusMeters: number = DUPLICATE_RADIUS_METERS,
): Promise<NearbyDuplicate[]> {
  return prisma.$queryRaw<NearbyDuplicate[]>`
    SELECT id, "trackingId", category,
      (6371000 * acos(least(1.0, greatest(-1.0,
        cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(latitude))
      )))) AS "distanceMeters"
    FROM complaints
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      AND lower(category) = lower(${category})
      AND status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
      AND (6371000 * acos(least(1.0, greatest(-1.0,
        cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(latitude))
      )))) <= ${radiusMeters}
    ORDER BY "distanceMeters" ASC
    LIMIT 5;
  `;
}
