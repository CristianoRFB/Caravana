import {
  runTransaction as firestoreTransaction,
  setDoc as firestoreSet,
  updateDoc as firestoreUpdate,
  writeBatch as firestoreBatch,
  type DocumentData, type DocumentReference, type Firestore, type SetOptions, type UpdateData, type WithFieldValue,
} from "firebase/firestore";
import { trackWrite } from "./pending-writes";

// Keep SDK semantics/retries; one counter covers the entire acknowledged operation.
export const runTransaction: typeof firestoreTransaction = (database, operation, options) =>
  trackWrite(() => firestoreTransaction(database, operation, options));
export function setDoc(reference: DocumentReference, data: WithFieldValue<DocumentData>, options?: SetOptions): Promise<void> {
  return trackWrite(() => options ? firestoreSet(reference, data, options) : firestoreSet(reference, data));
}
export function updateDoc(reference: DocumentReference, data: UpdateData<DocumentData>): Promise<void> {
  return trackWrite(() => firestoreUpdate(reference, data));
}
export function writeBatch(database: Firestore) {
  const batch = firestoreBatch(database);
  const commit = batch.commit.bind(batch);
  batch.commit = () => trackWrite(commit);
  return batch;
}
