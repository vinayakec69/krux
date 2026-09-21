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
import { ref, onValue, off, set } from 'firebase/database';

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

export function initiateHandshake(user_id: string, bin_id: string) {
  const sessionId = `session_${Date.now()}`;
  const binRef = ref(rtdb, `active_sessions/${bin_id}`);

  console.log(`[Handshake] Initiating handshake for bin: ${bin_id} with user: ${user_id}`);

  return new Promise<any>((resolve, reject) => {
    // 1. Start a strict timeout
    const timeout = setTimeout(() => {
      console.error("[Handshake] Timeout! 15 seconds elapsed without connection.");
      off(binRef);
      reject(new Error("Bin didn't respond. Is it turned on and connected to Wi-Fi?"));
    }, 15000);

    // 2. Set up listener FIRST, so we don't miss the immediate reply
    onValue(binRef, (snapshot) => {
      const data = snapshot.val();
      console.log("[Handshake] Received update from DB:", data);
      
      if (data && data.status === 'connected' && data.session_id === sessionId) {
        console.log("[Handshake] SUCCESS! Bin is connected.");
        clearTimeout(timeout);
        off(binRef);
        resolve({ valid: true, session_id: sessionId });
      } else if (data && data.status === 'connected') {
          // If it was already connected from a previous session, we ignore it and wait 
          // for it to process our new 'requesting_connection'
          console.log("[Handshake] Ignoring old 'connected' state, waiting for new handshake.");
      }
    });

    // 3. Write our request to the database
    console.log("[Handshake] Writing 'requesting_connection' to DB...");
    set(binRef, {
      status: 'requesting_connection',
      user_id: user_id,
      session_id: sessionId,
      timestamp: Date.now()
    }).then(() => {
      console.log("[Handshake] Successfully wrote request to DB. Waiting for ESP32...");
    }).catch(err => {
      console.error("[Handshake] Failed to write to DB!", err);
      clearTimeout(timeout);
      reject(new Error("Network error: Could not reach Firebase."));
    });
  });
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
  // Bypassing Cloud Functions for TRL-4.
  // Client-side fraud detection has already passed in Scanner.tsx.
  return {
    valid: true,
    krux_earned: payload.predicted_class === 'PET' ? 15 : 10
  };
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
