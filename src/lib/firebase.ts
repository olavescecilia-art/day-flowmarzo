import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the named database if provided, otherwise default
const databaseId = (firebaseConfig as any).firestoreDatabaseId || "(default)";
export const db = getFirestore(app, databaseId);
export const storage = getStorage(app);

// Enable offline persistence for better resilience
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn("Firestore persistence failed: multiple tabs open");
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn("Firestore persistence is not supported by this browser");
    }
  });
}

async function testConnection() {
  try {
    // Try to fetch a dummy doc to verify connection
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connected successfully");
  } catch (error: any) {
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.error("Firestore is currently unavailable. The app will work in offline mode.");
    } else {
      console.error("Firestore connection error:", error);
    }
  }
}

testConnection();
