import { auth, db, rtdb } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, collection,
  query, where, orderBy, limit, getDocs,
  onSnapshot, increment, serverTimestamp, addDoc
} from 'firebase/firestore';
import { ref, onValue, off } from 'firebase/database';

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

export async function signupUser(name: string, email: string, password: string, location: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  // Create profile document in Firestore
  await setDoc(doc(db, 'profiles', uid), {
    name,
    email,
    location,
    avatar: '🌱',
    krux_balance: 50,
    green_score: 0,
    streak: 0,
    last_scan_date: null,
    total_scans: 0,
    co2_saved: 0,
    water_saved: 0,
    plastic_recycled: 0,
    xp: 0,
    level: 1,
    badges: [],
    streak_freezes: 0,
    challenge_progress: {},
    daily_scan_count: 0,
    referral_code: uid.slice(0, 8).toUpperCase(),
    created_at: serverTimestamp(),
  });
  return cred.user;
}

export async function loginUser(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────

export async function getProfile(uid: string) {
  const snap = await getDoc(doc(db, 'profiles', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function listenProfile(uid: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, 'profiles', uid), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

// ─────────────────────────────────────────────
// HANDSHAKE — Step 1
// ─────────────────────────────────────────────

export async function initiateHandshake(user_id: string, bin_id: string) {
  const res = await fetch(
    `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/handshakeInitiate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, bin_id }),
    }
  );
  return res.json();
}

// ─────────────────────────────────────────────
// SCAN VALIDATE — Step 2 & 3
// ─────────────────────────────────────────────

export async function validateScan(payload: {
  session_id: string;
  predicted_class: string;
  confidence: number;
  image_hash: string;
  perceptual_hash: string;
  gps?: { lat: number; lng: number };
}) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(
    `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/scanValidate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

// ─────────────────────────────────────────────
// REALTIME LISTENER — Step 6
// Call this after scan to wait for bin confirmation
// ─────────────────────────────────────────────

export function listenForDropConfirmation(
  session_id: string,
  onConfirmed: (data: any) => void,
  timeoutMs = 120000
) {
  const rtdbRef = ref(rtdb, `drop_events/${session_id}`);
  let timeoutId: ReturnType<typeof setTimeout>;

  const unsubscribe = onValue(rtdbRef, (snap) => {
    if (snap.exists() && snap.val()?.status === 'confirmed') {
      clearTimeout(timeoutId);
      off(rtdbRef);
      onConfirmed(snap.val());
    }
  });

  // Auto-cleanup after timeout
  timeoutId = setTimeout(() => {
    off(rtdbRef);
  }, timeoutMs);

  return () => { clearTimeout(timeoutId); off(rtdbRef); };
}

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────

export async function getLeaderboard(limitCount = 20) {
  const q = query(
    collection(db, 'profiles'),
    orderBy('green_score', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────
// LEDGER HISTORY
// ─────────────────────────────────────────────

export async function getLedger(uid: string, limitCount = 20) {
  const q = query(
    collection(db, 'profiles', uid, 'ledger'),
    orderBy('created_at', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
