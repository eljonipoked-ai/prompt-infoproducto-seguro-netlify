// Store en memoria con la misma interfaz { get, set } que openEntitlementStore().
export function memoryStore() {
  const data = new Map();
  return {
    data,
    get: async (key) => (data.has(key) ? structuredClone(data.get(key)) : null),
    set: async (key, value) => void data.set(key, structuredClone(value)),
  };
}
