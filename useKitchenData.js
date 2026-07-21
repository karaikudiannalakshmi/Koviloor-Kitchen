import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "./firebase.js";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ING0, REC0, LOC0, RTYPE_SEED } from "./seeds.js";

const COL          = "koviloor";
const KITCHEN_DOC  = "kitchen";   // orders, inventory, locations, recipeTypes
const CATALOG_DOC  = "catalog";   // recipes, ingredients
const POOJA_DOC    = "pooja";     // poojaItems, poojaTemples, poojaDels — own doc
const SAVE_DELAY   = 2000;

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

  const cur = useRef({
    orders: [], inventory: { purchases: [], issues: [] },
    locations: [], recipeTypes: [],
    ingredients: [], recipes: [],
    poojaItems: [], poojaTemples: [], poojaDels: [],
  });

  const saveTimer  = useRef(null);
  const savingKit  = useRef(false);
  const savingCat  = useRef(false);
  const savingPoo  = useRef(false);
  const kitOK      = useRef(false);
  const catOK      = useRef(false);
  const pooOK      = useRef(false);

  const checkLoaded = () => {
    if (kitOK.current && catOK.current && pooOK.current) setLoaded(true);
  };

  // ── Kitchen ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ref = doc(db, COL, KITCHEN_DOC);
    return onSnapshot(ref, snap => {
      const d = snap.exists() ? snap.data() : null;
      const data = d || { orders:[], inventory:{purchases:[],issues:[]}, locations:LOC0, recipeTypes:RTYPE_SEED };
      if (!d) setDoc(ref, clean(data));
      if (!savingKit.current) {
        cur.current.orders      = data.orders      ?? [];
        cur.current.inventory   = data.inventory   ?? { purchases:[], issues:[] };
        cur.current.locations   = data.locations   ?? LOC0;
        cur.current.recipeTypes = data.recipeTypes ?? RTYPE_SEED;
      }
      _setOrders(data.orders       ?? []);
      _setInventory(data.inventory  ?? { purchases:[], issues:[] });
      _setLocations(data.locations  ?? LOC0);
      _setRecipeTypes(data.recipeTypes ?? RTYPE_SEED);
      kitOK.current = true; checkLoaded();
    }, err => { console.error("Kitchen:", err); setLoaded(true); });
  }, []);

  // ── Catalog ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ref = doc(db, COL, CATALOG_DOC);
    return onSnapshot(ref, snap => {
      const d = snap.exists() ? snap.data() : null;
      const data = d || { recipes:REC0, ingredients:ING0 };
      if (!d) setDoc(ref, clean(data));
      if (!savingCat.current) {
        cur.current.recipes     = data.recipes     ?? REC0;
        cur.current.ingredients = data.ingredients ?? ING0;
      }
      _setRecipes(data.recipes     ?? REC0);
      _setIngredients(data.ingredients ?? ING0);
      catOK.current = true; checkLoaded();
    }, err => { console.error("Catalog:", err); setLoaded(true); });
  }, []);

  // ── Pooja — dedicated document, completely isolated from kitchen saves ──────
  useEffect(() => {
    const ref = doc(db, COL, POOJA_DOC);
    return onSnapshot(ref, snap => {
      const d = snap.exists() ? snap.data() : null;
      const data = d || { poojaItems:[], poojaTemples:[], poojaDels:[] };
      if (!d) setDoc(ref, clean(data));
      if (!savingPoo.current) {
        cur.current.poojaItems   = data.poojaItems   ?? [];
        cur.current.poojaTemples = data.poojaTemples ?? [];
        cur.current.poojaDels    = data.poojaDels    ?? [];
      }
      _setPoojaItems(data.poojaItems   ?? []);
      _setPoojaTemples(data.poojaTemples ?? []);
      _setPoojaDels(data.poojaDels    ?? []);
      pooOK.current = true; checkLoaded();
    }, err => { console.error("Pooja:", err); setLoaded(true); });
  }, []);

  // ── Save helpers ───────────────────────────────────────────────────────────
  const saveKitchen = () => {
    savingKit.current = true;
    return setDoc(doc(db, COL, KITCHEN_DOC), clean({
      orders:      cur.current.orders,
      inventory:   cur.current.inventory,
      locations:   cur.current.locations,
      recipeTypes: cur.current.recipeTypes,
    })).finally(() => { savingKit.current = false; });
  };

  const saveCatalog = () => {
    savingCat.current = true;
    return setDoc(doc(db, COL, CATALOG_DOC), clean({
      recipes:     cur.current.recipes,
      ingredients: cur.current.ingredients,
    })).finally(() => { savingCat.current = false; });
  };

  const savePooja = () => {
    savingPoo.current = true;
    return setDoc(doc(db, COL, POOJA_DOC), clean({
      poojaItems:   cur.current.poojaItems,
      poojaTemples: cur.current.poojaTemples,
      poojaDels:    cur.current.poojaDels,
    })).finally(() => { savingPoo.current = false; });
  };

  // Track which docs have pending changes
  const pendingKit = useRef(false);
  const pendingCat = useRef(false);
  const pendingPoo = useRef(false);
  const saveTimer2 = useRef(null);

  const scheduleSave = useCallback((kit, cat, poo) => {
    if (kit) pendingKit.current = true;
    if (cat) pendingCat.current = true;
    if (poo) pendingPoo.current = true;
    setSaveStatus("pending");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      const saves = [];
      if (pendingKit.current) { pendingKit.current = false; saves.push(saveKitchen()); }
      if (pendingCat.current) { pendingCat.current = false; saves.push(saveCatalog()); }
      if (pendingPoo.current) { pendingPoo.current = false; saves.push(savePooja()); }
      try {
        await Promise.all(saves);
        setSaveStatus("saved");
      } catch(e) {
        console.error("Save failed:", e);
        setSaveStatus("error");
      }
    }, SAVE_DELAY);
  }, []);

  const forceSave = useCallback(async () => {
    clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    try {
      await Promise.all([saveKitchen(), saveCatalog(), savePooja()]);
      setSaveStatus("saved");
    } catch(e) {
      console.error("Force save failed:", e);
      setSaveStatus("error");
    }
  }, []);

  const makeSet = (field, rawSetter, docGroup) => (valOrFn) => {
    rawSetter(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      cur.current[field] = next;
      return next;
    });
    scheduleSave(
      docGroup === "kitchen",
      docGroup === "catalog",
      docGroup === "pooja"
    );
  };

  return {
    loaded, saveStatus, forceSave,
    ingredients,  setIngredients:  makeSet("ingredients",  _setIngredients,  "catalog"),
    recipes,      setRecipes:      makeSet("recipes",      _setRecipes,      "catalog"),
    orders,       setOrders:       makeSet("orders",       _setOrders,       "kitchen"),
    inventory,    setInventory:    makeSet("inventory",    _setInventory,    "kitchen"),
    locations,    setLocations:    makeSet("locations",    _setLocations,    "kitchen"),
    recipeTypes,  setRecipeTypes:  makeSet("recipeTypes",  _setRecipeTypes,  "kitchen"),
    poojaItems,   setPoojaItems:   makeSet("poojaItems",   _setPoojaItems,   "pooja"),
    poojaTemples, setPoojaTemples: makeSet("poojaTemples", _setPoojaTemples, "pooja"),
    poojaDels,    setPoojaDels:    makeSet("poojaDels",    _setPoojaDels,    "pooja"),
  };
}
