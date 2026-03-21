// ── Firebase configuration ────────────────────────────────────────────────────
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDSe4Kw3lb3qBfFn4K0xivxY7Cja_uXtSE",
  authDomain: "koviloor-kitchen.firebaseapp.com",
  projectId: "koviloor-kitchen",
  storageBucket: "koviloor-kitchen.firebasestorage.app",
  messagingSenderId: "1030034988110",
  appId: "1:1030034988110:web:30ca96f7484cb2059cb71f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// ── Collection / document names ───────────────────────────────────────────────
// All app data lives in a single Firestore document for simplicity
// Path: koviloor/kitchen
export const KITCHEN_DOC = "kitchen";
export const KITCHEN_COL = "koviloor";

export { doc, getDoc, setDoc, onSnapshot, collection };
