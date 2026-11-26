import { db, isDbConfigured } from './index.ts';
import { users } from './schema.ts';

interface InMemoryUser {
  id: number;
  uid: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const inMemoryUsers = new Map<string, InMemoryUser>();
let nextUserId = 1;

export async function getOrCreateUser(uid: string, email: string) {
  const normalizedEmail = email || 'user@khelv.local';

  if (!isDbConfigured) {
    let user = inMemoryUsers.get(uid);
    if (!user) {
      user = {
        id: nextUserId++,
        uid,
        email: normalizedEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryUsers.set(uid, user);
    } else {
      user.email = normalizedEmail;
      user.updatedAt = new Date();
    }
    return user;
  }

  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.warn('Database user sync failed, using in-memory store fallback');
    let user = inMemoryUsers.get(uid);
    if (!user) {
      user = {
        id: nextUserId++,
        uid,
        email: normalizedEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryUsers.set(uid, user);
    }
    return user;
  }
}

