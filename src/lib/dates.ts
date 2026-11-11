// Dates are handled as local calendar days; the database stores YYYY-MM-DD.

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** The Monday on or before the given date. */
export function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7
  return addDays(date, -daysSinceMonday)
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}
