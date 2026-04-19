import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Configura a persistência para ser apenas de sessão (a aba fechou, desloga).
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error("Erro ao configurar persistência de sessão:", error);
});
