import { API_BASE_URL } from '@/config/api';

export function getStorage() {
  return { isMock: true };
}

export function ref(storage: any, path: string) {
  return { type: 'ref', path };
}

export async function uploadBytes(storageRef: any, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('token');
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/storage/upload`, {
    method: 'POST',
    body: formData,
    headers
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return { 
    ref: { 
      ...storageRef, 
      downloadURL: data.url,
      publicId: data.publicId,
      fileType: data.fileType,
      fileName: data.fileName,
      uploadedAt: data.uploadedAt
    }, 
    metadata: {} 
  };
}

export function uploadBytesResumable(storageRef: any, file: File) {
  let isCancelled = false;
  const task = {
    on: (event: string, onProgress: any, onError: any, onComplete: any) => {
      if (event !== 'state_changed') return;

      const performUpload = async () => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const token = localStorage.getItem('token');
          const headers: any = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          // Simulate progress
          onProgress({ bytesTransferred: 0, totalBytes: file.size });
          
          const res = await fetch(`${API_BASE_URL}/api/storage/upload`, {
            method: 'POST',
            body: formData,
            headers
          });

          if (!res.ok) throw new Error(await res.text());
          
          const data = await res.json();
          onProgress({ bytesTransferred: file.size, totalBytes: file.size });
          
          task.snapshot.downloadURL = data.url;
          (task.snapshot as any).publicId = data.publicId;
          (task.snapshot as any).fileType = data.fileType;
          (task.snapshot as any).fileName = data.fileName;
          (task.snapshot as any).uploadedAt = data.uploadedAt;
          
          if (!isCancelled) onComplete();
        } catch (e) {
          if (!isCancelled && onError) onError(e);
        }
      };

      performUpload();
    },
    snapshot: {
      downloadURL: ''
    }
  };
  return task;
}

export async function getDownloadURL(storageRef: any) {
  if (storageRef && storageRef.downloadURL) return storageRef.downloadURL;
  if (storageRef.task && storageRef.task.snapshot.downloadURL) {
      return storageRef.task.snapshot.downloadURL;
  }
  if (storageRef.snapshot && storageRef.snapshot.downloadURL) return storageRef.snapshot.downloadURL;
  return storageRef.downloadURL || '/placeholder.jpg';
}
