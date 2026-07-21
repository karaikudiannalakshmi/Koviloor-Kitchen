import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "./firebase.js";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ING0, REC0, LOC0, RTYPE_SEED } from "./seeds.js";

const COL          = "koviloor";
const KITCHEN_DOC  = "kitchen";
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
  const kit = useRef({ orders:[], inventory:{purchases:[],issues:[]}, locations:[], recipeTypes:[] });
  const cat = useRef({ recipes:[], ingredients:[] });
  const poo = useRef({ poojaItems:[], poojaTemples:[], poojaDels:[] });

  const saveTimer  = useRef(null);
  const kitSaving  = useRef(false);
  const catSaving  = useRef(false);
  const pooSaving  = useRef(false);
  const kitDirty   = useRef(false);
  const catDirty   = useRef(false);
  const pooDirty   = useRef(false);
  const kitOK      = useRef(false);
  const catOK      = useRef(false);
  const pooOK      = useRef(false);

  const [saveStatus2, _ignore] = useState(null); // unused, kept for compat

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
      if (!kitSaving.current) {
        kit.current.orders      = data.orders      ?? [];
        kit.current.inventory   = data.inventory   ?? { purchases:[], issues:[] };
        kit.current.locations   = data.locations   ?? LOC0;
        kit.current.recipeTypes = data.recipeTypes ?? RTYPE_SEED;
      }
      _setOrders(data.orders       ?? []);
      _setInventory(data.inventory  ?? { purchases:[], issues:[] });
      _setLocations(data.locations  ?? LOC0);
      _setRecipeTypes(data.recipeTypes ?? RTYPE_SEED);
      kitOK.current = true; checkLoaded();
    }, err => { console.error("Kitchen:", err); kitOK.current=true; checkLoaded(); });
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
        saves.push(
          setDoc(doc(db, COL, KITCHEN_DOC), clean(kit.current))
            .finally(() => { kitSaving.current = false; })
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
    kitSaving.current = catSaving.current = pooSaving.current = true;
    try {
      await Promise.all([
        setDoc(doc(db, COL, KITCHEN_DOC), clean(kit.current)),
        setDoc(doc(db, COL, CATALOG_DOC), clean(cat.current)),
        setDoc(doc(db, COL, POOJA_DOC),   clean(poo.current)),
      ]);
      setSaveStatus("saved");
    } catch(e) {
      console.error("Force save failed:", e);
      setSaveStatus("error");
    } finally {
      kitSaving.current = catSaving.current = pooSaving.current = false;
      kitDirty.current = catDirty.current = pooDirty.current = false;
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
    orders,       setOrders:       makeKitSet("orders",       _setOrders),
    inventory,    setInventory:    makeKitSet("inventory",    _setInventory),
    locations,    setLocations:    makeKitSet("locations",    _setLocations),
    recipeTypes,  setRecipeTypes:  makeKitSet("recipeTypes",  _setRecipeTypes),
    poojaItems,   setPoojaItems:   makePooSet("poojaItems",   _setPoojaItems),
    poojaTemples, setPoojaTemples: makePooSet("poojaTemples", _setPoojaTemples),
    poojaDels,    setPoojaDels:    makePooSet("poojaDels",    _setPoojaDels),
  };
}
