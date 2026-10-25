function blockedService() {
  throw new Error('Base44 services are unavailable in the desktop app.');
}

function unavailableService() {
  return new Proxy({}, { get: () => blockedService });
}

export function getAccessToken() {
  return null;
}

export function createClient() {
  return {
    app: unavailableService(),
    auth: unavailableService(),
    entities: unavailableService(),
    integrations: { Core: unavailableService() },
  };
}