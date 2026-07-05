// ── Firebase data hook ────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "./firebase.js";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ING0, REC0, LOC0, RTYPE_SEED, INV0 } from "./seeds.js";

const COL          = "koviloor";
const KITCHEN_DOC  = "kitchen";   // orders, inventory, locations, recipeTypes
const CATALOG_DOC  = "catalog";   // recipes, ingredients
const SAVE_DELAY   = 1500;

export function useKitchenData() {
  const [loaded, setLoaded]         = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");

  const [ingredients,  setIngredients]  = useState([]);
  const [recipes,      setRecipes]      = useState([]);
  const [orders,       setOrders]       = useState([]);
  const [inventory,    setInventory]    = useState({ purchases: [], issues: [] });
  const [locations,    setLocations]    = useState([]);
  const [recipeTypes,  setRecipeTypes]  = useState([]);

  const kitchenRef  = doc(db, COL, KITCHEN_DOC);
  const catalogRef  = doc(db, COL, CATALOG_DOC);
  const saveTimer   = useRef(null);
  const skipSave    = useRef(false);
  const pendingKitchen = useRef(null);
  const pendingCatalog = useRef(null);
  const kitchenLoaded  = useRef(false);
  const catalogLoaded  = useRef(false);

  const checkBothLoaded = () => {
    if (kitchenLoaded.current && catalogLoaded.current) setLoaded(true);
  };

  // ── Subscribe to kitchen doc (orders, inventory, locations, recipeTypes) ──
  useEffect(() => {
    const unsub = onSnapshot(kitchenRef, (snap) => {
      skipSave.current = true;
      const d = snap.exists() ? snap.data() : null;
      const kitchen = d || { orders: [], inventory: { purchases: [], issues: [] }, locations: LOC0, recipeTypes: RTYPE_SEED };
      setOrders(kitchen.orders       ?? []);
      setInventory(kitchen.inventory ?? { purchases: [], issues: [] });
      setLocations(kitchen.locations ?? LOC0);
      setRecipeTypes(kitchen.recipeTypes ?? RTYPE_SEED);
      if (!d) setDoc(kitchenRef, kitchen);
      pendingKitchen.current = kitchen;
      kitchenLoaded.current = true;
      checkBothLoaded();
      setTimeout(() => { skipSave.current = false; }, 300);
    }, (err) => { console.error("Kitchen doc error:", err); setLoaded(true); });
    return () => unsub();
  }, []);

  // ── Subscribe to catalog doc (recipes, ingredients) ─────────────────────
  useEffect(() => {
    const unsub = onSnapshot(catalogRef, (snap) => {
      skipSave.current = true;
      const d = snap.exists() ? snap.data() : null;
      const catalog = d || { recipes: REC0, ingredients: ING0 };
      setRecipes(catalog.recipes         ?? REC0);
      setIngredients(catalog.ingredients ?? ING0);
      if (!d) setDoc(catalogRef, catalog);
      pendingCatalog.current = catalog;
      catalogLoaded.current = true;
      checkBothLoaded();
      setTimeout(() => { skipSave.current = false; }, 300);
    }, (err) => { console.error("Catalog doc error:", err); setLoaded(true); });
    return () => unsub();
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const doSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    const saves = [];
    if (pendingKitchen.current) saves.push(setDoc(kitchenRef, pendingKitchen.current));
    if (pendingCatalog.current) saves.push(setDoc(catalogRef, pendingCatalog.current));
    Promise.all(saves)
      .then(() => setSaveStatus("saved"))
      .catch((e) => { console.error("Save failed:", e); setSaveStatus("error"); });
  }, []);

  const scheduleSync = useCallback((docTarget, patch) => {
    if (skipSave.current) return;
    if (docTarget === "kitchen") pendingKitchen.current = { ...pendingKitchen.current, ...patch };
    else pendingCatalog.current = { ...pendingCatalog.current, ...patch };
    setSaveStatus("pending");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, SAVE_DELAY);
  }, [doSave]);

  const forceSave = useCallback(() => doSave(), [doSave]);

  // ── Wrapped setters ────────────────────────────────────────────────────────
  const makeSet = (field, setter, docTarget) => (valOrFn) => {
    setter((prev) => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      setTimeout(() => scheduleSync(docTarget, { [field]: next }), 0);
      return next;
    });
  };

  return {
    loaded, saveStatus, forceSave,
    ingredients,  setIngredients:  makeSet("ingredients",  setIngredients,  "catalog"),
    recipes,      setRecipes:      makeSet("recipes",      setRecipes,      "catalog"),
    orders,       setOrders:       makeSet("orders",       setOrders,       "kitchen"),
    inventory,    setInventory:    makeSet("inventory",    setInventory,    "kitchen"),
    locations,    setLocations:    makeSet("locations",    setLocations,    "kitchen"),
    recipeTypes,  setRecipeTypes:  makeSet("recipeTypes",  setRecipeTypes,  "kitchen"),
  };
}
