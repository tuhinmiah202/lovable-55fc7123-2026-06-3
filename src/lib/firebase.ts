import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBrJg4L_Tu2sQhOSTf47UsXnY96vYXHs8Y",
  authDomain: "nexboi-abd67.firebaseapp.com",
  projectId: "nexboi-abd67",
  storageBucket: "nexboi-abd67.firebasestorage.app",
  messagingSenderId: "638467606700",
  appId: "1:638467606700:web:101351b3cc5433093ff709",
  measurementId: "G-8EM12M80VK",
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

export type FirebaseGoogleResult = {
  idToken: string | null;
  error?: string;
  errorCode?: string;
};

export async function signInWithGoogleFirebase(): Promise<FirebaseGoogleResult> {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken || null;
    if (!idToken) return { idToken: null, error: "Google idToken পাওয়া যায়নি" };
    return { idToken };
  } catch (err: any) {
    return {
      idToken: null,
      error: err?.message || "Google সাইন-ইন ব্যর্থ",
      errorCode: err?.code,
    };
  }
}
