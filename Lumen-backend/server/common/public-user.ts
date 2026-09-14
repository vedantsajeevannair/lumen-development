/**
 * The subset of a user record that is safe to send to a client.
 *
 * `req.user` is the full Prisma row the JWT strategy loaded, and both /auth/me
 * endpoints used to return it verbatim — including the bcrypt `password` hash,
 * `biometricHash`, and `verificationDocs`. Any signed-in user could read their
 * own hash, which is exactly the material an offline cracking attempt needs,
 * and it reached the browser on every page load.
 *
 * An allow-list rather than a delete-list: a field added to the User model in
 * future is not exposed until someone chooses to add it here.
 */
export type PublicUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  phoneNumber: string | null;
  isActive: boolean;
  isVerified: boolean;
  civicScore: number;
  createdAt: Date | null;
};

export function toPublicUser(user: any): PublicUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName ?? null,
    role: user.role,
    phoneNumber: user.phoneNumber ?? null,
    isActive: user.isActive ?? true,
    isVerified: user.isVerified ?? false,
    civicScore: user.civicScore ?? 0,
    createdAt: user.createdAt ?? null,
  };
}
