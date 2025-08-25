import { collection, doc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const makeCode = (rack, shelf, bin) => `R${rack}-S${shelf}-B${bin}`;

export async function suggestNextLocation(maxR = 10, maxS = 10, maxB = 20) {
  const snap = await getDocs(collection(db, 'locations'));
  const used = new Set();
  snap.forEach(d => used.add(d.id));
  for (let r = 1; r <= maxR; r++) {
    for (let s = 1; s <= maxS; s++) {
      for (let b = 1; b <= maxB; b++) {
        const code = makeCode(r, s, b);
        if (!used.has(code)) {
          return { rack: r, shelf: s, bin: b, code };
        }
      }
    }
  }
  return { rack: 1, shelf: 1, bin: 1, code: makeCode(1, 1, 1) };
}

export async function reserveLocation(code, extra = {}) {
  const ref = doc(db, 'locations', code);
  await runTransaction(db, async (tx) => {
    const docSnap = await tx.get(ref);
    if (docSnap.exists()) {
      throw new Error('This rack/shelf/bin is already in use');
    }
    tx.set(ref, {
      code,
      reservedAt: serverTimestamp(),
      ...extra,
    });
  });
}

export async function annotateLocation(code, data = {}) {
  const ref = doc(db, 'locations', code);
  await runTransaction(db, async (tx) => {
    const docSnap = await tx.get(ref);
    if (!docSnap.exists()) {
      // if not reserved earlier, create it
      tx.set(ref, { code, createdAt: serverTimestamp(), ...data });
    } else {
      tx.set(ref, { ...docSnap.data(), ...data }, { merge: true });
    }
  });
}

export async function releaseLocation(code) {
  // Optional: implement if you want to free codes on failures/cancellations later
  // Keeping it no-op to avoid accidental deletes.
  return;
}
