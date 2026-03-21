# Koviloor Kitchen — Deployment Guide
## One-time setup (~20 minutes)

---

## Step 1: Firebase Setup

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → Name it `koviloor-kitchen` → Continue → Create project
3. In the project dashboard, click **"Firestore Database"** (left menu)
4. Click **"Create database"** → Choose **"Start in test mode"** → Select region `asia-south1` → Enable
5. Click the **gear icon ⚙️** (top left) → **"Project settings"**
6. Scroll to **"Your apps"** section → Click **"</>"** (Web app icon)
7. Register app name: `koviloor-kitchen` → Click **"Register app"**
8. Copy the `firebaseConfig` object — it looks like:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "koviloor-kitchen.firebaseapp.com",
  projectId: "koviloor-kitchen",
  storageBucket: "koviloor-kitchen.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

9. Open the file `src/firebase.js` and **replace all `REPLACE_...` values** with your config values.

---

## Step 2: GitHub Setup

1. Go to **https://github.com** → Sign in (or create account)
2. Click **"New repository"** → Name: `koviloor-kitchen` → Public → Create
3. Upload the project files:
   - Click **"uploading an existing file"**
   - Upload all files maintaining the folder structure:
     ```
     index.html
     package.json
     vite.config.js
     vercel.json
     .gitignore
     src/
       App.jsx
       main.jsx
       firebase.js
       useKitchenData.js
       seeds.js
     ```
   - Click **"Commit changes"**

---

## Step 3: Vercel Deployment

1. Go to **https://vercel.com** → Sign in with GitHub
2. Click **"Add New Project"**
3. Import your `koviloor-kitchen` repository
4. Framework will auto-detect as **Vite** ✓
5. Click **"Deploy"**
6. Wait ~2 minutes → You get a live URL like `koviloor-kitchen.vercel.app`
---

## Step 3b: Set the App Password on Vercel

After deploying (Step 3), set the password as an environment variable:

1. In Vercel dashboard → your project → **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name:** `VITE_APP_PASSWORD`
   - **Value:** (choose your password, e.g. `Koviloor@2024`)
   - **Environment:** Production ✓
3. Click **Save**
4. Go to **Deployments** → click the three dots on the latest deploy → **Redeploy**

> **Note:** The default password is `koviloor2024` until you set the environment variable.
> Everyone on the team uses the **same shared password**.
> The session stays unlocked until they close the browser tab.



---

## Step 4: Share with Team

Share the Vercel URL with your team. All data is stored in Firebase and **syncs in real-time** — any change one person makes is immediately visible to everyone else.

---

## Future updates

Whenever you make changes to the code:
1. Update files in GitHub
2. Vercel auto-deploys within 1-2 minutes

---

## Firestore security (after testing)

Once the app is working, change Firestore rules from test mode to:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /koviloor/kitchen {
      allow read, write: if true;
    }
  }
}
```
This locks access to only the kitchen document.
