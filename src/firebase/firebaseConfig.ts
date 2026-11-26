// Konfigurasi web Firebase. Nilai ini bukan rahasia: keamanan data dijaga oleh
// aturan Firestore dan daftar domain yang diizinkan di Firebase Console.
export const firebaseConfig = {
  apiKey: 'AIzaSyCAnnrug-oUfC7vbALnWO015kzyUw5CC6M',
  authDomain: 'lentera-807df.firebaseapp.com',
  projectId: 'lentera-807df',
  storageBucket: 'lentera-807df.firebasestorage.app',
  messagingSenderId: '807203475314',
  appId: '1:807203475314:web:be3a508579289a693ed7eb',
};

// false selama masih berisi tulisan bawaan. Dipakai supaya game tetap bisa
// dimainkan tanpa Firebase (tanpa login dan tanpa simpanan).
export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseConfig).every((v) => v !== '' && !v.startsWith('ISI_'));
}
