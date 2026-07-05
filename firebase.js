import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSe4Kw3lb3qBfFn4K0xivxY7Cja_uXtSE",
  authDomain: "koviloor-kitchen.firebaseapp.com",
  projectId: "koviloor-kitchen",
  storageBucket: "koviloor-kitchen.firebasestorage.app",
  messagingSenderId: "1030034988110",
  appId: "1:1030034988110:web:30ca96f7484cb2059cb71f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
