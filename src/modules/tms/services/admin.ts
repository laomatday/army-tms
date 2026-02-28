import { db } from "@/core/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  setDoc, 
  addDoc 
} from 'firebase/firestore';

export async function adminGetCollection(collectionName: string) {
    try {
        const snap = await getDocs(collection(db, collectionName));
        return snap.docs.map(d => ({ ...(d.data() as any), id: d.id }));
    } catch (e: any) {
        console.error("Admin Get Error", e);
        return [];
    }
}

export async function adminDeleteDoc(collectionName: string, docId: string) {
    try {
        await deleteDoc(doc(db, collectionName, docId));
        return { success: true, message: "Deleted successfully" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function adminUpdateDoc(collectionName: string, docId: string, data: any) {
    try {
        await updateDoc(doc(db, collectionName, docId), data);
        return { success: true, message: "Updated successfully" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function adminCreateDoc(collectionName: string, data: any, customId?: string) {
    try {
        if (customId) {
            await setDoc(doc(db, collectionName, customId), data);
        } else {
            await addDoc(collection(db, collectionName), data);
        }
        return { success: true, message: "Created successfully" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
