/**
 * Recursively cleans an object to ensure no `undefined` values are sent to Firestore,
 * which causes Firestore to reject operations with:
 * "Unsupported field value: undefined"
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = cleanFirestoreData(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as Partial<T>;
}
