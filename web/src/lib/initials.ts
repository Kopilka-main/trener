export function initials(firstName: string, lastName: string): string {
  const a = firstName.trim()[0] ?? '';
  const b = lastName.trim()[0] ?? '';
  return (a + b).toUpperCase();
}

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function shortName(firstName: string, lastName: string): string {
  if (!firstName || !lastName) return `${firstName}${lastName}`.trim();
  return `${firstName} ${lastName[0]}.`;
}
