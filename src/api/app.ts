// LOCAL SQLite API APP
export function initializeApp(config: any, name?: string) {
  return { name: name || '[LOCAL_DEFAULT]', options: config, automaticDataCollectionEnabled: false };
}

export function getApp(name?: string) {
  return { name: name || '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false };
}

export function getApps() {
  return [{ name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false }];
}
