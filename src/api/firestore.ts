import { API_BASE_URL } from '@/config/api';
// LOCAL SQLite API FIRESTORE

export function getFirestore() {
  return { 
    type: 'sqlite_api',
    app: { name: '[LOCAL_DEFAULT]' },
    toJSON: () => ({}),
    isMock: true 
  } as any;
}

// Helpers
const getToken = () => localStorage.getItem('token');

const fetchAPI = async (url: string, method: string = 'GET', body: any = null) => {
  const headers: any = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export function collection(db: any, path: string) {
  return { type: 'collection', path };
}

export function doc(db: any, path: string, idParam?: string) {
  let fullPath = idParam ? `${path}/${idParam}` : path;
  if (typeof db === 'object' && db.type === 'collection') {
    fullPath = `${db.path}/${path}`;
  }
  const parts = fullPath.split('/');
  return { type: 'doc', collection: parts[0], id: parts.slice(1).join('/') };
}

export function query(col: any, ...constraints: any[]) {
  return { type: 'query', collection: col.path, constraints };
}

export function where(field: string, operator: string, value: any) {
  return { type: 'where', field, operator, value };
}

export function orderBy(field: string, direction: string = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(num: number) {
  return { type: 'limit', value: num };
}

function parseQuery(q: any) {
  let collectionName = q.type === 'collection' ? q.path : q.collection;
  const conditions = q.constraints?.filter((c: any) => c.type === 'where') || [];
  const orderBys = q.constraints?.filter((c: any) => c.type === 'orderBy') || [];
  const limitObj = q.constraints?.find((c: any) => c.type === 'limit');
  return { collectionName, conditions, orderBys, limit: limitObj?.value };
}

export async function getDocs(q: any) {
  const { collectionName, conditions, orderBys, limit } = parseQuery(q);
  const responseData = await fetchAPI(`${API_BASE_URL}/api/firestore/${collectionName}/query`, 'POST', { conditions, orderBys, limit });
  const docsData = responseData.success ? responseData.data : responseData.docs;
  
  const docs = (docsData || []).map((d: any) => ({
    id: d.id || d.uid || d.docId,
    data: () => d,
    exists: () => true,
    ref: doc({}, collectionName, d.id || d.uid || d.docId)
  }));

  return {
    empty: docs.length === 0,
    docs,
    size: docs.length,
    forEach: (callback: (doc: any) => void) => {
      docs.forEach(callback);
    }
  };
}

export function onSnapshot(q: any, onNext: (snap: any) => void, onError?: (err: any) => void) {
  let isCancelled = false;
  
  const poll = async () => {
    if (isCancelled) return;
    try {
      if (q.type === 'doc') {
        try {
          const snap = await getDoc(q);
          if (!isCancelled) onNext(snap);
        } catch(e) {
          if (!isCancelled && onError) onError(e);
        }
      } else {
        const snap = await getDocs(q);
        if (!isCancelled) onNext(snap);
      }
    } catch (e) {
      if (!isCancelled && onError) onError(e);
    }
    if (!isCancelled) setTimeout(poll, 3000);
  };
  
  poll();
  return () => { isCancelled = true; };
}

export async function getDoc(docRef: any) {
  try {
    const data = await fetchAPI(`${API_BASE_URL}/api/firestore/${docRef.collection}/${docRef.id}`);
    const docData = data.success ? data.data : data.doc;
    return {
      id: docRef.id,
      exists: () => !!docData,
      data: () => docData
    };
  } catch (e: any) {
    if (e.message.includes('Not found')) {
      return { id: docRef.id, exists: () => false, data: () => null };
    }
    throw e;
  }
}

export const getDocFromServer = getDoc;

export async function setDoc(docRef: any, data: any, options: any = {}) {
  await fetchAPI(`${API_BASE_URL}/api/firestore/${docRef.collection}/${docRef.id}`, 'POST', { data });
}

export async function updateDoc(docRef: any, data: any) {
  await fetchAPI(`${API_BASE_URL}/api/firestore/${docRef.collection}/${docRef.id}`, 'POST', { data });
}

export async function deleteDoc(docRef: any) {
  await fetchAPI(`${API_BASE_URL}/api/firestore/${docRef.collection}/${docRef.id}`, 'DELETE');
}

export async function addDoc(colRef: any, data: any) {
  const res = await fetchAPI(`${API_BASE_URL}/api/firestore/${colRef.path}`, 'POST', { data });
  return doc({}, colRef.path, res.id);
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export class Timestamp {
  seconds: number;
  nanoseconds: number;
  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  toDate() {
    return new Date(this.seconds * 1000);
  }
  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }
  static fromDate(date: Date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
}

export const FieldValue = {
  serverTimestamp,
  arrayUnion: (...elements: any[]) => ({ type: 'arrayUnion', elements }),
  arrayRemove: (...elements: any[]) => ({ type: 'arrayRemove', elements }),
  increment: (n: number) => ({ type: 'increment', value: n })
};

export const arrayUnion = FieldValue.arrayUnion;
export const arrayRemove = FieldValue.arrayRemove;
export const increment = FieldValue.increment;

export class WriteBatch {
  private operations: { ref: any, data: any, type: 'set' | 'update' | 'delete' }[] = [];

  set(docRef: any, data: any, options: any = {}) {
    this.operations.push({ ref: docRef, data, type: 'set' });
  }

  update(docRef: any, data: any) {
    this.operations.push({ ref: docRef, data, type: 'update' });
  }

  delete(docRef: any) {
    this.operations.push({ ref: docRef, data: null, type: 'delete' });
  }

  async commit() {
    for (const op of this.operations) {
      if (op.type === 'set') await setDoc(op.ref, op.data);
      else if (op.type === 'update') await updateDoc(op.ref, op.data);
      else if (op.type === 'delete') await deleteDoc(op.ref);
    }
  }
}

export function writeBatch(db: any) {
  return new WriteBatch();
}
