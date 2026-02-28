import { db } from "@/core/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  limit, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { Kiosk } from "@/shared/types";

const COLLECTION = 'kiosks';

export async function getAllKiosks(): Promise<Kiosk[]> {
    try {
        const snap = await getDocs(collection(db, COLLECTION));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kiosk));
    } catch (error) {
        console.error("Error getting kiosks:", error);
        return [];
    }
}

export async function getKioskById(kioskId: string): Promise<Kiosk | null> {
    try {
        const q = query(collection(db, COLLECTION), where('kiosk_id', '==', kioskId), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as Kiosk;
    } catch (error) {
        console.error("Error getting kiosk by id:", error);
        return null;
    }
}

export async function createKiosk(kiosk: Omit<Kiosk, 'id' | 'created_at'>): Promise<boolean> {
    try {
        const data = {
            ...kiosk,
            created_at: new Date().toISOString(),
            status: 'Active'
        };
        await addDoc(collection(db, COLLECTION), data);
        return true;
    } catch (error) {
        console.error("Error creating kiosk:", error);
        return false;
    }
}

export async function updateKiosk(id: string, data: Partial<Kiosk>): Promise<boolean> {
    try {
        await updateDoc(doc(db, COLLECTION, id), data);
        return true;
    } catch (error) {
        console.error("Error updating kiosk:", error);
        return false;
    }
}

export async function deleteKiosk(id: string): Promise<boolean> {
    try {
        await deleteDoc(doc(db, COLLECTION, id));
        return true;
    } catch (error) {
        console.error("Error deleting kiosk:", error);
        return false;
    }
}

export async function getKiosksByCenter(centerId: string): Promise<Kiosk[]> {
    try {
        const q = query(collection(db, COLLECTION), where('center_id', '==', centerId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kiosk));
    } catch (error) {
        console.error("Error getting kiosks by center:", error);
        return [];
    }
}
