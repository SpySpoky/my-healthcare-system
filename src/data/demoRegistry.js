// The app ships no demo data: in normal use everything comes from the
// database. Tests (and the script that exports the database seed)
// register their demo dataset here, see src/test/fixtures/demoData.js.

const providers = {};

export const registerDemoData = (newProviders) => Object.assign(providers, newProviders);

// The registered demo data for `name`, or `empty()` when none is registered.
export const fromDemo = (name, empty) => (providers[name] ? providers[name]() : empty());
