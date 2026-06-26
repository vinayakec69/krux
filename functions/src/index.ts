import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();
const rtdb = admin.database();

/**
 * STEP 1: Handshake Initiate (Called by App)
 * App requests to connect to a specific bin.
 */
export const handshakeInitiate = functions.https.onRequest(async (req, res) => {
  // Setup CORS
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  try {
    const { user_id, bin_id } = req.body;
    if (!user_id || !bin_id) {
      res.status(400).json({ error: 'Missing user_id or bin_id' });
      return;
    }

    // Check if bin exists and is online
    const binSnap = await db.collection('bins').doc(bin_id).get();
    if (!binSnap.exists || binSnap.data()?.status !== 'online') {
      res.status(400).json({ error: 'Bin offline or not found' });
      return;
    }

    const session_id = crypto.randomUUID();
    
    // Create an escrow session in Firestore
    await db.collection('scan_sessions').doc(session_id).set({
      user_id,
      bin_id,
      status: 'pending_scan',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      expires_at: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60000) // 5 min expiry
    });

    res.json({ session_id, status: 'ready_for_scan' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * STEP 2 & 3: Scan Validate (Called by App after ML prediction)
 * App sends ML results. Cloud Function validates fraud rules.
 */
export const scanValidate = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  try {
    // Basic Auth Check (In production, verify the Bearer token)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { session_id, predicted_class, confidence, image_hash, perceptual_hash } = req.body;

    // Retrieve session
    const sessionRef = db.collection('scan_sessions').doc(session_id);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const sessionData = sessionSnap.data();
    if (sessionData?.status !== 'pending_scan') {
      res.status(400).json({ error: 'Invalid session state' });
      return;
    }

    // === ANTI-FRAUD ENGINE (Abridged for brevity) ===
    
    // 1. Confidence threshold
    if (confidence < 0.75) {
      await sessionRef.update({ status: 'rejected_low_confidence' });
      res.status(400).json({ error: 'Confidence too low' });
      return;
    }

    // 2. Duplicate image check (using perceptual hash)
    const duplicateCheck = await db.collection('past_scans')
      .where('perceptual_hash', '==', perceptual_hash)
      .limit(1)
      .get();
      
    if (!duplicateCheck.empty) {
      await sessionRef.update({ status: 'rejected_duplicate' });
      res.status(400).json({ error: 'Duplicate image detected' });
      return;
    }

    // === FRAUD PASSED ===

    // Update Escrow Session
    await sessionRef.update({
      status: 'awaiting_bin_drop',
      predicted_class,
      confidence,
      image_hash,
      perceptual_hash
    });

    // Notify Bin via Realtime Database (IoT triggers on this)
    await rtdb.ref(`active_sessions/${sessionData.bin_id}`).set({
      session_id,
      expected_class: predicted_class,
      timestamp: Date.now()
    });

    // Also set up a listener slot for the bin to report back
    await rtdb.ref(`drop_events/${session_id}`).set({
      status: 'waiting'
    });

    res.json({ status: 'awaiting_bin_drop', message: 'Please drop the item in the bin' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * STEP 5: Bin Drop Event (Called by ESP32 IoT Hardware)
 * IoT sends actual weight and confirms physical drop.
 */
export const binDropEvent = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    res.status(204).send('');
    return;
  }

  try {
    // IoT Hardware Auth
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== 'KrUx2025SmartSeg-BinKey-X9mZ') {
      res.status(401).json({ error: 'Hardware Unauthorized' });
      return;
    }

    const { session_id, bin_id, measured_weight_grams } = req.body;

    const sessionRef = db.collection('scan_sessions').doc(session_id);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const session = sessionSnap.data()!;
    
    // Validate weight against predicted class (Example logic)
    let weightValid = true;
    if (session.predicted_class === 'PET_BOTTLE' && (measured_weight_grams < 5 || measured_weight_grams > 60)) {
      weightValid = false;
    }

    if (!weightValid) {
      await sessionRef.update({ status: 'rejected_weight_mismatch', actual_weight: measured_weight_grams });
      await rtdb.ref(`drop_events/${session_id}`).update({ status: 'failed', reason: 'weight_mismatch' });
      res.json({ success: false, reason: 'weight_mismatch' });
      return;
    }

    // Success! Update Escrow
    await sessionRef.update({
      status: 'completed',
      actual_weight: measured_weight_grams,
      completed_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Reward User (Cloud Function securely credits the user)
    const kruxReward = session.predicted_class === 'PET_BOTTLE' ? 10 : 5;
    const userRef = db.collection('profiles').doc(session.user_id);
    
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists) {
        const currentBalance = userDoc.data()?.krux_balance || 0;
        transaction.update(userRef, { krux_balance: currentBalance + kruxReward });
      }
    });

    // Save scan to past scans to prevent future duplicates
    await db.collection('past_scans').add({
      user_id: session.user_id,
      perceptual_hash: session.perceptual_hash,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Notify App via RTDB that drop is confirmed
    await rtdb.ref(`drop_events/${session_id}`).update({
      status: 'confirmed',
      krux_earned: kruxReward
    });

    // Clear active session for the bin
    await rtdb.ref(`active_sessions/${bin_id}`).remove();

    res.json({ success: true, reward: kruxReward });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
