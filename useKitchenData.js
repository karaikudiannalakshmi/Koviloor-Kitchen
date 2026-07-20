import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "./firebase.js";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ING0, REC0, LOC0, RTYPE_SEED } from "./seeds.js";

const COL         = "koviloor";
const KITCHEN_DOC = "kitchen";
const CATALOG_DOC = "catalog";
const SAVE_DELAY  = 2500;

// Strip undefined — Firestore rejects it
function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v !== null && typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v))
      if (val !== undefined) o[k] = clean(val);
    return o;
  }
  return v;
}

export function useKitchenData() {
  const [loaded,     setLoaded]     = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");

  const [ingredients,  _setIngredients]  = useState([]);
  const [recipes,      _setRecipes]      = useState([]);
  const [orders,       _setOrders]       = useState([]);
  const [inventory,    _setInventory]    = useState({ purchases: [], issues: [] });
  const [locations,    _setLocations]    = useState([]);
  const [recipeTypes,  _setRecipeTypes]  = useState([]);
  const [poojaItems,   _setPoojaItems]   = useState([]);
  const [poojaTemples, _setPoojaTemples] = useState([]);
  const [poojaDels,    _setPoojaDels]    = useState([]);

  // cur mirrors the latest user-edited state for Firestore writes
  const cur       = useRef({ orders:[], inventory:{purchases:[],issues:[]}, locations:[], recipeTypes:[], ingredients:[], recipes:[] });
  const saveTimer = useRef(null);
  const saving    = useRef(false); // true while a save is in-flight — blocks onSnapshot overwrite
  const kitOK     = useRef(false);
  const catOK     = useRef(false);

  const checkLoaded = () => { if (kitOK.current && catOK.current) setLoaded(true); };

  // Kitchen subscription — uses raw setters, does NOT trigger saves
  useEffect(() => {
    const ref = doc(db, COL, KITCHEN_DOC);
    return onSnapshot(ref, snap => {
      const d = snap.exists() ? snap.data() : null;
      const data = d || { orders:[], inventory:{purchases:[],issues:[]}, locations:LOC0, recipeTypes:RTYPE_SEED };
      if (!d) setDoc(ref, clean(data));
      // Only update cur if no pending save (avoids overwriting user edits)
      if (!saving.current) {
        cur.current.orders      = data.orders      ?? [];
        cur.current.inventory   = data.inventory   ?? { purchases:[], issues:[] };
        cur.current.locations   = data.locations   ?? LOC0;
        cur.current.recipeTypes = data.recipeTypes ?? RTYPE_SEED;
      }
      _setOrders(data.orders      ?? []);
      _setInventory(data.inventory ?? { purchases:[], issues:[] });
      _setLocations(data.locations ?? LOC0);
      _setRecipeTypes(data.recipeTypes ?? RTYPE_SEED);
      _setPoojaItems(data.poojaItems   ?? []);
      _setPoojaTemples(data.poojaTemples ?? []);
      _setPoojaDels(data.poojaDels    ?? []);
      kitOK.current = true;
      checkLoaded();
    }, err => { console.error("Kitchen:", err); setLoaded(true); });
  }, []);

  // Catalog subscription
  useEffect(() => {
    const ref = doc(db, COL, CATALOG_DOC);
    return onSnapshot(ref, snap => {
      const d = snap.exists() ? snap.data() : null;
      const data = d || { recipes:REC0, ingredients:ING0 };
      if (!d) setDoc(ref, clean(data));
      if (!saving.current) {
        cur.current.recipes     = data.recipes     ?? REC0;
        cur.current.ingredients = data.ingredients ?? ING0;
      }
      _setRecipes(data.recipes     ?? REC0);
      _setIngredients(data.ingredients ?? ING0);
      catOK.current = true;
      checkLoaded();
    }, err => { console.error("Catalog:", err); setLoaded(true); });
  }, []);

  const doSave = useCallback(() => {
    saving.current = true;
    setSaveStatus("saving");
    Promise.all([
      setDoc(doc(db, COL, KITCHEN_DOC), clean({
        orders:       cur.current.orders,
        inventory:    cur.current.inventory,
        locations:    cur.current.locations,
        recipeTypes:  cur.current.recipeTypes,
        poojaItems:   cur.current.poojaItems,
        poojaTemples: cur.current.poojaTemples,
        poojaDels:    cur.current.poojaDels,
      })),
      setDoc(doc(db, COL, CATALOG_DOC), clean({
        recipes:     cur.current.recipes,
        ingredients: cur.current.ingredients,
      })),
    ])
      .then(() => { saving.current = false; setSaveStatus("saved"); })
      .catch(e => { saving.current = false; console.error("Save failed:", e); setSaveStatus("error"); });
  }, []);

  const scheduleSave = useCallback(() => {
    // Don't setSaveStatus here — avoids re-rendering App/children on every keystroke
    // Status is set inside doSave when it actually fires
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus("pending");
      // Small delay so UI updates before heavy save
      requestAnimationFrame(doSave);
    }, SAVE_DELAY);
  }, [doSave]);

  const forceSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    doSave();
  }, [doSave]);

  // Wrapped setters — update cur ref synchronously, then schedule save
  // Using raw setters for React state so no re-render loop
  const makeSet = (field, rawSetter) => (valOrFn) => {
    rawSetter(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      cur.current[field] = next;
      return next;
    });
    scheduleSave();
  };

  return {
    loaded, saveStatus, forceSave,
    ingredients,  setIngredients:  makeSet("ingredients",  _setIngredients),
    recipes,      setRecipes:      makeSet("recipes",      _setRecipes),
    orders,       setOrders:       makeSet("orders",       _setOrders),
    inventory,    setInventory:    makeSet("inventory",    _setInventory),
    locations,    setLocations:    makeSet("locations",    _setLocations),
    recipeTypes,  setRecipeTypes:  makeSet("recipeTypes",  _setRecipeTypes),
    poojaItems,   setPoojaItems:   makeSet("poojaItems",   _setPoojaItems),
    poojaTemples, setPoojaTemples: makeSet("poojaTemples", _setPoojaTemples),
    poojaDels,    setPoojaDels:    makeSet("poojaDels",    _setPoojaDels),
  };
}
