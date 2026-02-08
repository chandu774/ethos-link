import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const USERNAME_REGEX = /^[a-z0-9_]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 15;

export function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function isValidUsername(value: string) {
  return (
    value.length >= USERNAME_MIN &&
    value.length <= USERNAME_MAX &&
    USERNAME_REGEX.test(value)
  );
}

export function formatUsername(
  username?: string | null,
  fallback?: string | null,
  maxLength = 12
) {
  const raw = username?.trim() || fallback?.trim() || "";
  const display =
    raw.length > maxLength ? `${raw.slice(0, Math.max(0, maxLength - 3))}...` : raw;
  return { raw, display };
}

export const USERNAME_LIMITS = {
  min: USERNAME_MIN,
  max: USERNAME_MAX,
};
