import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInAnonymously, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth } from '@/firebase/app';

export type SessionMode = 'offline' | 'guest' | 'google';

export interface SessionInfo {
  mode: SessionMode;
  uid: string | null;
  label: string;
}

// Siapa yang sedang bermain. Dibaca oleh sistem simpanan di langkah berikutnya.
export const session: SessionInfo = { mode: 'offline', uid: null, label: 'Offline' };

function applyUser(user: User): void {
  session.uid = user.uid;
  session.mode = user.isAnonymous ? 'guest' : 'google';
  session.label = user.isAnonymous ? 'Tamu' : (user.displayName ?? user.email ?? 'Pemain');
}

// Mengembalikan true bila pemain sudah login dari kunjungan sebelumnya.
export async function restoreSession(): Promise<boolean> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return false;
  applyUser(user);
  return true;
}

export async function signInGuest(): Promise<void> {
  const cred = await signInAnonymously(auth);
  applyUser(cred.user);
}

export async function signInGoogle(): Promise<void> {
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  applyUser(cred.user);
}

export function chooseOffline(): void {
  session.uid = null;
  session.mode = 'offline';
  session.label = 'Offline';
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
  chooseOffline();
}

// Mengubah error Firebase menjadi pesan yang mudah dipahami di HP.
export function describeAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Login dibatalkan.';
      case 'auth/popup-blocked':
        return 'Jendela login diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.';
      case 'auth/unauthorized-domain':
        return 'Alamat game ini belum diizinkan. Tambahkan di Firebase: Authentication > Settings > Authorized domains.';
      case 'auth/operation-not-allowed':
        return 'Metode login ini belum diaktifkan di Firebase (Authentication > Sign-in method).';
      case 'auth/network-request-failed':
        return 'Tidak ada koneksi internet. Coba lagi.';
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
        return 'Konfigurasi Firebase salah. Periksa isi firebaseConfig.ts.';
      default:
        return `Login gagal (${error.code}).`;
    }
  }
  return 'Login gagal. Coba lagi.';
}
