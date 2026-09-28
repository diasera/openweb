import { z } from "zod";

/** Primitive validasi akun bersama setup owner dan pengelolaan admin. */
export const adminNameSchema = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter")
  .max(60, "Nama maksimal 60 karakter");

export const adminUsernameSchema = z
  .string()
  .trim()
  .min(3, "Username minimal 3 karakter")
  .max(30, "Username maksimal 30 karakter")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Username hanya boleh huruf, angka, titik, garis bawah, atau strip",
  );

export const adminPasswordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(200, "Password maksimal 200 karakter");

export const optionalAdminPasswordSchema = z.union([
  z.literal(""),
  adminPasswordSchema,
]);
