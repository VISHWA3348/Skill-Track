// LOCAL SQLite API AUTH
class LocalAuth {
  currentUser: any = null;
  callbacks: any[] = [];
  initialized: boolean = false;
  
  constructor() {
    this.restoreSession();
  }

  async restoreSession() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await fetch('/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          this.currentUser = { ...data.user, getIdToken: () => Promise.resolve(token) };
        } else {
          localStorage.removeItem('token');
          // Also clear from local storage if verify fails
          localStorage.removeItem('user');
        }
      } catch (e) {
        console.error("Session restoration error:", e);
      }
    }
    this.initialized = true;
    this.notify();
  }

  async signOut() {
    await signOut(this);
  }

  notify() {
    this.callbacks.forEach(cb => cb(this.currentUser));
  }
}

const localAuthInstance = new LocalAuth();

export function getAuth() {
  return localAuthInstance;
}

export function onAuthStateChanged(auth: any, callback: (user: any) => void) {
  auth.callbacks.push(callback);
  
  // Only trigger the initial callback if we've finished the restoration attempt
  if (auth.initialized) {
    callback(auth.currentUser);
  }
  
  return () => {
    auth.callbacks = auth.callbacks.filter((cb: any) => cb !== callback);
  };
}

export async function signInWithEmailAndPassword(auth: any, email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message);
    (err as any).code = data.error;
    throw err;
  }
  localStorage.setItem('token', data.token);
  auth.currentUser = { ...data.user, getIdToken: () => Promise.resolve(data.token) };
  auth.notify();
  return { user: auth.currentUser };
}

export async function createUserWithEmailAndPassword(auth: any, email: string, password: string, extraFields: any = {}) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, ...extraFields })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error);
    (err as any).code = data.error;
    throw err;
  }
  localStorage.setItem('token', data.token);
  auth.currentUser = { ...data.user, getIdToken: () => Promise.resolve(data.token) };
  auth.notify();
  return { user: auth.currentUser };
}

export async function signOut(auth: any) {
  localStorage.removeItem('token');
  auth.currentUser = null;
  auth.notify();
}

export class GoogleAuthProvider {}

export async function signInWithPopup() {
  throw new Error("Google Sign in not implemented in mock SQLite environment. Please use Email/Password.");
}

export async function setPersistence() {}
export const inMemoryPersistence = 'inMemory';
