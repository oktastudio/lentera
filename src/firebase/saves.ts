import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/app';
import { collectSave, parseSave, type SaveData } from '@/save/SaveData';

export type LoadResult =
  | { kind: 'none' } // belum pernah menyimpan (pemain baru)
  | { kind: 'ok'; data: SaveData }
  | { kind: 'invalid' }; // ada data tapi rusak atau dari versi lebih baru

// Satu dokumen per pemain: saves/{uid}. Aturan Firestore memastikan hanya
// pemilik uid yang bisa membaca dan menulisnya.
export async function loadSave(uid: string): Promise<LoadResult> {
  const snap = await getDoc(doc(db, 'saves', uid));
  if (!snap.exists()) return { kind: 'none' };
  const data = parseSave(snap.data());
  return data ? { kind: 'ok', data } : { kind: 'invalid' };
}

export async function writeSave(uid: string): Promise<void> {
  await setDoc(doc(db, 'saves', uid), collectSave());
}
