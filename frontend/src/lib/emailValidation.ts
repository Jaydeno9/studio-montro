export function isValidEmail(value: string): boolean {
  const email = value.trim();

  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email);
}
