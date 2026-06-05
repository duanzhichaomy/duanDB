import { invoke as tauriInvokeCore } from '@tauri-apps/api/core';
import { save as tauriSaveDialog } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@/service/tauri-bridge';

export const timestampSuffix = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join('');
};

export const stringToBytes = (text: string, withBom: boolean) => {
  const encoded = new TextEncoder().encode(text);
  if (!withBom) return encoded;

  const bytes = new Uint8Array(encoded.length + 3);
  bytes.set([0xef, 0xbb, 0xbf], 0);
  bytes.set(encoded, 3);
  return bytes;
};

export async function saveBytesWithDialog(
  bytes: Uint8Array,
  defaultFileName: string,
  filters: { name: string; extensions: string[] }[],
  mime: string,
) {
  if (isTauri()) {
    const targetPath = await tauriSaveDialog({
      defaultPath: defaultFileName,
      filters,
    });
    if (!targetPath) return false;

    await tauriInvokeCore('save_file_bytes', {
      path: targetPath,
      bytes: Array.from(bytes),
    });
    return true;
  }

  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

export function saveTextWithDialog(
  text: string,
  defaultFileName: string,
  filters: { name: string; extensions: string[] }[],
  mime = 'text/plain',
  withBom = false,
) {
  return saveBytesWithDialog(stringToBytes(text, withBom), defaultFileName, filters, mime);
}
