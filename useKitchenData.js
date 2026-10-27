import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "./firebase.js";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { ING0, REC0, LOC0, RTYPE_SEED } from "./seeds.js";

const COL          = "koviloor";
const KITCHEN_DOC  = "kitchen";   // inventory, locations, recipeTypes only
const ORDERS_DOC   = "orders";    // orders split here to avoid 1 MB limit
const CATALOG_DOC  = "catalog";
const POOJA_DOC    = "pooja";
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

  // Stable refs — always current, never stale
  // kit: inventory / locations / recipeTypes  (orders removed to its own doc)
  const kit = useRef({ inventory:{purchases:[],issues:[]}, locations:[], recipeTypes:[] });
  const ord = useRef({ orders: [] });   // <-- dedicated ref for orders
  const cat = useRef({ recipes:[], ingredients:[] });
  const poo = useRef({ poojaItems:[], poojaTemples:[], poojaDels:[] });

  const saveTimer  = useRef(null);
  const kitSaving  = useRef(false);
  const ordSaving  = useRef(false);
  const catSaving  = useRef(false);
  const pooSaving  = useRef(false);
  const kitDirty   = useRef(false);
  const ordDirty   = useRef(false);
  const catDirty   = useRef(false);
  const pooDirty   = useRef(false);
  const kitOK      = useRef(false);
  const ordOK      = useRef(false);
  const catOK      = useRef(false);
  const pooOK      = useRef(false);

  const checkLoaded = () => {
    if (kitOK.current && ordOK.current && catOK.current && pooOK.current) setLoaded(true);
  };

  // ── Kitchen (inventory + locations + recipeTypes only) ──────────────────
  useEffect(() => {
    const ref = doc(db, COL, KITCHEN_DOC);
    return onSnapshot(ref, snap => {
      const d = snap.exists() ? snap.data() : null;
      // Default excludes orders — they live in ORDERS_DOC now
      const data = d || { inventory:{purchases:[],issues:[]}, locations:LOC0, recipeTypes:RTYPE_SEED };
      if (!d) setDoc(ref, clean(data));
      if (!kitSaving.current) {
        kit.current.inventory   = data.inventory   ?? { purchases:[], issues:[] };
        kit.current.locations   = data.locations   ?? LOC0;
        kit.current.recipeTypes = data.recipeTypes ?? RTYPE_SEED;
      }
      _setInventory(data.inventory   ?? { purchases:[], issues:[] });
      _setLocations(data.locations   ?? LOC0);
      _setRecipeTypes(data.recipeTypes ?? RTYPE_SEED);
      kitOK.current = true; checkLoaded();
    }, err => { console.error("Kitchen:", err); kitOK.current=true; checkLoaded(); });
  }, []);

  // ── Orders (separate doc — avoids Firestore 1 MB limit) ─────────────────
  // On first deploy: auto-migrates existing orders from koviloor/kitchen.
  useEffect(() => {
    const ref = doc(db, COL, ORDERS_DOC);
    return onSnapshot(ref, async snap => {
      if (snap.exists()) {
        // Normal path after migration
        const data = snap.data();
        if (!ordSaving.current) {
          ord.current.orders = data.orders ?? [];
        }
        _setOrders(data.orders ?? []);
        ordOK.current = true; checkLoaded();
      } else {
        // First deploy: migrate orders from old kitchen doc
        try {
          const kitSnap = await getDoc(doc(db, COL, KITCHEN_DOC));
          const kitData = kitSnap.exists() ? kitSnap.data() : {};
          const migrated = kitData.orders ?? [];
          const initData = { orders: migrated };
          await setDoc(ref, clean(initData));
          // Note: the onSnapshot above will fire again after setDoc, updating state then.
        } catch(e) {
          console.error("Orders migration failed:", e);
          await setDoc(ref, { orders: [] });
          ordOK.current = true; checkLoaded();
        }
      }
    }, err => { console.error("Orders:", err); ordOK.current=true; checkLoaded(); });
  }, []);

  // ── Catalog ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ref = doc(db, COL, CATALOG_DOC);
    return onSnapshot(ref, snap => {
      const d = snap.exists() ? snap.data() : null;
      const data = d || { recipes:REC0, ingredients:ING0 };
      if (!d) setDoc(ref, clean(data));
      if (!catSaving.current) {
        cat.current.recipes     = data.recipes     ?? REC0;
        cat.current.ingredients = data.ingredients ?? ING0;
      }
      _setRecipes(data.recipes     ?? REC0);
      _setIngredients(data.ingredients ?? ING0);
      catOK.current = true; checkLoaded();
    }, err => { console.error("Catalog:", err); catOK.current=true; checkLoaded(); });
  }, []);

  // ── Pooja ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ref = doc(db, COL, POOJA_DOC);
    return onSnapshot(ref, snap => {
      const d = snap.exists() ? snap.data() : null;
      const data = d || { poojaItems:[], poojaTemples:[], poojaDels:[] };
      if (!d) setDoc(ref, clean(data));
      if (!pooSaving.current) {
        poo.current.poojaItems   = data.poojaItems   ?? [];
        poo.current.poojaTemples = data.poojaTemples ?? [];
        poo.current.poojaDels    = data.poojaDels    ?? [];
      }
      _setPoojaItems(data.poojaItems   ?? []);
      _setPoojaTemples(data.poojaTemples ?? []);
      _setPoojaDels(data.poojaDels    ?? []);
      pooOK.current = true; checkLoaded();
    }, err => { console.error("Pooja:", err); pooOK.current=true; checkLoaded(); });
  }, []);

  // ── Debounced save ─────────────────────────────────────────────────────────
  const triggerSave = useCallback(() => {
    setSaveStatus("pending");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      const saves = [];

      if (kitDirty.current) {
        kitDirty.current = false;
        kitSaving.current = true;
        // Saves kit WITHOUT orders — doc shrinks dramatically on first write
        saves.push(
          setDoc(doc(db, COL, KITCHEN_DOC), clean(kit.current))
            .finally(() => { kitSaving.current = false; })
        );
      }
      if (ordDirty.current) {
        ordDirty.current = false;
        ordSaving.current = true;
        saves.push(
          setDoc(doc(db, COL, ORDERS_DOC), clean(ord.current))
            .finally(() => { ordSaving.current = false; })
        );
      }
      if (catDirty.current) {
        catDirty.current = false;
        catSaving.current = true;
        saves.push(
          setDoc(doc(db, COL, CATALOG_DOC), clean(cat.current))
            .finally(() => { catSaving.current = false; })
        );
      }
      if (pooDirty.current) {
        pooDirty.current = false;
        pooSaving.current = true;
        saves.push(
          setDoc(doc(db, COL, POOJA_DOC), clean(poo.current))
            .finally(() => { pooSaving.current = false; })
        );
      }

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
    kitSaving.current = ordSaving.current = catSaving.current = pooSaving.current = true;
    try {
      await Promise.all([
        setDoc(doc(db, COL, KITCHEN_DOC), clean(kit.current)),
        setDoc(doc(db, COL, ORDERS_DOC),  clean(ord.current)),
        setDoc(doc(db, COL, CATALOG_DOC), clean(cat.current)),
        setDoc(doc(db, COL, POOJA_DOC),   clean(poo.current)),
      ]);
      setSaveStatus("saved");
    } catch(e) {
      console.error("Force save failed:", e);
      setSaveStatus("error");
    } finally {
      kitSaving.current = ordSaving.current = catSaving.current = pooSaving.current = false;
      kitDirty.current = ordDirty.current = catDirty.current = pooDirty.current = false;
    }
  }, []);

  // ── Wrapped setters ────────────────────────────────────────────────────────
  const makeKitSet = (field, setter) => (valOrFn) => {
    setter(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      kit.current[field] = next;
      return next;
    });
    kitDirty.current = true;
    triggerSave();
  };

  // Orders now use their own ref and dirty flag
  const makeOrdSet = (field, setter) => (valOrFn) => {
    setter(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      ord.current[field] = next;
      return next;
    });
    ordDirty.current = true;
    triggerSave();
  };

  const makeCatSet = (field, setter) => (valOrFn) => {
    setter(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      cat.current[field] = next;
      return next;
    });
    catDirty.current = true;
    triggerSave();
  };

  const makePooSet = (field, setter) => (valOrFn) => {
    setter(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      poo.current[field] = next;
      return next;
    });
    pooDirty.current = true;
    triggerSave();
  };

  return {
    loaded, saveStatus, forceSave,
    ingredients,  setIngredients:  makeCatSet("ingredients",  _setIngredients),
    recipes,      setRecipes:      makeCatSet("recipes",      _setRecipes),
    orders,       setOrders:       makeOrdSet("orders",       _setOrders),   // ← now ord doc
    inventory,    setInventory:    makeKitSet("inventory",    _setInventory),
    locations,    setLocations:    makeKitSet("locations",    _setLocations),
    recipeTypes,  setRecipeTypes:  makeKitSet("recipeTypes",  _setRecipeTypes),
    poojaItems,   setPoojaItems:   makePooSet("poojaItems",   _setPoojaItems),
    poojaTemples, setPoojaTemples: makePooSet("poojaTemples", _setPoojaTemples),
    poojaDels,    setPoojaDels:    makePooSet("poojaDels",    _setPoojaDels),
  };
}
