function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('allunite-assets', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('assets');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Your browser could not open local creative storage.'));
  });
}
export async function saveAsset(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
  const bitmap = await createImageBitmap(file);
  const valid = bitmap.width >= 320 && bitmap.height >= 180;
  bitmap.close();
  if (!valid) throw new Error('Use an image at least 320 × 180 pixels.');
  const asset = { bytes: await file.arrayBuffer(), type: file.type };
  const db = await openDatabase();
  try {
    const id = crypto.randomUUID();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('assets', 'readwrite');
      tx.objectStore('assets').put(asset, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Creative could not be saved. Check available browser storage.'));
      tx.onabort = () => reject(new Error('Saving the creative was interrupted.'));
    });
    return id;
  } finally { db.close(); }
}
export async function readAsset(id: string): Promise<Blob> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('assets').objectStore('assets').get(id);
      request.onsuccess = () => {
        const asset: unknown = request.result;
        if (asset instanceof Blob) return resolve(asset);
        if (typeof asset === 'object' && asset !== null && 'bytes' in asset && asset.bytes instanceof ArrayBuffer && 'type' in asset && typeof asset.type === 'string') {
          return resolve(new Blob([asset.bytes], { type: asset.type }));
        }
        reject(new Error('This local creative is missing. Upload it again.'));
      };
      request.onerror = () => reject(new Error('Unable to read the local creative.'));
    });
  } finally { db.close(); }
}
export function downloadText(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value: string | number) {
  const text = String(value);
  return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`;
}
