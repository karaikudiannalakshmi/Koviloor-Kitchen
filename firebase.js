// ── Firebase configuration ────────────────────────────────────────────────────
// Replace the values below with YOUR project's config from Firebase Console
// Firebase Console → Project Settings → Your apps → Web app → Config

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "REPLACE_API_KEY",
  authDomain:        "REPLACE_AUTH_DOMAIN",
  projectId:         "REPLACE_PROJECT_ID",
  storageBucket:     "REPLACE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_MESSAGING_SENDER_ID",
  appId:             "REPLACE_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
