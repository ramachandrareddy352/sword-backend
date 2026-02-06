import prisma from "../database/client";
import type { Response } from "express";

export async function resolveUser(identifier: { id?: string; email?: string }) {
  if (identifier.id) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(identifier.id) },
    });
    if (!user) throw new Error("USER_NOT_FOUND");
    return user;
  }

  if (identifier.email) {
    const user = await prisma.user.findUnique({
      where: { email: identifier.email },
    });
    if (!user) throw new Error("USER_NOT_FOUND");
    return user;
  }

  throw new Error("IDENTIFIER_REQUIRED");
}

export function getPagination(query: any) {
  const limit = query.limit ? Number(query.limit) : 20;
  const page = query.page ? Number(query.page) : 1;

  if (page <= 0) return null;

  return {
    take: limit,
    skip: (page - 1) * limit,
    page,
    limit,
  };
}

export async function userGuard(userId: bigint) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.isBanned)
    throw new Error("User is banned, cannot perform any actions");
  return user;
}
