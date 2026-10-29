import { useEffect, useRef, useState } from 'react';
import defaultWallpaper from './assets/default-wallpaper.jpg';

const databaseName = 'batchlab-wallpaper';
const storeName = 'settings';
const wallpaperKey = 'selected';
const maxFileSize = 20 * 1024 * 1024;
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

type SavedWallpaper = { blob: Blob; name: string };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readWallpaper(): Promise<SavedWallpaper | undefined> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(wallpaperKey);
      request.onsuccess = () => resolve(request.result as SavedWallpaper | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally { database.close(); }
}

async function writeWallpaper(value: SavedWallpaper | null): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      if (value) transaction.objectStore(storeName).put(value, wallpaperKey);
      else transaction.objectStore(storeName).delete(wallpaperKey);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}

export function validateWallpaper(file: File): string | null {
  if (!acceptedTypes.has(file.type)) return '请选择 JPG、PNG、WebP 或 AVIF 静态图片。';
  if (file.size === 0) return '图片文件为空，请重新选择。';
  if (file.size > maxFileSize) return '图片不能超过 20 MB。';
  return null;
}

export function useWallpaper() {
  const [url, setUrl] = useState(defaultWallpaper);
  const [name, setName] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const objectUrl = useRef<string | null>(null);
  const generation = useRef(0);
  const writes = useRef(Promise.resolve());

  function show(blob: Blob, fileName: string) {
    const next = URL.createObjectURL(blob);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = next;
    setUrl(next);
    setName(fileName);
  }

  useEffect(() => {
    let mounted = true;
    readWallpaper().then(saved => {
      if (mounted && generation.current === 0 && saved) show(saved.blob, saved.name);
    }).catch(() => { /* Private browsing may not allow persistent storage. */ });
    return () => {
      mounted = false;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  function choose(file: File) {
    const issue = validateWallpaper(file);
    if (issue) { setMessage(issue); return; }
    const current = ++generation.current;
    show(file, file.name);
    setMessage('');
    writes.current = writes.current.catch(() => {}).then(() => writeWallpaper({ blob: file, name: file.name }));
    writes.current.catch(() => { if (generation.current === current) setMessage('壁纸已显示，但浏览器未能保存；下次打开需重新选择。'); });
  }

  function restoreDefault() {
    const current = ++generation.current;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setUrl(defaultWallpaper);
    setName(null);
    setMessage('');
    writes.current = writes.current.catch(() => {}).then(() => writeWallpaper(null));
    writes.current.catch(() => { if (generation.current === current) setMessage('已恢复默认壁纸，但浏览器未能保存这一设置。'); });
  }

  return { url, name, message, choose, restoreDefault };
}
