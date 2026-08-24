export function formatDate(value: Date): string {
  return value.toISOString();
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
