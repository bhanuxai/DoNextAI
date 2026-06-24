// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBns0Ll9lj7PC41gWDd_K4VgsQ-qrh4HBc",
  authDomain: "donextai-47231.firebaseapp.com",
  projectId: "donextai-47231",
  storageBucket: "donextai-47231.firebasestorage.app",
  messagingSenderId: "234426088428",
  appId: "1:234426088428:web:6a7e8dd77c781ad1e69ec9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();