import { initializeApp } from './app';
import { getAuth as getLocalAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from './auth';
import { getFirestore as getLocalFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, getDocFromServer, writeBatch, serverTimestamp, Timestamp, orderBy, limit, arrayUnion } from './firestore';
import { getStorage as getLocalStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from './storage';
import { UserProfile } from '../types';

// Initialize Local API (formerly Mock Firebase)
const app = initializeApp({ isMock: true });
export const auth = getLocalAuth();
export const db = getLocalFirestore();
export const storage = getLocalStorage();

export { 
  onAuthStateChanged,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  writeBatch,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit,
  setDoc,
  arrayUnion,
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable
};

export const signIn = async () => {
  throw new Error("Local SQLite mode requires Email/Password login.");
};

export const logout = () => signOut(auth);

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const res = await getDoc(doc(db, 'users', uid));
    if (!res.exists()) return null;
    const data = res.data() as any;
    return {
      ...data,
      profilePhoto: data.profilePhoto || data.profile_photo || data.photo_url || data.photoUrl,
      rollNo: data.rollNo || data.roll_no,
      departmentId: data.departmentId || data.department_id,
      collegeId: data.collegeId || data.college_id,
      collegeName: data.collegeName || data.college_name,
      phoneNumber: data.phoneNumber || data.phone_number
    } as UserProfile;
  } catch (error) {
    console.error("Error fetching local profile:", error);
    return null;
  }
};

export const createUserProfile = async (uid: string, profile: Partial<UserProfile>) => {
  try {
    await setDoc(doc(db, 'users', uid), profile, { merge: true });
  } catch (error) {
    console.error("Error creating local profile:", error);
  }
};

export const logAudit = async (action: string, details: string, collegeId?: string) => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    await addDoc(collection(db, 'auditLogs'), {
      action,
      details,
      userId: user.uid,
      collegeId: collegeId || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log local audit:', error);
  }
};

export enum OperationType {
  GET = 'GET',
  ADD = 'ADD',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SET = 'SET',
  CREATE = "CREATE"
}

export const handleApiError = (error: any, operation: OperationType, collection: string) => {
  console.error(`API ${operation} error on ${collection}:`, error);
};
