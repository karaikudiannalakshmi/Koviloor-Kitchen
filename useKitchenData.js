// ── Firebase data hook ────────────────────────────────────────────────────────
// Replaces localStorage with Firestore real-time sync
// All state (ingredients, recipes, orders, inventory, locations, recipeTypes)
// is loaded from Firestore on mount and saved back on every change.

import { useState, useEffect, useRef, useCallback } from "react";
import { db, doc, setDoc, onSnapshot, KITCHEN_DOC, KITCHEN_COL } from "./firebase.js";

// ── Seed data (used only when Firestore document doesn't exist yet) ───────────
import { ING0, REC0, LOC0, RTYPE_SEED, INV0 } from "./seeds.js";

const SAVE_DELAY = 1200; // ms debounce — don't write on every keystroke

export function useKitchenData() {
  const [loaded, setLoaded]           = useState(false);
  const [saveStatus, setSaveStatus]   = useState("idle"); // "idle" | "saving" | "saved" | "error"

  const [ingredients,   setIngredients]   = useState([]);
  const [recipes,       setRecipes]       = useState([]);
  const [orders,        setOrders]        = useState([]);
  const [inventory,     setInventory]     = useState({ purchases: [], issues: [] });
  const [locations,     setLocations]     = useState([]);
  const [recipeTypes,   setRecipeTypes]   = useState([]);

  const docRef = doc(db, KITCHEN_COL, KITCHEN_DOC);
  const saveTimer = useRef(null);
  const isRemoteUpdate = useRef(false); // prevent save-loop when Firestore pushes updates

  // ── Load + subscribe ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        isRemoteUpdate.current = true;
        setIngredients(d.ingredients   ?? ING0);
        setRecipes(d.recipes           ?? REC0);
        setOrders(d.orders             ?? []);
        setInventory(d.inventory       ?? { purchases: [], issues: [] });
        setLocations(d.locations       ?? LOC0);
        setRecipeTypes(d.recipeTypes   ?? RTYPE_SEED);
        setLoaded(true);
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
      } else {
        // First time — seed the document
        const seed = {
          ingredients: ING0,
          recipes:     REC0,
          orders:      [],
          inventory:   { purchases: [], issues: [] },
          locations:   LOC0,
          recipeTypes: RTYPE_SEED,
        };
        setDoc(docRef, seed).then(() => {
          isRemoteUpdate.current = true;
          setIngredients(ING0);
          setRecipes(REC0);
          setOrders([]);
          setInventory({ purchases: [], issues: [] });
          setLocations(LOC0);
          setRecipeTypes(RTYPE_SEED);
          setLoaded(true);
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        });
      }
    }, (err) => {
      console.error("Firestore error:", err);
      setSaveStatus("error");
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  // ── Debounced save ─────────────────────────────────────────────────────────
  const scheduleSync = useCallback((patch) => {
    if (isRemoteUpdate.current) return;
    setSaveStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setDoc(docRef, patch, { merge: true })
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, SAVE_DELAY);
  }, []);

  // ── Wrapped setters — update state AND schedule sync ──────────────────────
  const set = (field, setter) => (valOrFn) => {
    setter((prev) => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      scheduleSync({ [field]: next });
      return next;
    });
  };

  return {
    loaded, saveStatus,
    ingredients,   setIngredients:   set("ingredients",   setIngredients),
    recipes,       setRecipes:       set("recipes",       setRecipes),
    orders,        setOrders:        set("orders",        setOrders),
    inventory,     setInventory:     set("inventory",     setInventory),
    locations,     setLocations:     set("locations",     setLocations),
    recipeTypes,   setRecipeTypes:   set("recipeTypes",   setRecipeTypes),
  };
}
