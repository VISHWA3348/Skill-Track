import { db } from '../api/localApi';
import { collection, addDoc, serverTimestamp } from '../api/localApi';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info'
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
