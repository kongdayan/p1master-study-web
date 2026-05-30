import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function modulo(index: number, length: number) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}
