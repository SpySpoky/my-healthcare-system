// In-memory copy of the data the signed-in user may see. The data
// modules read it synchronously; src/api/hydrate.js fills it from the
// server and src/api/persist.js sends every change back.

const store = new Map();
let hydrated = false;

export const cacheGet = (key) => store.get(key);

export const cacheSet = (key, value) => {
  store.set(key, value);
};

export const cacheClear = () => {
  store.clear();
  hydrated = false;
};

export const isHydrated = () => hydrated;

export const markHydrated = (value) => {
  hydrated = value;
};
