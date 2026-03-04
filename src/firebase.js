import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace the following with your app's Firebase project configuration
// You can get this from the Firebase Console > Project Settings.
const firebaseConfig = {
    apiKey: "AIzaSyCFY2g9o26asy88tU20X0Y3Dal4FdwuarI",
    authDomain: "ai-healthassist.firebaseapp.com",
    projectId: "ai-healthassist",
    storageBucket: "ai-healthassist.firebasestorage.app",
    messagingSenderId: "881923879590",
    appId: "1:881923879590:web:07a310a865d505e717ba67",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
