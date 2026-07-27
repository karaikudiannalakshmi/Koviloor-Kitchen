import { useState, useEffect, useMemo, useRef } from "react";
import { useKitchenData } from "./useKitchenData.js";
import { RTYPE_SEED } from "./seeds.js";
import * as XLSX from "xlsx";
function PostIssues({ctx,date,onClose}){
  const {orders,recipes,ingredients,setInventory,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:x.nameTamil;

  const entries=orders.filter(o=>!o.isTemplate&&o.date===date)
    .flatMap(o=>o.entries.map(e=>({...e,_order:o})));
  const rows=computeTotals(entries,recipes,ingredients);
  const totals={};
  rows.forEach(r=>{if(!totals[r.d.id])totals[r.d.id]={d:r.d,qty:0,unit:r.unit};totals[r.d.id].qty+=r.qty;});

  const [edits,setEdits]=useState(Object.fromEntries(Object.values(totals).map(r=>[r.d.id,r.qty.toFixed(2)])));
  const [editing,setEditing]=useState({}); // which rows are in edit mode

  const toggleEdit=(id)=>setEditing(p=>({...p,[id]:!p[id]}));
  const resetRow=(id,qty)=>{setEdits(p=>({...p,[id]:qty.toFixed(2)}));setEditing(p=>({...p,[id]:false}));};

  const post=()=>{
    const newIss=Object.values(totals).map(r=>({
      id:Date.now()+r.d.id,iid:r.d.id,date,
      qty:+edits[r.d.id],unit:r.unit,
      note:`Auto from orders ${date}`,
      adjusted:+edits[r.d.id]!==+r.qty.toFixed(2),
    }));
    setInventory(p=>({...p,issues:[...p.issues,...newIss]}));
    onClose();
  };

  const totalCost=Object.values(totals).reduce((s,r)=>s+(r.d.normCost||0)*(+edits[r.d.id]||r.qty),0);

  return(
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown,marginBottom:4}}>
        {t("Post Issues","இன்வெண்டரி வழங்கல்")} — {date}
      </div>
      <div style={{fontSize:12,color:P.muted,marginBottom:14}}>
        {t("Click ✏️ Edit on any row to adjust quantity for taste/quality reasons.","தரம் / சுவை காரணமாக அளவை மாற்ற Edit அழுத்தவும்.")}
      </div>

      {Object.keys(totals).length===0&&(
        <div style={{color:P.muted,textAlign:"center",padding:16}}>{t("No orders found for this date.","இந்த தேதியில் ஆர்டர் இல்லை.")}</div>
      )}

      <table style={css.table}>
        <thead><tr>
          <th style={css.th}>{t("Ingredient","பொருள்")}</th>
          <th style={{...css.th,textAlign:"right"}}>{t("Calculated","கணித்தது")}</th>
          <th style={{...css.th,textAlign:"right"}}>{t("To Issue","வழங்கல்")}</th>
          <th style={{...css.th,textAlign:"right"}}>{t("Diff","வித்தியாசம்")}</th>
          <th style={{...css.th,textAlign:"right"}}>{t("Value","மதிப்பு")}</th>
          <th style={css.th}></th>
        </tr></thead>
        <tbody>
          {Object.values(totals).map((r,i)=>{
            const calc=r.qty;
            const issued=+edits[r.d.id]||calc;
            const diff=issued-calc;
            const isEditing=!!editing[r.d.id];
            const changed=Math.abs(diff)>0.001;
            const issueVal=(r.d.normCost||0)*issued;
            return(
              <tr key={r.d.id} style={{background:changed?"#FFFBEB":i%2===0?P.white:P.highlight}}>
                <td style={css.td}><strong>{n(r.d)}</strong></td>
                <td style={{...css.td,textAlign:"right",color:P.muted}}>{calc.toFixed(2)} {r.unit}</td>
                <td style={{...css.td,textAlign:"right"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end"}}>
                    <input type="number" step="0.01" min="0"
                      disabled={!isEditing}
                      style={{...css.inp,width:90,textAlign:"right",
                        borderColor:isEditing?P.saffron:"transparent",
                        background:isEditing?P.white:"transparent",
                        fontWeight:700,
                        color:changed?P.saffron:P.deepBrown}}
                      value={edits[r.d.id]}
                      onChange={e=>setEdits(p=>({...p,[r.d.id]:e.target.value}))}/>
                    <span style={{fontSize:11,color:P.muted}}>{r.unit}</span>
                  </div>
                </td>
                <td style={{...css.td,textAlign:"right"}}>
                  {changed?(
                    <span style={{...css.badge(diff>0?P.saffron:P.info),fontSize:10}}>
                      {diff>0?"+":""}{diff.toFixed(2)} {r.unit}
                    </span>
                  ):<span style={{color:"#CCC",fontSize:11}}>—</span>}
                </td>
                <td style={{...css.td,textAlign:"right"}}>
                  {issueVal>0?<strong style={{color:P.success}}>₹{issueVal.toFixed(2)}</strong>:<span style={{color:"#CCC"}}>—</span>}
                </td>
                <td style={{...css.td}}>
                  <div style={{display:"flex",gap:4}}>
                    <button style={css.btn(isEditing?"primary":"ghost",true)} onClick={()=>toggleEdit(r.d.id)}>
                      {isEditing?"✓":t("✏️ Edit","✏️ திருத்து")}
                    </button>
                    {changed&&!isEditing&&(
                      <button style={css.btn("ghost",true)} title="Reset to calculated" onClick={()=>resetRow(r.d.id,calc)}>↩</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalCost>0&&(
        <div style={{background:P.success+"18",border:"1px solid "+P.success+"33",borderRadius:7,padding:"8px 12px",marginTop:10,fontWeight:700,color:P.success,textAlign:"right"}}>
          📐 {t("Total Issue Value","மொத்த வழங்கல் மதிப்பு")}: ₹{totalCost.toFixed(2)}
        </div>
      )}

      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
        <button style={css.btn("ghost")} onClick={onClose}>{t("Cancel","ரத்து")}</button>
        <button style={css.btn("success")} onClick={post}>📦 {t("Post Issues","வழங்கு")}</button>
      </div>
    </div>
  );
}


const fl = document.createElement("link");
fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap";
document.head.appendChild(fl);

const P = {
  nav:"#1C1410",border:"#3D2810",saffron:"#E8821A",gold:"#C9960C",cream:"#FEF6E8",
  cardBg:"#FFFBF3",white:"#FFFFFF",deepBrown:"#5C2A0A",brown:"#8B4513",muted:"#9B7355",
  success:"#1A7A40",danger:"#C0392B",info:"#1A6B8A",purple:"#6B3FA0",highlight:"#FEF0D4",
};

const css = {
  app:{display:"flex",height:"100vh",fontFamily:"'DM Sans',sans-serif",background:P.cream,overflow:"hidden"},
  nav:{width:210,background:P.nav,display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"},
  navTop:{padding:"18px 14px 12px",borderBottom:`1px solid ${P.border}`},
  navTitle:{fontFamily:"'Playfair Display',serif",color:"#F5DEB3",fontSize:14,fontWeight:700,lineHeight:1.3},
  navSub:{fontFamily:"'Noto Sans Tamil',sans-serif",color:P.saffron,fontSize:11,marginTop:3},
  navItem:(a,sub)=>({
    display:"flex",alignItems:"center",gap:8,
    padding:sub?"7px 14px 7px 30px":"9px 14px",
    cursor:"pointer",fontSize:12,fontWeight:a?600:400,
    color:a?"#F5DEB3":"rgba(245,222,179,0.55)",
    background:a?"rgba(232,130,26,0.18)":"transparent",
    borderLeft:a?`3px solid ${P.saffron}`:"3px solid transparent",
    transition:"all 0.15s",userSelect:"none",
  }),
  main:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  topbar:{background:P.white,borderBottom:"2px solid #F0D8B0",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0},
  pageTitle:{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown,fontWeight:700},
  content:{flex:1,overflowY:"auto",padding:20},
  card:{background:P.cardBg,border:"1px solid #EDD9A3",borderRadius:10,padding:18,marginBottom:14},
  sHead:{fontFamily:"'Playfair Display',serif",fontSize:15,color:P.deepBrown,fontWeight:700,marginBottom:12,paddingBottom:7,borderBottom:"2px solid #EDD9A3"},
  table:{width:"100%",borderCollapse:"collapse",fontSize:12},
  th:{background:P.nav,color:"#F5DEB3",padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:600,whiteSpace:"nowrap"},
  td:{padding:"8px 10px",borderBottom:`1px solid ${P.highlight}`,color:P.deepBrown,verticalAlign:"middle"},
  btn:(v="primary",sm)=>({
    padding:sm?"4px 10px":"7px 14px",borderRadius:7,cursor:"pointer",
    fontSize:sm?11:12,fontWeight:600,
    background:v==="primary"?P.saffron:v==="danger"?P.danger:v==="success"?P.success:v==="info"?P.info:v==="ghost"?"transparent":"#F0E6D3",
    color:["primary","danger","success","info"].includes(v)?P.white:P.deepBrown,
    border:v==="ghost"?"1px solid #DCC88A":"none",
  }),
  inp:{width:"100%",padding:"7px 10px",borderRadius:7,border:"1px solid #DCC88A",background:P.white,fontSize:12,color:P.deepBrown,outline:"none",boxSizing:"border-box"},
  sel:{padding:"7px 10px",borderRadius:7,border:"1px solid #DCC88A",background:P.white,fontSize:12,color:P.deepBrown,outline:"none"},
  lbl:{fontSize:11,fontWeight:600,color:P.muted,marginBottom:3,display:"block"},
  badge:(c)=>({display:"inline-block",padding:"2px 7px",borderRadius:20,fontSize:10,fontWeight:600,background:c+"22",color:c,border:`1px solid ${c}44`}),
  g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14},
  g3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14},
  modal:{position:"fixed",inset:0,background:"rgba(28,20,16,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000},
  mbox:(w=700)=>({background:P.white,borderRadius:14,padding:24,width:`min(${w}px,96vw)`,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.45)"}),
  stat:(c)=>({background:c+"18",border:`1px solid ${c}33`,borderRadius:10,padding:16,textAlign:"center"}),
};

const SESSIONS=["Breakfast","Lunch","Snack","Dinner"];
const SCOLOR={Breakfast:"#0EA5E9",Lunch:"#10B981",Snack:"#F59E0B",Dinner:"#8B5CF6"};
const CATCOLOR={grocery:P.gold,vegetable:"#2E7D32",spice:P.saffron,other:P.purple,cut:"#0D7377",sub:P.info};

// ── Recipe Type Color Palette (cycles for user-added types) ──────────────────
const TYPE_PALETTE=[
  "#C0392B","#E67E22","#F39C12","#27AE60","#16A085","#2980B9","#8E44AD",
  "#D35400","#1ABC9C","#2ECC71","#3498DB","#9B59B6","#E91E63","#00BCD4",
  "#FF5722","#607D8B","#795548","#4CAF50","#FF9800","#03A9F4",
];
// TYPE_COLOR kept for any legacy references
const TYPE_COLOR=Object.fromEntries(RTYPE_SEED.map(x=>[x.id,x.color]));
const PREP_STEP_TYPES=[
  {id:"soak",    en:"Soak",           ta:"ஊறவை",             defaultUnit:"hours"},
  {id:"grind",   en:"Grind",          ta:"அரை",               defaultUnit:"minutes"},
  {id:"ferment", en:"Ferment",        ta:"புளிக்கவை",         defaultUnit:"hours"},
  {id:"marinate",en:"Marinate",       ta:"ஊறல்",              defaultUnit:"minutes"},
  {id:"boil",    en:"Boil / Parboil", ta:"வேக வை",           defaultUnit:"minutes"},
  {id:"steam",   en:"Steam",          ta:"ஆவியில் வேக வை",    defaultUnit:"minutes"},
  {id:"pressure",en:"Pressure Cook",  ta:"குக்கரில் வேக வை",  defaultUnit:"minutes"},
  {id:"chop",    en:"Chop / Cut",     ta:"நறுக்கு",           defaultUnit:"minutes"},
  {id:"peel",    en:"Peel",           ta:"தோல் உரி",          defaultUnit:"minutes"},
  {id:"fry",     en:"Deep Fry",       ta:"பொரி",              defaultUnit:"minutes"},
  {id:"other",   en:"Other",          ta:"மற்றவை",            defaultUnit:"minutes"},
];

function applyScaling(baseQty,multiplier,factor,benchmark){
  const linear=baseQty*multiplier;
  if(!factor||factor>=1||!benchmark||linear<=benchmark)return linear;
  return benchmark+(linear-benchmark)*factor;
}

// ── Simple Levenshtein distance, used for duplicate-ingredient-name detection ──
function levenshtein(a,b){
  a=(a||"").toLowerCase(); b=(b||"").toLowerCase();
  const m=a.length,n=b.length;
  if(!m)return n; if(!n)return m;
  const dp=[];
  for(let i=0;i<=m;i++)dp.push(new Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i;
  for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j-1],dp[i-1][j],dp[i][j-1]);
    }
  }
  return dp[m][n];
}

const TODAY=new Date().toISOString().slice(0,10);

// ── Print utility ──────────────────────────────────────────────────────────────
function printHTML(title, htmlContent, extraHead="") {
  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap');
    body{font-family:'Noto Sans','Segoe UI',Arial,sans-serif;font-size:13px;color:#111;margin:20px;}
    h2{font-size:16px;color:#111;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;font-weight:700;}
    h3{font-size:14px;color:#333;margin:14px 0 5px;font-weight:700;}
    h4{font-size:13px;color:#333;margin:10px 0 3px;}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;}
    th{background:#222;color:white;padding:6px 8px;text-align:left;font-size:12px;}
    td{padding:4px 6px;border-bottom:1px solid #DDD;font-size:13px;}
    tr:nth-child(even) td{background:#F5F5F5;}
    .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
    @media print{.no-print{display:none;}body{margin:8px;}@page{margin:10mm;}}
  `;
  const date=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  const fullHtml='<!DOCTYPE html><html><head><meta charset="utf-8">'+extraHead+'<title>'+title+'</title><style>'+css+'</style></head><body>'
    +'<div class="hdr"><h2 style="border:none;margin:0">🍛 Koviloor Kitchen — '+title+'</h2>'
    +'<span style="font-size:11px;color:#9B7355">'+date+'</span></div>'
    +htmlContent+'</body></html>';

  // Use hidden iframe — works inside sandboxed environments where window.open is blocked
  const iframe=document.createElement('iframe');
  iframe.style.cssText='position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
  document.body.appendChild(iframe);
  try {
    iframe.contentDocument.open();
    iframe.contentDocument.write(fullHtml);
    iframe.contentDocument.close();
    setTimeout(()=>{
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(()=>document.body.removeChild(iframe),1000);
    },300);
  } catch(e) {
    // Fallback: open in new tab if iframe blocked too
    const blob=new Blob([fullHtml],{type:'text/html'});
    const url=URL.createObjectURL(blob);
    window.open(url,'_blank');
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    document.body.removeChild(iframe);
  }
}

function exportXlsxSheets(filename,sheets){
  const wb=XLSX.utils.book_new();
  sheets.forEach(s=>{const ws=XLSX.utils.json_to_sheet(s.data);XLSX.utils.book_append_sheet(wb,ws,s.name.slice(0,31));});
  XLSX.writeFile(wb,filename);
}

function ReportBar({onPrint,onExport,lang,setLang,children}){
  return(
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14,background:"#FFF8EC",border:"1px solid #EDD9A3",borderRadius:8,padding:"10px 12px"}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",flex:1,alignItems:"flex-end"}}>{children}</div>
      <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"flex-end"}}>
        <select style={{...css.sel,fontSize:11,padding:"4px 8px"}} value={lang} onChange={e=>setLang(e.target.value)}>
          <option value="en">English</option>
          <option value="ta">தமிழ்</option>
        </select>
        {onPrint&&<button style={css.btn("ghost",true)} onClick={onPrint}>🖨️ Print</button>}
        {onExport&&<button style={css.btn("success",true)} onClick={onExport}>📥 Excel</button>}
      </div>
    </div>
  );
}


// subLinks: [{subId, qty, unit}] — qty of sub-recipe needed per base yield of this recipe
// prepSteps: [{type, desc, duration, durationUnit, daysBefore}]
// recipeType: one of RECIPE_TYPES ids


// effectiveQty: scales entry.qty if pax override set. Returns qty to use in all calculations.
function effectiveQty(entry, order){
  if(!entry.pax||!order?.paxScale)return entry.qty;
  const key=entry.locId+"_"+entry.session;
  const cur=order.paxScale[key];
  if(!cur||cur===entry.pax)return entry.qty;
  return entry.qty*(cur/entry.pax);
}


const INV0={
  purchases:[
    {id:1,iid:1,date:TODAY,qty:100,unit:"kg",cpu:45,supplier:"Local Market",note:""},
    {id:2,iid:3,date:TODAY,qty:30,unit:"kg",cpu:110,supplier:"Local Market",note:""},
    {id:3,iid:18,date:TODAY,qty:10,unit:"kg",cpu:18,supplier:"Local Market",note:""},
    {id:4,iid:19,date:TODAY,qty:5,unit:"kg",cpu:250,supplier:"Local Market",note:""},
  ],
  issues:[],
};

// ── Expand a recipe's raw ingredients recursively via subLinks ────────────────
// mainMult = how many times the base recipe is being made
function expandRecipeIngs(rec, mainMult, recipes, ingredients, expandSubs=true, _visited=new Set()) {
  // Guard against circular sub-recipe references
  if (_visited.has(rec.id)) return [];
  const visited = new Set(_visited); visited.add(rec.id);

  const result = [];

  // 1. Always show direct ingredients
  (rec.ingredients||[]).forEach(ing => {
    const d = ingredients.find(x => x.id === ing.iid); if (!d) return;
    const scaled = applyScaling(ing.qty, mainMult, d.scalingFactor, d.scalingBenchmark);
    result.push({ d, qty: scaled, unit: ing.unit });
  });

  // 2. Sub-recipe links
  (rec.subLinks||[]).forEach(link => {
    const sub = recipes.find(r => r.id === link.subId); if (!sub) return;
    const scaledQty = link.qty * mainMult;
    if (!expandSubs) {
      // Show sub-recipe as a single virtual ingredient line
      const virtualIng = {
        id: 'sub_'+sub.id, name: sub.name, nameTamil: sub.nameTamil||sub.name,
        category: 'sub', unit: sub.yieldUnit||link.unit, normCost: 0, isSubRecipe: true,
      };
      result.push({ d: virtualIng, qty: +scaledQty.toFixed(4), unit: sub.yieldUnit||link.unit, isSubRecipe: true });
    } else {
      // Fully expand sub-recipe into raw ingredients
      const subMult = scaledQty / (sub.yield || 1);
      expandRecipeIngs(sub, subMult, recipes, ingredients, true, visited).forEach(si => result.push(si));
    }
  });
  return result;
}

// ── Aggregate ingredient rows (merge same iid) ────────────────────────────────
function mergeIngs(rows) {
  const map = {};
  rows.forEach(r => {
    const k = r.d.id;
    if (!map[k]) map[k] = { d: r.d, qty: 0, unit: r.unit };
    map[k].qty += r.qty;
  });
  return Object.values(map);
}

// ── Compute total ingredient cost for a recipe at given multiplier ────────────
function computeRecipeCost(rec, mult, recipes, ingredients) {
  const expanded = expandRecipeIngs(rec, mult, recipes, ingredients);
  return expanded.reduce((sum, row) => sum + (row.d.normCost||0) * row.qty, 0);
}

// ── Cost per single yield unit (e.g. ₹/kg or ₹/nos) ─────────────────────────
function costPerUnit(rec, recipes, ingredients) {
  if(!rec.yield) return 0;
  return computeRecipeCost(rec, 1, recipes, ingredients) / rec.yield;
}
function computeTotals(entries, recipes, ingredients, order, expandSubs=true) {
  const rows = [];
  entries.forEach(e => {
    const rec = recipes.find(r => r.id === e.recId); if (!rec) return;
    const ord = e._order || order;
    const qty = effectiveQty(e, ord);
    const mult = qty / (rec.yield || 1);
    const expanded = expandRecipeIngs(rec, mult, recipes, ingredients, expandSubs);
    expanded.forEach(row => {
      rows.push({ ...row, recId: e.recId, recName: rec.name, recNameT: rec.nameTamil, locId: e.locId, session: e.session });
    });
  });
  return rows;
}

// ════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════
function App(){
  const getHashPage=()=>{const h=window.location.hash.replace("#","");return h||"ingredients";};
  const [page,setPageState]=useState(getHashPage);
  const setPage=(p)=>{window.location.hash=p;setPageState(p);};
  const [lang,setLang]=useState("en");
  const [modal,setModal]=useState(null);
  useEffect(()=>{
    const onHash=()=>setPageState(window.location.hash.replace("#","")||"ingredients");
    window.addEventListener("hashchange",onHash);
    return()=>window.removeEventListener("hashchange",onHash);
  },[]);
  const {loaded,saveStatus,forceSave,
    ingredients,setIngredients,recipes,setRecipes,
    orders,setOrders,inventory,setInventory,locations,setLocations,recipeTypes,setRecipeTypes,
    poojaItems,setPoojaItems,poojaTemples,setPoojaTemples,poojaDels,setPoojaDels,
    occTemplates,setOccTemplates,occOrders,setOccOrders} = useKitchenData();

  const [quickDate,setQuickDate]=useState(TODAY);
  const ctx={lang,ingredients,setIngredients,recipes,setRecipes,locations,setLocations,orders,setOrders,inventory,setInventory,recipeTypes,setRecipeTypes,setModal,poojaItems,setPoojaItems,poojaTemples,setPoojaTemples,poojaDels,setPoojaDels,occTemplates,setOccTemplates,occOrders,setOccOrders,setPage,quickDate,setQuickDate};
  const t=(en,ta)=>lang==="en"?en:ta;

  const NAV=[
    {id:"ingredients",icon:"🧂",en:"Ingredients",ta:"பொருட்கள்"},
    {id:"recipes",icon:"📖",en:"Recipes",ta:"சமையல் குறிப்புகள்"},
    {id:"orders",icon:"📋",en:"Orders",ta:"ஆர்டர்கள்"},
    {id:"reports",icon:"📊",en:"Reports",ta:"அறிக்கைகள்",children:[
      {id:"rep_dish",en:"Dish-wise Ingredients",ta:"உணவு வாரியான பொருட்கள்"},
      {id:"rep_ing",en:"Ingredient-wise Dishes",ta:"பொருள் வாரியான உணவு"},
      {id:"rep_shop",en:"Shopping List",ta:"கொள்முதல் பட்டியல்"},
      {id:"rep_del",en:"Delivery Sheet",ta:"விநியோக பட்டியல்"},
      {id:"rep_menu",en:"Weekly Menu",ta:"வார உணவு பட்டியல்"},
      {id:"rep_col",en:"Location Columnar",ta:"இட நெடுவரிசை"},
      {id:"rep_cost",en:"Cost Analysis",ta:"செலவு பகுப்பாய்வு"},
      {id:"rep_compare",en:"Compare Recipes",ta:"சமையல் ஒப்பீடு"},
    ]},
    {id:"inventory",icon:"📦",en:"Inventory",ta:"சரக்கு மேலாண்மை"},
    {id:"pooja",icon:"🪔",en:"Pooja Material",ta:"பூஜை பொருள்",children:[
      {id:"pooja_items",en:"Items Master",ta:"பொருட்கள்"},
      {id:"pooja_temples",en:"Temples & Lists",ta:"கோவில்கள்"},
      {id:"pooja_dispatch",en:"Dispatch",ta:"அனுப்புதல்"},
      {id:"pooja_send",en:"Items to Send",ta:"அனுப்ப வேண்டிய பொருட்கள்"},
      {id:"pooja_purchase",en:"Purchase Summary",ta:"கொள்முதல்"},
      {id:"pooja_weekly",en:"Weekly Issue List",ta:"வார அனுப்புதல் பட்டியல்"},
      {id:"pooja_weekshop",en:"Shopping List (Range)",ta:"கொள்முதல் பட்டியல் (வரம்பு)"},
    ]},
    {id:"occasions",icon:"🕉️",en:"Temple Occasions",ta:"கோவில் சிறப்பு நாட்கள்",children:[
      {id:"occ_templates",en:"Templates",ta:"மாதிரிகள்"},
      {id:"occ_orders",en:"Orders",ta:"ஆர்டர்கள்"},
      {id:"occ_purchase",en:"Purchase Planning",ta:"கொள்முதல் திட்டம்"},
    ]},
  ];
  const flat=NAV.flatMap(n=>n.children?[n,...n.children]:[n]);
  const cur=flat.find(p=>p.id===page)||NAV[0];

  if(!loaded) return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#FEF6E8",flexDirection:"column",gap:12}}><div style={{fontSize:32}}>🍛</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#5C2A0A"}}>Koviloor Kitchen</div><div style={{fontSize:13,color:"#9B7355"}}>Loading from cloud...</div></div>);
  return (
    <div style={css.app}>
      <nav style={css.nav}>
        <div style={css.navTop} data-tour="tour-logo">
          <div style={{fontSize:26,marginBottom:4}}>🍛</div>
          <div style={css.navTitle}>Koviloor Kitchen</div>
          <div style={css.navSub}>கோவிலூர் அன்னதானம்</div>
        </div>
        <div style={{padding:"10px 0"}}>
          {NAV.map(n=>(
            <div key={n.id}>
              <div style={css.navItem(!n.children&&page===n.id)} data-tour={"nav-"+n.id} href={"#"+n.id} onClick={e=>{if(n.children)e.preventDefault();else{e.preventDefault();setPage(n.id);}}}>
                <span>{n.icon}</span><span>{t(n.en,n.ta)}</span>
              </div>
              {n.children?.map(c=>(
                <div key={c.id} style={css.navItem(page===c.id,true)} data-tour={"nav-"+c.id} href={"#"+c.id} onClick={e=>{e.preventDefault();setPage(c.id);}}>
                  <span style={{opacity:0.4}}>└</span><span>{t(c.en,c.ta)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </nav>

      <main style={css.main}>
        <div style={css.topbar}>
          <div style={css.pageTitle}>{t(cur.en,cur.ta)}</div>
          <div style={{display:"flex",gap:6,alignItems:"center"}} data-tour="lang-select">
            <span style={{fontSize:11,color:P.muted}}>🌐</span>
            <select style={{...css.sel,fontSize:11,padding:"4px 8px"}} value={lang} onChange={e=>setLang(e.target.value)}>
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>
          <button data-tour="save-btn" disabled={saveStatus==="saving"||saveStatus==="idle"||saveStatus==="saved"} onClick={forceSave} style={{marginLeft:12,padding:"6px 18px",borderRadius:7,border:"none",cursor:saveStatus==="pending"?"pointer":"default",fontWeight:700,fontSize:12,background:saveStatus==="error"?"#C0392B":saveStatus==="saved"?"#1A7A40":saveStatus==="pending"?"#E8821A":"#DCC88A",color:"white",opacity:saveStatus==="idle"||saveStatus==="saved"?0.6:1,transition:"all 0.2s"}}>{saveStatus==="saving"?"⏳ Saving...":saveStatus==="saved"?"✓ Saved":saveStatus==="error"?"⚠ Retry Save":"💾 Save"}</button>
          <button onClick={()=>{sessionStorage.removeItem("kk_auth");window.location.reload();}} style={{marginLeft:8,padding:"6px 12px",borderRadius:7,border:"1px solid #DCC88A",background:"transparent",color:"#9B7355",fontSize:12,cursor:"pointer",fontWeight:600}}>🔒 Lock</button>
        </div>
        <div style={css.content}>
          {page==="ingredients"&&<IngsPage ctx={ctx}/>}
          {page==="recipes"&&<RecsPage ctx={ctx}/>}
          {page==="orders"&&<OrdersPage ctx={ctx}/>}
          {page==="rep_dish"&&<RepDish ctx={ctx}/>}
          {page==="rep_ing"&&<RepIng ctx={ctx}/>}
          {page==="rep_shop"&&<RepShop ctx={ctx}/>}
          {page==="rep_del"&&<RepDel ctx={ctx}/>}
          {page==="rep_menu"&&<RepMenu ctx={ctx}/>}
          {page==="rep_col"&&<RepCol ctx={ctx}/>}
          {page==="rep_cost"&&<RepCost ctx={ctx}/>}
          {page==="rep_compare"&&<RepCompare ctx={ctx}/>}
          {page==="inventory"&&<InvPage ctx={ctx}/>}
          {page==="pooja_items"&&<PoojaItemsPage ctx={ctx}/>}
          {page==="pooja_temples"&&<PoojaTemplesPage ctx={ctx}/>}
          {page==="pooja_dispatch"&&<PoojaDispatchPage ctx={ctx}/>}
          {page==="pooja_send"&&<PoojaSendPage ctx={ctx}/>}
          {page==="pooja_purchase"&&<PoojaPurchasePage ctx={ctx}/>}
          {page==="pooja_weekly"&&<PoojaWeeklyIssuePage ctx={ctx}/>}
          {page==="pooja_weekshop"&&<PoojaWeeklyShopPage ctx={ctx}/>}
          {page==="occ_templates"&&<OccTemplatesPage ctx={ctx}/>}
          {page==="occ_orders"&&<OccOrdersPage ctx={ctx}/>}
          {page==="occ_purchase"&&<OccPurchasePage ctx={ctx}/>}
        </div>
      </main>

      {modal&&(
        <div style={css.modal} onClick={()=>setModal(null)}>
          <div style={css.mbox(modal.w||700)} onClick={e=>e.stopPropagation()}>
            {modal.type==="recipe"&&<RecForm ctx={ctx} rec={modal.rec} onClose={()=>setModal(null)}/>}
            {modal.type==="recDetail"&&<RecDetail ctx={ctx} rec={modal.rec} onClose={()=>setModal(null)}/>}
            {modal.type==="order"&&<OrderForm ctx={ctx} ord={modal.ord} onClose={()=>setModal(null)}/>}
            {modal.type==="purchase"&&<PurchForm ctx={ctx} onClose={()=>setModal(null)}/>}
            {modal.type==="postIssues"&&<PostIssues ctx={ctx} date={modal.date} onClose={()=>setModal(null)}/>}
            {modal.type==="addLoc"&&<LocForm ctx={ctx} onClose={()=>setModal(null)}/>}
            {modal.type==="recipeTypes"&&<RecipeTypesManager ctx={ctx} onClose={()=>setModal(null)}/>}
            {modal.type==="ingUsage"&&<IngUsageModal ctx={ctx} ing={modal.ing} onClose={()=>setModal(null)}/>}
            {modal.type==="ingSubstitute"&&<IngSubstituteModal ctx={ctx} onClose={()=>setModal(null)}/>}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// INGREDIENTS
// ════════════════════════════════════════════════════════════════════
function IngsPage({ctx}){
  const {ingredients,setIngredients,recipes,setRecipes,lang,setModal}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [cat,setCat]=useState("all");
  const [editId,setEditId]=useState(null);
  const [delErr,setDelErr]=useState(null);
  const [ef,setEf]=useState({});
  const [nr,setNr]=useState({name:"",nameTamil:"",category:"grocery",unit:"kg",normCost:"",scalingFactor:"",scalingBenchmark:""});
  const fRef=useRef();
  const [translating,setTranslating]=useState(false);
  const [transProgress,setTransProgress]=useState("");
  const recFileRef=useRef();
  const [showDupes,setShowDupes]=useState(false);

  // ── Duplicate-name detection ────────────────────────────────────────────
  const normalizeName=s=>(s||"").toLowerCase().trim().replace(/[^a-z0-9]/g,"");
  const dupGroups=useMemo(()=>{
    const groups=[]; const used=new Set();
    for(let i=0;i<ingredients.length;i++){
      if(used.has(ingredients[i].id))continue;
      const group=[ingredients[i]];
      const a=normalizeName(ingredients[i].name);
      for(let j=i+1;j<ingredients.length;j++){
        if(used.has(ingredients[j].id))continue;
        const b=normalizeName(ingredients[j].name);
        const dist=levenshtein(a,b);
        const closeEnough=(a===b&&a.length>0)||(Math.min(a.length,b.length)>=4&&dist<=2);
        if(closeEnough){group.push(ingredients[j]);used.add(ingredients[j].id);}
      }
      if(group.length>1){groups.push(group);used.add(ingredients[i].id);}
    }
    return groups;
  },[ingredients]);

  const mergeGroup=(keepId,group)=>{
    const removeIds=group.filter(g=>g.id!==keepId).map(g=>g.id);
    if(!removeIds.length)return;
    if(!confirm(t("Merge duplicate(s) into the selected ingredient? This updates every recipe that uses them.","நகல்களை ஒன்றிணைக்கவா? இது அனைத்து சமையல்களையும் புதுப்பிக்கும்.")))return;
    setRecipes(prev=>prev.map(rec=>{
      let ings=[...(rec.ingredients||[])];
      let changed=false;
      removeIds.forEach(rid=>{
        const idx=ings.findIndex(x=>x.iid===rid);
        if(idx<0)return;
        changed=true;
        const moved=ings[idx];
        ings=ings.filter(x=>x.iid!==rid);
        const keepIdx=ings.findIndex(x=>x.iid===keepId);
        if(keepIdx>=0)ings[keepIdx]={...ings[keepIdx],qty:+(ings[keepIdx].qty+moved.qty).toFixed(4)};
        else ings.push({...moved,iid:keepId});
      });
      return changed?{...rec,ingredients:ings}:rec;
    }));
    setIngredients(prev=>prev.filter(x=>!removeIds.includes(x.id)));
  };

  const translateToTamil=async()=>{
    const needTranslation=ingredients.filter(x=>!x.nameTamil||!x.nameTamil.trim());
    if(!needTranslation.length){alert("All ingredients already have Tamil names.");return;}
    if(!confirm("Translate "+needTranslation.length+" ingredient names to Tamil using AI?"))return;
    setTranslating(true); const BATCH=40; const results={};
    for(let bi=0;bi<needTranslation.length;bi+=BATCH){
      const batch=needTranslation.slice(bi,bi+BATCH);
      setTransProgress("Translating "+(bi+1)+" of "+needTranslation.length+"...");
      try{
        const res=await fetch("/api/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({names:batch.map(x=>x.name)})});
        const data=await res.json(); if(data.translations)Object.assign(results,data.translations);
      }catch(err){console.error(err);}
    }
    setIngredients(prev=>prev.map(ing=>{if(ing.nameTamil&&ing.nameTamil.trim())return ing;const tamil=results[ing.name];return tamil?{...ing,nameTamil:tamil}:ing;}));
    setTranslating(false); setTransProgress(""); alert("Done! Translated "+Object.keys(results).length+" ingredients.");
  };

  const importXlsx=e=>{
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      // Row 1 must be headers (simple keys: name,nameTamil,category,unit,normCost,...)
      const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
      const valid=rows.filter(r=>(r.name+"").trim());
      if(!valid.length){alert("No valid rows found. Make sure row 1 contains column headers (name, category, unit, normCost...)");return;}
      let nextId=Date.now();
      const imported=valid.map(r=>({
        id:nextId++,
        name:(r.name+"").trim(),
        nameTamil:(r.nameTamil+"").trim(),
        category:((r.category||"grocery")+"").toLowerCase().trim()||"grocery",
        unit:((r.unit||"kg")+"").trim()||"kg",
        normCost:r.normCost?+r.normCost:0,
        ...(r.scalingFactor?{scalingFactor:+r.scalingFactor}:{}),
        ...(r.scalingBenchmark?{scalingBenchmark:+r.scalingBenchmark}:{}),
        ...(r.cutYield?{cutYield:+r.cutYield}:{}),
        ...(r.cutUnit?{cutUnit:(r.cutUnit+"").trim()}:{}),
      }));
      // Merge: update by name, add new
      setIngredients(prev=>{
        const map=new Map(prev.map(x=>[x.name.toLowerCase(),x]));
        imported.forEach(r=>{
          const key=r.name.toLowerCase();
          if(map.has(key)){const ex=map.get(key);map.set(key,{...ex,...r,id:ex.id});}
          else{map.set(key,r);}
        });
        return Array.from(map.values());
      });
      alert(imported.length+" ingredients imported.");
    };
    reader.readAsBinaryString(file);
    e.target.value="";
  };

  const dlTemplate=()=>{
    const ws=XLSX.utils.json_to_sheet([
      {name:"Rice",nameTamil:"அரிசி",category:"grocery",unit:"kg",normCost:45},
      {name:"Salt",nameTamil:"உப்பு",category:"spice",unit:"g",normCost:0.018},
      {name:"Onion",nameTamil:"வெங்காயம்",category:"vegetable",unit:"kg",normCost:40},
    ]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Ingredients");
    XLSX.writeFile(wb,"ingredients_template.xlsx");
  };

  const exportIngredients=()=>{
    const data=ingredients.map(ing=>({
      name:ing.name,
      nameTamil:ing.nameTamil||"",
      category:ing.category||"grocery",
      unit:ing.unit||"kg",
      normCost:ing.normCost||0,
      scalingFactor:ing.scalingFactor||"",
      scalingBenchmark:ing.scalingBenchmark||"",
      cutYield:ing.cutYield||"",
      cutUnit:ing.cutUnit||"",
    }));
    const ws=XLSX.utils.json_to_sheet(data);
    ws["!cols"]=[{wch:30},{wch:28},{wch:12},{wch:8},{wch:12},{wch:14},{wch:16},{wch:10},{wch:10}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Ingredients");
    XLSX.writeFile(wb,"ingredients_export.xlsx");
  };

  const visible=cat==="all"?ingredients:ingredients.filter(i=>i.category===cat);

  const saveEdit=()=>{
    setIngredients(p=>p.map(i=>i.id===editId?{...ef,normCost:ef.normCost?+ef.normCost:0}:i));
    setEditId(null);
  };
  const addNew=()=>{
    if(!nr.name)return;
    setIngredients(p=>[...p,{...nr,id:Date.now(),normCost:nr.normCost?+nr.normCost:undefined,cutYield:nr.cutYield?+nr.cutYield:undefined,scalingFactor:nr.scalingFactor?+nr.scalingFactor:undefined,scalingBenchmark:nr.scalingBenchmark?+nr.scalingBenchmark:undefined}]);
    setNr({name:"",nameTamil:"",category:"grocery",unit:"kg",normCost:"",scalingFactor:"",scalingBenchmark:""});
  };

  const Inp=({val,onChange,w,tamil})=><input style={{...css.inp,width:w||"100%",fontFamily:tamil?"'Noto Sans Tamil',sans-serif":undefined}} value={val} onChange={e=>onChange(e.target.value)}/>;
  const Sel=({val,onChange,opts})=><select style={css.sel} value={val} onChange={e=>onChange(e.target.value)}>{opts.map(o=><option key={o}>{o}</option>)}</select>;

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {["all","grocery","vegetable","spice","cut","other"].map(f=>(
          <button key={f} style={css.btn(cat===f?"primary":"ghost",true)} onClick={()=>setCat(f)}>
            {f==="all"?t("All","அனைத்தும்"):f==="cut"?"✂️ "+t("Cut Veg","நறுக்கிய காய்"):f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
          <button style={{...css.btn(showDupes?"primary":"ghost",true),
            borderColor:dupGroups.length?P.danger:"#DCC88A",color:showDupes?undefined:(dupGroups.length?P.danger:P.deepBrown)}}
            onClick={()=>setShowDupes(!showDupes)}>
            ⚠️ {t("Check Duplicates","நகல் சரிபார்")}{dupGroups.length>0?" ("+dupGroups.length+")":""}
          </button>
          <button data-tour="ing-substitute" style={{...css.btn("ghost",true),borderColor:P.info,color:P.info}} onClick={()=>setModal({type:"ingSubstitute"})}>
            🔄 {t("Substitute Ingredient","பொருள் மாற்று")}
          </button>
          <button style={css.btn("ghost",true)} onClick={exportIngredients}>⬇️ {t("Export Excel","Excel ஏற்று")}</button>
          <button style={css.btn("ghost",true)} onClick={dlTemplate}>📋 {t("Template","டெம்ப்ளேட்")}</button>
          <button style={css.btn("success",true)} onClick={()=>fRef.current.click()}>📤 {t("Import Excel","Excel இறக்கு")}</button>
          <input ref={fRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={importXlsx}/>
          <button style={{...css.btn("ghost",true),borderColor:P.purple,color:translating?P.muted:P.purple}}
            onClick={translateToTamil} disabled={translating}>
            {translating?"⏳ "+transProgress:"🔤 "+t("Translate Tamil","தமிழில் மொழிபெயர்")}
          </button>
        </div>
      </div>

      {showDupes&&(
        <div style={{...css.card,background:"#FFF3CD",border:"1px solid #F59E0B"}}>
          <div style={{fontWeight:700,color:"#92400E",marginBottom:8}}>
            ⚠️ {t("Possible Duplicate Names","சாத்தியமான நகல் பெயர்கள்")} ({dupGroups.length})
          </div>
          <div style={{fontSize:11,color:"#7C4A00",marginBottom:10}}>
            {t("Grouped by near-identical names (spacing, case, small typos). Pick which one to keep — the others get merged into it across every recipe, then removed.","ஒத்த பெயர்கள் தொகுக்கப்பட்டுள்ளன. வைத்திருக்க வேண்டியதைத் தேர்ந்தெடுக்கவும்.")}
          </div>
          {!dupGroups.length?(
            <div style={{color:P.success,fontSize:12}}>✅ {t("No likely duplicates found.","நகல்கள் இல்லை.")}</div>
          ):dupGroups.map((group,gi)=><DupGroupRow key={gi} group={group} lang={lang} mergeGroup={mergeGroup}/>)}
        </div>
      )}

      <div style={{...css.card,padding:0,overflow:"auto"}}>
        <table style={css.table}>
          <thead><tr>
            {["#",t("Name","பெயர்"),t("Tamil","தமிழ்"),t("Category","வகை"),t("Unit","அலகு"),t("Norm Cost ₹","நிலையான விலை"),t("Cut Yield","நறுக்கல் விகிதம்"),t("Scaling Factor","காரணி"),t("Benchmark","வரம்பு"),""].map((h,i)=><th key={i} style={css.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {visible.map((ing,i)=>{
              const ed=editId===ing.id;
              return(
                <tr key={ing.id} style={{background:i%2===0?P.white:P.highlight}}>
                  <td style={{...css.td,width:28,color:P.muted}}>{i+1}</td>
                  <td style={css.td}>{ed?<Inp val={ef.name} onChange={v=>setEf({...ef,name:v})} w={130}/>:<strong>{ing.name}</strong>}</td>
                  <td style={{...css.td,fontFamily:"'Noto Sans Tamil',sans-serif"}}>{ed?<Inp val={ef.nameTamil} onChange={v=>setEf({...ef,nameTamil:v})} w={120} tamil/>:ing.nameTamil}</td>
                  <td style={css.td}>{ed?<Sel val={ef.category} onChange={v=>setEf({...ef,category:v})} opts={["grocery","vegetable","spice","cut","other"]}/>:<span style={css.badge(CATCOLOR[ing.category]||P.muted)}>{ing.category}</span>}</td>
                  <td style={css.td}>{ed?<Sel val={ef.unit} onChange={v=>setEf({...ef,unit:v})} opts={["kg","g","L","ml","nos"]}/>:ing.unit}</td>
                  <td style={css.td}>{ed?<input type="number" step="0.01" min="0" style={{...css.inp,width:80}} value={ef.normCost||""} placeholder="0.00" onChange={e=>setEf({...ef,normCost:e.target.value})}/>:ing.normCost?<span style={{fontWeight:600,color:P.success}}>₹{ing.normCost}/{ing.unit}</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                  <td style={css.td}>{ing.category==="vegetable"||ing.category==="cut"?(ed?<div style={{display:"flex",gap:3,alignItems:"center"}}><input type="number" step="0.01" min="0.1" max="1" style={{...css.inp,width:65}} value={ef.cutYield||""} placeholder="0.85" onChange={e=>setEf({...ef,cutYield:e.target.value})}/><span style={{fontSize:10,color:P.muted}}>kg/kg</span></div>:(ing.cutYield?<span style={{...css.badge(CATCOLOR.cut),fontSize:11}}>{(+ing.cutYield*100).toFixed(0)}%</span>:<span style={{color:"#CCC"}}>—</span>)):<span style={{color:"#EEE",fontSize:10}}>n/a</span>}</td>
                  <td style={css.td}>{ed?<input type="number" step="0.05" style={{...css.inp,width:70}} value={ef.scalingFactor||""} placeholder="1.0" onChange={e=>setEf({...ef,scalingFactor:e.target.value})}/>:(ing.scalingFactor?<span style={css.badge(P.saffron)}>{ing.scalingFactor}</span>:<span style={{color:"#CCC"}}>—</span>)}</td>
                  <td style={css.td}>{ed?<input type="number" style={{...css.inp,width:80}} value={ef.scalingBenchmark||""} onChange={e=>setEf({...ef,scalingBenchmark:e.target.value})}/>:(ing.scalingBenchmark?`${ing.scalingBenchmark}${ing.unit}`:<span style={{color:"#CCC"}}>—</span>)}</td>
                  <td style={css.td}><div style={{display:"flex",gap:4}}>
                    {ed?<><button style={css.btn("success",true)} onClick={saveEdit}>✓</button><button style={css.btn("ghost",true)} onClick={()=>setEditId(null)}>✕</button></>
                    :<><button style={css.btn("info",true)} title={t("Where is this used?","எங்கு பயன்படுத்தப்படுகிறது?")} onClick={()=>setModal({type:"ingUsage",ing})}>👁</button><button style={css.btn("ghost",true)} onClick={()=>{setEditId(ing.id);setEf({...ing});}}>✏️</button><button style={css.btn("danger",true)} onClick={()=>setIngredients(p=>p.filter(x=>x.id!==ing.id))}>🗑</button></>}
                  </div></td>
                </tr>
              );
            })}
            <tr style={{background:"#FFF8E6"}}>
              <td style={{...css.td,color:P.muted,fontSize:10,fontStyle:"italic"}}>New</td>
              <td style={css.td}><Inp val={nr.name} onChange={v=>setNr({...nr,name:v})} w={130}/></td>
              <td style={css.td}><Inp val={nr.nameTamil} onChange={v=>setNr({...nr,nameTamil:v})} w={120} tamil/></td>
              <td style={css.td}><Sel val={nr.category} onChange={v=>setNr({...nr,category:v})} opts={["grocery","vegetable","spice","cut","other"]}/></td>
              <td style={css.td}><Sel val={nr.unit} onChange={v=>setNr({...nr,unit:v})} opts={["kg","g","L","ml","nos"]}/></td>
              <td style={css.td}><input type="number" step="0.01" min="0" style={{...css.inp,width:80}} placeholder="₹ / unit" value={nr.normCost} onChange={e=>setNr({...nr,normCost:e.target.value})}/></td>
              <td style={css.td}>{(nr.category==="vegetable"||nr.category==="cut")&&<input type="number" step="0.01" min="0.1" max="1" style={{...css.inp,width:65}} placeholder="0.85" value={nr.cutYield||""} onChange={e=>setNr({...nr,cutYield:e.target.value})}/>}</td>
              <td style={css.td}><input type="number" step="0.05" style={{...css.inp,width:70}} placeholder="0.75" value={nr.scalingFactor} onChange={e=>setNr({...nr,scalingFactor:e.target.value})}/></td>
              <td style={css.td}><input type="number" style={{...css.inp,width:80}} placeholder="200" value={nr.scalingBenchmark} onChange={e=>setNr({...nr,scalingBenchmark:e.target.value})}/></td>
              <td style={css.td}><button data-tour="add-ingredient" style={css.btn("primary",true)} onClick={addNew}>+ {t("Add","சேர்")}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{fontSize:11,color:P.muted,marginTop:6}}>
        💡 {t("Scaling Factor < 1 = sub-linear. Benchmark = qty above which sub-linear kicks in. E.g. Salt factor 0.75, benchmark 200g: first 200g scales linearly, excess × 0.75.","காரணி < 1 = குறைந்த விகிதம். வரம்பு அளவுக்கு மேல் காரணி பயன்படும்.")}
      </div>
    </div>
  );
}

// ── Duplicate-name group row (radio-select which to keep, then merge) ──────
function DupGroupRow({group,lang,mergeGroup}){
  const t=(en,ta)=>lang==="en"?en:ta;
  const [keepId,setKeepId]=useState(group[0].id);
  const groupKey=group.map(x=>x.id).join("_");
  return(
    <div style={{background:"white",borderRadius:7,padding:10,marginBottom:8,border:"1px solid #F5D76E"}}>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
        {group.map(g=>(
          <label key={g.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,cursor:"pointer"}}>
            <input type="radio" name={"grp"+groupKey} checked={keepId===g.id} onChange={()=>setKeepId(g.id)}/>
            <strong>{g.name}</strong>
            <span style={{color:P.muted}}>({g.unit}{g.nameTamil?", "+g.nameTamil:""})</span>
          </label>
        ))}
        <button style={{...css.btn("success",true),marginLeft:"auto"}} onClick={()=>mergeGroup(keepId,group)}>
          ✓ {t("Merge → keep selected","இணை")}
        </button>
      </div>
    </div>
  );
}

// ── Ingredient usage viewer: "which recipes use this ingredient?" ──────────
function IngUsageModal({ctx,ing,onClose}){
  const {recipes,ingredients,lang,setModal}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:(x.nameTamil||x.name);

  const rows=recipes.map(rec=>{
    const entries=(rec.ingredients||[]).filter(x=>x.iid===ing.id);
    if(!entries.length)return null;
    const qty=entries.reduce((s,e)=>s+e.qty,0);
    const unit=entries[0].unit;
    const lineCost=(ing.normCost||0)*qty;
    const totalCost=computeRecipeCost(rec,1,recipes,ingredients);
    const pct=totalCost>0?(lineCost/totalCost*100):0;
    return{rec,qty,unit,lineCost,pct};
  }).filter(Boolean).sort((a,b)=>b.lineCost-a.lineCost);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown}}>
          👁 {n(ing)} — {t("Used In","பயன்படுத்தப்படும் சமையல்கள்")}
        </div>
        <button style={css.btn("ghost",true)} onClick={onClose}>✕</button>
      </div>
      {ing.normCost?(
        <div style={{fontSize:12,color:P.muted,marginBottom:12}}>
          {t("Norm cost","நிலையான விலை")}: <strong style={{color:P.success}}>₹{ing.normCost}/{ing.unit}</strong>
          <span style={{marginLeft:10}}>{t("If this ingredient's price changes, the affected cost is the Line Cost column below, per recipe batch.","இந்த பொருளின் விலை மாறினால், கீழே உள்ள செலவு பாதிக்கப்படும்.")}</span>
        </div>
      ):null}
      {!rows.length?(
        <div style={{color:P.muted,textAlign:"center",padding:24}}>{t("Not used in any recipe yet.","எந்த சமையலிலும் பயன்படவில்லை.")}</div>
      ):(
        <table style={css.table}>
          <thead><tr>
            <th style={css.th}>{t("Recipe","சமையல்")}</th>
            <th style={{...css.th,textAlign:"right"}}>{t("Qty (per batch)","அளவு")}</th>
            <th style={{...css.th,textAlign:"right"}}>{t("Line Cost","செலவு")}</th>
            <th style={{...css.th,textAlign:"right"}}>% {t("of recipe cost","சமையல் செலவில்")}</th>
            <th style={css.th}></th>
          </tr></thead>
          <tbody>{rows.map((row,i)=>(
            <tr key={row.rec.id} style={{background:i%2===0?P.white:P.highlight}}>
              <td style={css.td}><strong>{n(row.rec)}</strong></td>
              <td style={{...css.td,textAlign:"right"}}>{row.qty} {row.unit}</td>
              <td style={{...css.td,textAlign:"right"}}>{row.lineCost>0?<strong style={{color:P.success}}>₹{row.lineCost.toFixed(2)}</strong>:<span style={{color:"#CCC"}}>—</span>}</td>
              <td style={{...css.td,textAlign:"right",fontSize:11,color:P.muted}}>{row.pct>0?row.pct.toFixed(1)+"%":"—"}</td>
              <td style={css.td}><button style={css.btn("ghost",true)} onClick={()=>{onClose();setTimeout(()=>setModal({type:"recDetail",rec:row.rec}),50);}}>{t("Open","திற")}</button></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      <div style={{fontSize:11,color:P.muted,marginTop:10}}>
        {rows.length} {t("recipe(s) use this ingredient.","சமையல்கள் இந்த பொருளை பயன்படுத்துகின்றன.")}
      </div>
    </div>
  );
}

// ── Substitute one ingredient for another across every recipe ──────────────
function IngSubstituteModal({ctx,onClose}){
  const {ingredients,recipes,setRecipes,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:(x.nameTamil||x.name);
  const [srcId,setSrcId]=useState("");
  const [tgtId,setTgtId]=useState("");
  const [rate,setRate]=useState("1");
  const [preview,setPreview]=useState(null);

  const src=srcId?ingredients.find(x=>x.id===+srcId):null;
  const tgt=tgtId?ingredients.find(x=>x.id===+tgtId):null;

  const doPreview=()=>{
    if(!src||!tgt||!rate)return;
    const r=+rate;
    const affected=recipes.filter(rec=>(rec.ingredients||[]).some(x=>x.iid===src.id));
    const rows=affected.map(rec=>{
      const entry=rec.ingredients.find(x=>x.iid===src.id);
      const existingTgt=rec.ingredients.find(x=>x.iid===tgt.id);
      const newQty=+(entry.qty*r).toFixed(4);
      return{rec,oldQty:entry.qty,oldUnit:entry.unit,newQty,
        willMerge:!!existingTgt,mergedQty:existingTgt?+(existingTgt.qty+newQty).toFixed(4):newQty};
    });
    setPreview(rows);
  };

  const apply=()=>{
    if(!preview||!preview.length)return;
    setRecipes(prev=>prev.map(rec=>{
      const row=preview.find(x=>x.rec.id===rec.id);
      if(!row)return rec;
      let ings=(rec.ingredients||[]).filter(x=>x.iid!==src.id);
      const existingIdx=ings.findIndex(x=>x.iid===tgt.id);
      if(existingIdx>=0)ings[existingIdx]={...ings[existingIdx],qty:row.mergedQty};
      else ings.push({iid:tgt.id,qty:row.newQty,unit:tgt.unit});
      return{...rec,ingredients:ings};
    }));
    alert(preview.length+" "+t("recipe(s) updated.","சமையல்கள் புதுப்பிக்கப்பட்டன."));
    onClose();
  };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown}}>
          🔄 {t("Substitute Ingredient","பொருள் மாற்று")}
        </div>
        <button style={css.btn("ghost",true)} onClick={onClose}>✕</button>
      </div>
      <div style={{fontSize:11,color:P.muted,marginBottom:12}}>
        {t("Replace one ingredient with another across every recipe that uses it, scaling quantity by a conversion rate. E.g. 1 kg Tomato → 0.2 kg Tomato Paste means rate = 0.2.","ஒரு பொருளை மற்றொன்றால் மாற்றவும், மாற்று விகிதப்படி அளவு மாற்றப்படும்.")}
      </div>
      <div style={css.g2}>
        <div>
          <label style={css.lbl}>{t("Replace this ingredient","இந்த பொருளை மாற்று")}</label>
          <select style={{...css.sel,width:"100%"}} value={srcId} onChange={e=>{setSrcId(e.target.value);setPreview(null);}}>
            <option value="">{t("Select...","தேர்வு...")}</option>
            {ingredients.map(i=><option key={i.id} value={i.id}>{n(i)} ({i.unit})</option>)}
          </select>
        </div>
        <div>
          <label style={css.lbl}>{t("With this ingredient","இதனுடன்")}</label>
          <select style={{...css.sel,width:"100%"}} value={tgtId} onChange={e=>{setTgtId(e.target.value);setPreview(null);}}>
            <option value="">{t("Select...","தேர்வு...")}</option>
            {ingredients.filter(i=>i.id!==+srcId).map(i=><option key={i.id} value={i.id}>{n(i)} ({i.unit})</option>)}
          </select>
        </div>
      </div>
      <div style={{marginTop:10}}>
        <label style={css.lbl}>{t("Conversion Rate","மாற்று விகிதம்")}</label>
        <input type="number" step="0.01" min="0" style={{...css.inp,width:120}} value={rate}
          onChange={e=>{setRate(e.target.value);setPreview(null);}} placeholder="e.g. 0.2"/>
        {src&&tgt&&<div style={{fontSize:11,color:P.muted,marginTop:4}}>
          1 {src.unit} {n(src)} = {rate||"?"} {tgt.unit} {n(tgt)}
        </div>}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
        <button style={css.btn("info")} onClick={doPreview} disabled={!src||!tgt||!rate}>{t("Preview","முன்னோட்டம்")}</button>
      </div>

      {preview&&(
        <div style={{marginTop:16}}>
          <div style={css.sHead}>{t("Affected Recipes","பாதிக்கப்பட்ட சமையல்கள்")} ({preview.length})</div>
          {!preview.length?(
            <div style={{color:P.muted,textAlign:"center",padding:16}}>{t("No recipes use this ingredient.","இந்த பொருள் எந்த சமையலிலும் இல்லை.")}</div>
          ):(
            <table style={css.table}>
              <thead><tr>
                <th style={css.th}>{t("Recipe","சமையல்")}</th>
                <th style={css.th}>{t("Old","பழையது")}</th>
                <th style={css.th}>{t("New","புதியது")}</th>
                <th style={css.th}></th>
              </tr></thead>
              <tbody>{preview.map((row,i)=>(
                <tr key={row.rec.id} style={{background:i%2===0?P.white:P.highlight}}>
                  <td style={css.td}><strong>{n(row.rec)}</strong></td>
                  <td style={css.td}>{row.oldQty} {row.oldUnit} {n(src)}</td>
                  <td style={css.td}><strong style={{color:P.success}}>{row.willMerge?row.mergedQty:row.newQty} {tgt.unit} {n(tgt)}</strong></td>
                  <td style={css.td}>{row.willMerge&&<span style={{...css.badge(P.info),fontSize:10}}>{t("merges with existing","ஏற்கனவே உள்ளதுடன் இணையும்")}</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {preview.length>0&&(
            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
              <button style={css.btn("ghost")} onClick={onClose}>{t("Cancel","ரத்து")}</button>
              <button style={css.btn("danger")} onClick={()=>{if(confirm(t("This will update all listed recipes. Continue?","இதை உறுதிப்படுத்தவா?")))apply();}}>
                ✓ {t("Apply Substitution","மாற்றை செயல்படுத்து")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// RECIPES
// ════════════════════════════════════════════════════════════════════
function RecsPage({ctx}){
  const {recipes,setRecipes,ingredients,recipeTypes,lang,setModal}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [q,setQ]=useState("");
  const [typeF,setTypeF]=useState("all");
  const [translating,setTranslating]=useState(false);
  const [transProgress,setTransProgress]=useState("");
  const recFileRef=useRef();

  const exportRecipes=()=>{
    const data=recipes.map(r=>({
      name:r.name,
      nameTamil:r.nameTamil||"",
    }));
    const ws=XLSX.utils.json_to_sheet(data);
    ws["!cols"]=[{wch:40},{wch:40}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Recipes");
    XLSX.writeFile(wb,"recipes_export.xlsx");
  };

  const importRecipesTamil=(e)=>{
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
      const valid=rows.filter(r=>(r.name||"").trim());
      if(!valid.length){alert("No valid rows found.");return;}
      setRecipes(prev=>{
        const map=new Map(prev.map(r=>[r.name.toLowerCase().trim(),r]));
        valid.forEach(row=>{
          const key=(row.name||"").toLowerCase().trim();
          const tamil=(row.nameTamil||"").trim();
          if(map.has(key)&&tamil){
            const ex=map.get(key);
            map.set(key,{...ex,nameTamil:tamil});
          }
        });
        return Array.from(map.values());
      });
      alert(valid.length+" recipes processed.");
    };
    reader.readAsBinaryString(file);
    e.target.value="";
  };

  const translateRecipes=async()=>{
    const need=recipes.filter(x=>!x.nameTamil||!x.nameTamil.trim());
    if(!need.length){alert("All recipes already have Tamil names.");return;}
    if(!confirm("Translate "+need.length+" recipe names to Tamil using AI? This may take a minute."))return;
    setTranslating(true);
    const BATCH=40; const results={};
    for(let bi=0;bi<need.length;bi+=BATCH){
      const batch=need.slice(bi,bi+BATCH);
      setTransProgress("Translating "+(bi+1)+"–"+Math.min(bi+BATCH,need.length)+" of "+need.length+"...");
      try{
        const res=await fetch("/api/translate",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({names:batch.map(x=>x.name)})});
        const data=await res.json();
        if(data.translations)Object.assign(results,data.translations);
      }catch(err){console.error(err);}
    }
    setRecipes(prev=>prev.map(r=>{
      if(r.nameTamil&&r.nameTamil.trim())return r;
      const tamil=results[r.name];
      return tamil?{...r,nameTamil:tamil}:r;
    }));
    setTranslating(false); setTransProgress("");
    alert("Done! Translated "+Object.keys(results).length+" recipes.");
  };

  const filterFn=r=>{
    if(typeF!=="all"&&r.recipeType!==typeF)return false;
    const qq=q.toLowerCase();
    return !qq||r.name.toLowerCase().includes(qq)||(r.nameTamil||"").toLowerCase().includes(qq);
  };
  const duplicateRecipe=(rec)=>{
    const copy={
      ...rec,
      id:Date.now(),
      name:rec.name+" (Copy)",
      nameTamil:rec.nameTamil?rec.nameTamil+" (நகல்)":rec.nameTamil,
      ingredients:(rec.ingredients||[]).map(i=>({...i})),
      subLinks:(rec.subLinks||[]).map(s=>({...s})),
      prepSteps:(rec.prepSteps||[]).map(s=>({...s})),
    };
    setRecipes(p=>[...p,copy]);
  };
  const mainRecs=recipes.filter(r=>!r.isSubRecipe).filter(filterFn);
  const subRecs=recipes.filter(r=>r.isSubRecipe).filter(filterFn);
  const usedTypes=[...new Set(recipes.map(r=>r.recipeType).filter(Boolean))];

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
        <input style={{...css.inp,maxWidth:220}} placeholder={t("Search recipes...","தேடு...")} value={q} onChange={e=>setQ(e.target.value)}/>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button style={css.btn("ghost",true)} onClick={()=>setModal({type:"recipeTypes"})}>⚙️ {t("Manage Types","வகை நிர்வகி")}</button>
          <button style={css.btn("ghost",true)} onClick={exportRecipes}>⬇️ {t("Export Names","பெயர் ஏற்று")}</button>
          <button style={css.btn("success",true)} onClick={()=>recFileRef.current.click()}>📤 {t("Import Tamil","தமிழ் இறக்கு")}</button>
          <input ref={recFileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={importRecipesTamil}/>
          <button data-tour="add-recipe" style={css.btn()} onClick={()=>setModal({type:"recipe"})}>+ {t("Add Recipe","சேர்")}</button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        <button style={css.btn(typeF==="all"?"primary":"ghost",true)} onClick={()=>setTypeF("all")}>{t("All Types","அனைத்தும்")}</button>
        {usedTypes.map(tid=>{const tp=recipeTypes.find(x=>x.id===tid);return tp?<button key={tid} style={{...css.btn("ghost",true),borderColor:tp.color||P.muted,color:tp.color||P.muted,fontWeight:typeF===tid?700:400}} onClick={()=>setTypeF(typeF===tid?"all":tid)}>{lang==="en"?tp.en:tp.ta}</button>:null;})}
      </div>

      <div style={{fontSize:11,color:"#1E40AF",background:"#DBEAFE",border:"1px solid #2563EB",
        borderRadius:6,padding:"5px 12px",marginBottom:8,display:"inline-flex",alignItems:"center",gap:6}}>
        <span style={{width:10,height:10,background:"#2563EB",borderRadius:2,display:"inline-block",flexShrink:0}}/>
        {t("Blue rows have no ingredients — click to edit","நீல வரிசைகளில் பொருட்கள் இல்லை — திருத்த கிளிக்")}
      </div>
      {([
        {label:t("Recipes","சமையல் குறிப்புகள்"),list:mainRecs,color:P.deepBrown},
        {label:t("Sub-Recipes","துணை சமையல்"),list:subRecs,color:P.purple},
      ]).map(({label,list,color})=>(
      <div key={label} style={{...css.card,padding:0,overflow:"hidden",marginBottom:12}}>
        <div style={{padding:"8px 14px",background:color,color:"white",fontWeight:700,fontSize:13}}>
          {label} <span style={{fontWeight:400,fontSize:11,opacity:0.8}}>({list.length})</span>
        </div>
        <table style={css.table}>
          <thead><tr>
            <th style={css.th}>#</th>
            <th style={css.th}>{t("Recipe Name","சமையல் பெயர்")}</th>
            <th style={css.th}>{t("Type","வகை")}</th>
            <th style={css.th}>{t("Yield","விளைச்சல்")}</th>
            <th style={css.th}>{t("Cost/unit","செலவு/அலகு")}</th>
            <th style={css.th}>{t("Ings","பொருட்கள்")}</th>
            <th style={css.th}>{t("Sub-links","துணை")}</th>
            <th style={css.th}>{t("Flags","குறிகள்")}</th>
            <th style={css.th}></th>
          </tr></thead>
          <tbody>
            {list.length===0&&<tr><td colSpan={8} style={{...css.td,textAlign:"center",color:P.muted,padding:20}}>{t("No recipes found.","சமையல் இல்லை.")}</td></tr>}
            {list.map((r,i)=>{
              const noIngs=!(r.ingredients||[]).length&&!(r.subLinks||[]).length;
              const rowBg=noIngs?"#DBEAFE":i%2===0?P.white:P.highlight;
              const hoverBg=noIngs?"#BFDBFE":"#FDE8C4";
              return(
              <tr key={r.id} style={{background:rowBg,cursor:"pointer",
                borderLeft:noIngs?"3px solid #2563EB":"none"}}
                  onMouseEnter={e=>e.currentTarget.style.background=hoverBg}
                  onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                <td style={{...css.td,width:28,color:P.muted,fontSize:10}}>{i+1}</td>
                <td style={css.td}>
                  <span style={{fontWeight:700,color:P.saffron,cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted"}}
                    onClick={()=>setModal({type:"recDetail",rec:r})}>
                    {lang==="en"?r.name:r.nameTamil}
                  </span>
                </td>
                <td style={css.td}>{(()=>{
                  const tp=recipeTypes.find(x=>x.id===r.recipeType);
                  const col=tp?.color||P.muted;
                  return tp?<span style={css.badge(col)}>{lang==="en"?tp.en:tp.ta}</span>:<span style={css.badge(P.muted)}>{t("—","—")}</span>;
                })()}</td>
                <td style={css.td}><strong>{r.yield}</strong> {r.yieldUnit}</td>
                <td style={css.td}>{(()=>{const cpu=costPerUnit(r,recipes,ingredients);return cpu>0?<span style={{fontWeight:700,color:P.success}}>₹{cpu.toFixed(2)}/{r.yieldUnit}</span>:<span style={{color:"#CCC"}}>—</span>;})()}</td>
                <td style={{...css.td,textAlign:"center"}}>{r.ingredients.length}</td>
                <td style={{...css.td,textAlign:"center"}}>{r.subLinks?.length>0?<span style={css.badge(P.info)}>{r.subLinks.length}</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                <td style={css.td}>
                  {r.prepSteps&&r.prepSteps.length>0&&<span title={(r.prepSteps||[]).map(s=>s.type+": "+s.duration+s.durationUnit).join(", ")} style={{fontSize:13,cursor:"help"}}>⏱ <small style={{fontSize:10,color:P.muted}}>{r.prepSteps.length}</small></span>}
                  {(r.prepSteps||[]).some(s=>s.daysBefore>0)&&<span style={{fontSize:13}} title="Requires advance prep">🌙</span>}
                </td>
                <td style={css.td}>
                  <div style={{display:"flex",gap:4}}>
                    <button style={css.btn("ghost",true)} title="Edit" onClick={()=>setModal({type:"recipe",rec:r})}>✏️</button>
                    <button style={css.btn("info",true)} title={t("Duplicate","நகலெடு")} onClick={()=>duplicateRecipe(r)}>📋</button>
                    <button style={css.btn("danger",true)} title="Delete" onClick={()=>setRecipes(p=>p.filter(x=>x.id!==r.id))}>🗑</button>
                  </div>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
      ))}
      <div style={{fontSize:11,color:P.muted,marginTop:4}}>{mainRecs.length+subRecs.length} {t("recipe(s) shown","சமையல்கள் காட்டப்படுகின்றன")} — {t("click name to view / edit details","பெயரை சொடுக்கி விவரம் காண்க")}</div>
    </div>
  );
}

function RecDetail({ctx,rec,onClose}){
  const {ingredients,recipes,recipeTypes,lang,setModal}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [mult,setMult]=useState(1);

  // Expand ingredients using subLinks with quantity-based scaling
  const expandedIngs = expandRecipeIngs(rec, mult, recipes, ingredients);
  const merged = mergeIngs(expandedIngs);

  // Also show sub-recipe quantities for context
  const subLinkDetails = (rec.subLinks||[]).map(link=>{
    const sub=recipes.find(r=>r.id===link.subId);
    return sub?{...link,sub}:null;
  }).filter(Boolean);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
        <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:P.deepBrown}}>{lang==="en"?rec.name:rec.nameTamil}</div></div>
        <div style={{display:"flex",gap:6}}>
          <button style={css.btn("ghost",true)} onClick={()=>{onClose();setTimeout(()=>ctx.setModal({type:"recipe",rec}),50);}}>✏️ {lang==="en"?"Edit":"திருத்து"}</button>
          <button style={css.btn("ghost",true)} onClick={onClose}>✕</button>
        </div>
      </div>
      {(()=>{
        const tp=recipeTypes.find(x=>x.id===rec.recipeType);
        const col=tp?.color||P.muted;
        return tp?<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{...css.badge(col),fontSize:12,padding:"4px 12px"}}>{lang==="en"?tp.en:tp.ta}</span>
          {rec.isSubRecipe&&<span style={css.badge(P.purple)}>{t("Sub-Recipe Base","துணை சமையல்")}</span>}
        </div>:null;
      })()}
      {rec.prepSteps&&rec.prepSteps.length>0&&(
        <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:8,padding:10,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"#166534",marginBottom:8}}>⏱ {t("Prep Steps","தயாரிப்பு படிகள்")}</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {rec.prepSteps.map((step,i)=>{
              const sp=PREP_STEP_TYPES.find(x=>x.id===step.type)||{en:step.type,ta:step.type};
              const icon={soak:"💧",grind:"⚙️",ferment:"🧫",marinate:"🥣",boil:"♨️",steam:"🌫️",pressure:"🫙",chop:"🔪",peel:"🫚",fry:"🍳",other:"📌"}[step.type]||"📌";
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:step.daysBefore>0?"#FEF9C3":"white",borderRadius:6,padding:"5px 8px",border:"1px solid #E5E7EB"}}>
                  <span style={{fontSize:15}}>{icon}</span>
                  <div style={{flex:1}}>
                    <span style={{fontWeight:600,fontSize:12,color:P.deepBrown}}>{lang==="en"?sp.en:sp.ta}</span>
                    {step.desc&&<span style={{fontSize:11,color:P.muted,marginLeft:6}}>{step.desc}</span>}
                  </div>
                  <span style={{background:P.gold+"22",border:"1px solid "+P.gold+"55",borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700,color:P.deepBrown,whiteSpace:"nowrap"}}>
                    {step.duration} {step.durationUnit}
                  </span>
                  {step.daysBefore>0&&<span style={{...css.badge("#B45309"),fontSize:10,whiteSpace:"nowrap"}}>🌙 {step.daysBefore}d before</span>}
                </div>
              );
            })}
          </div>
          <div style={{marginTop:6,fontSize:10,color:P.muted}}>
            {t("Total active time","மொத்த நேரம்")}: {(rec.prepSteps||[]).reduce((s,x)=>s+(x.durationUnit==="hours"?x.duration*60:x.duration),0)} {t("min","நிமிடம்")}
          </div>
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <label style={css.lbl}>{t("Multiplier","பெருக்கி")}</label>
        <input type="number" min="0.1" step="0.1" style={{...css.inp,width:70}} value={mult} onChange={e=>setMult(+e.target.value||1)}/>
        <span style={{fontSize:11,color:P.muted}}>{t("Yield","விளைச்சல்")}: {rec.yield} → {(rec.yield*mult).toFixed(1)} {rec.yieldUnit}</span>
        {(()=>{
          const totalCost=computeRecipeCost(rec,mult,recipes,ingredients);
          const cpu=costPerUnit(rec,recipes,ingredients);
          return totalCost>0?(
            <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
              <span style={{background:P.success+"18",border:`1px solid ${P.success}44`,borderRadius:7,padding:"4px 10px",fontSize:12,fontWeight:700,color:P.success}}>
                ₹{totalCost.toFixed(2)} {t("total","மொத்தம்")}
              </span>
              <span style={{background:P.gold+"18",border:`1px solid ${P.gold}44`,borderRadius:7,padding:"4px 10px",fontSize:12,fontWeight:700,color:P.gold}}>
                ₹{(cpu*mult>0?totalCost/(rec.yield*mult):cpu).toFixed(2)}/{rec.yieldUnit}
              </span>
            </div>
          ):null;
        })()}
      </div>

      {subLinkDetails.length>0&&(
        <div style={{background:"#F3F0FF",border:"1px solid #C4B5FD",borderRadius:8,padding:10,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:P.purple,marginBottom:6}}>🔗 {t("Sub-Recipes Used (with quantity per base yield)","துணை சமையல் — அளவுடன்")}</div>
          <table style={css.table}>
            <thead><tr>
              <th style={{...css.th,background:P.purple}}>{t("Sub-Recipe","துணை")}</th>
              <th style={{...css.th,background:P.purple}}>{t("Qty per base yield","அடிப்படை விளைச்சலுக்கு")}</th>
              <th style={{...css.th,background:P.purple}}>{t("Qty for current mult","தற்போதைய அளவு")}</th>
            </tr></thead>
            <tbody>{subLinkDetails.map((lk,i)=>(
              <tr key={i} style={{background:i%2===0?P.white:"#FAF5FF"}}>
                <td style={css.td}><strong>{lang==="en"?lk.sub.name:lk.sub.nameTamil}</strong><div style={{fontSize:10,color:P.muted}}>{lk.sub.yield} {lk.sub.yieldUnit} {t("base","அடிப்படை")}</div></td>
                <td style={css.td}>{lk.qty} {lk.unit} {t("of","இல்")} {lk.sub.name}</td>
                <td style={css.td}><strong style={{color:P.purple}}>{(lk.qty*mult).toFixed(2)} {lk.unit}</strong></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {(()=>{
        const cutIngs=merged.filter(row=>row.d.category==="cut"&&row.d.rawId);
        if(!cutIngs.length)return null;
        return(
          <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:8,padding:10,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#166534",marginBottom:6}}>✂️ {t("Raw Vegetable Requirements","மூல காய்கறி தேவை")}</div>
            <table style={css.table}>
              <thead><tr>
                <th style={{...css.th,background:"#166534"}}>{t("Cut Form","நறுக்கிய வடிவம்")}</th>
                <th style={{...css.th,background:"#166534"}}>{t("Cut Qty Needed","வேண்டிய அளவு")}</th>
                <th style={{...css.th,background:"#166534"}}>{t("Raw Vegetable","மூல காய்")}</th>
                <th style={{...css.th,background:"#166534"}}>{t("Raw Qty to Buy","வாங்க வேண்டிய அளவு")}</th>
                <th style={{...css.th,background:"#166534"}}>{t("Cut Yield %","நறுக்கல் விகிதம்")}</th>
              </tr></thead>
              <tbody>{cutIngs.map((row,i)=>{
                const raw=ingredients.find(x=>x.id===row.d.rawId);
                const rawQty=raw&&raw.cutYield?row.qty/raw.cutYield:null;
                return(
                  <tr key={i} style={{background:i%2===0?"#F0FDF4":"white"}}>
                    <td style={css.td}><strong>{lang==="en"?row.d.name:row.d.nameTamil}</strong></td>
                    <td style={css.td}><strong style={{color:CATCOLOR.cut}}>{row.qty.toFixed(2)} {row.unit}</strong></td>
                    <td style={css.td}>{raw?<span>{lang==="en"?raw.name:raw.nameTamil}</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}>{rawQty?<strong style={{color:P.saffron}}>⬆ {rawQty.toFixed(2)} {raw.unit}</strong>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}>{raw?.cutYield?<span style={{...css.badge(CATCOLOR.cut),fontSize:11}}>{(raw.cutYield*100).toFixed(0)}%</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        );
      })()}
      <div style={css.sHead}>{t("All Ingredients (direct + from sub-recipes, scaled)","அனைத்து பொருட்கள் — அளவிடப்பட்டவை")}</div>
      <table style={css.table}>
        <thead><tr>
          <th style={css.th}>{t("Ingredient","பொருள்")}</th>
          <th style={css.th}>{t("Qty","அளவு")}</th>
          <th style={css.th}>{t("Norm Cost","நிலையான விலை")}</th>
          <th style={css.th}>{t("Line Cost","செலவு")}</th>
          <th style={css.th}>{t("Scaling","முறை")}</th>
        </tr></thead>
        <tbody>
          {merged.map((row,i)=>{
            const lineCost=(row.d.normCost||0)*row.qty;
            return(
              <tr key={row.d.id} style={{background:i%2===0?P.white:P.highlight}}>
                <td style={css.td}><strong>{lang==="en"?row.d.name:row.d.nameTamil}</strong></td>
                <td style={css.td}><strong style={{color:P.saffron}}>{row.qty.toFixed(2)} {row.unit}</strong></td>
                <td style={css.td}>{row.d.normCost?<span style={{fontSize:11,color:P.muted}}>₹{row.d.normCost}/{row.d.unit}</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                <td style={css.td}>{lineCost>0?<strong style={{color:P.success}}>₹{lineCost.toFixed(2)}</strong>:<span style={{color:"#CCC"}}>—</span>}</td>
                <td style={css.td}>{row.d.scalingFactor&&row.d.scalingFactor<1?<span style={css.badge(P.saffron)}>×{row.d.scalingFactor} @{row.d.scalingBenchmark}{row.d.unit}</span>:<span style={css.badge(P.success)}>Linear</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// RECIPE TYPES MANAGER
// ════════════════════════════════════════════════════════════════════
function RecipeTypesManager({ctx,onClose}){
  const {recipeTypes,setRecipeTypes,recipes,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [editId,setEditId]=useState(null);
  const [delErr,setDelErr]=useState(null);
  const [ef,setEf]=useState({});
  const [nr,setNr]=useState({en:"",ta:"",color:TYPE_PALETTE[0]});
  const [colorPick,setColorPick]=useState(null); // "edit"|"new"

  const usageCount=id=>recipes.filter(r=>r.recipeType===id).length;

  const startEdit=tp=>{setEditId(tp.id);setEf({...tp});setColorPick(null);};
  const saveEdit=()=>{
    setRecipeTypes(p=>p.map(tp=>tp.id===editId?{...ef}:tp));
    setEditId(null);
  };

  const [addErr,setAddErr]=useState("");
  const addNew=()=>{
    if(!nr.en.trim())return;
    const id=nr.en.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
    if(recipeTypes.find(x=>x.id===id)){setAddErr(t("Name already exists — try a different name","இந்த பெயர் உள்ளது"));return;}
    setAddErr("");
    const nextColor=TYPE_PALETTE[recipeTypes.length%TYPE_PALETTE.length];
    setRecipeTypes(p=>[...p,{id,en:nr.en.trim(),ta:nr.ta.trim()||nr.en.trim(),color:nr.color||nextColor}]);
    setNr({en:"",ta:"",color:TYPE_PALETTE[(recipeTypes.length+1)%TYPE_PALETTE.length]});
  };

  const del=id=>{
    if(usageCount(id)>0){setDelErr(id);return;}
    setDelErr(null);
    setRecipeTypes(p=>p.filter(x=>x.id!==id));
  };

  const move=(idx,dir)=>{
    const arr=[...recipeTypes];
    const to=idx+dir;
    if(to<0||to>=arr.length)return;
    [arr[idx],arr[to]]=[arr[to],arr[idx]];
    setRecipeTypes(arr);
  };

  const ColorDots=({selected,onSelect})=>(
    <div style={{display:"flex",gap:4,flexWrap:"wrap",maxWidth:280,marginTop:4}}>
      {TYPE_PALETTE.map(c=>(
        <div key={c} onClick={()=>onSelect(c)}
          style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",
                  border:selected===c?"3px solid #111":"2px solid transparent",
                  boxSizing:"border-box",flexShrink:0}}/>
      ))}
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown}}>
          ⚙️ {t("Manage Recipe Types","சமையல் வகைகள் நிர்வகி")}
        </div>
        <button style={css.btn("ghost",true)} onClick={onClose}>✕</button>
      </div>
      <div style={{fontSize:11,color:P.muted,marginBottom:12}}>
        {t("Add new types, rename existing ones, change colours, or reorder. Types with recipes cannot be deleted.","புதிய வகைகளை சேர்க்கவும், பெயர் மாற்றவும், வண்ணம் மாற்றவும், வரிசை மாற்றவும்.")}
      </div>

      {/* ── Existing types ── */}
      <div style={{...css.card,padding:0,overflow:"auto",marginBottom:12}}>
        <table style={css.table}>
          <thead><tr>
            <th style={css.th}></th>
            <th style={css.th}>{t("English","ஆங்கிலம்")}</th>
            <th style={css.th}>{t("Tamil","தமிழ்")}</th>
            <th style={css.th}>{t("Colour","வண்ணம்")}</th>
            <th style={{...css.th,textAlign:"center"}}>{t("Recipes","சமையல்கள்")}</th>
            <th style={css.th}></th>
          </tr></thead>
          <tbody>
            {recipeTypes.map((tp,i)=>{
              const ed=editId===tp.id;
              const cnt=usageCount(tp.id);
              return(
                <tr key={tp.id} style={{background:i%2===0?P.white:P.highlight}}>
                  <td style={{...css.td,width:28}}>
                    <div style={{display:"flex",flexDirection:"column",gap:1}}>
                      <button style={{...css.btn("ghost",true),padding:"1px 4px",fontSize:10}} onClick={()=>move(i,-1)} disabled={i===0}>▲</button>
                      <button style={{...css.btn("ghost",true),padding:"1px 4px",fontSize:10}} onClick={()=>move(i,1)} disabled={i===recipeTypes.length-1}>▼</button>
                    </div>
                  </td>
                  <td style={css.td}>
                    {ed?<input style={{...css.inp,width:130}} value={ef.en} onChange={e=>setEf({...ef,en:e.target.value})}/>
                      :<span style={{...css.badge(tp.color||P.muted)}}>{tp.en}</span>}
                  </td>
                  <td style={{...css.td,fontFamily:"'Noto Sans Tamil',sans-serif"}}>
                    {ed?<input style={{...css.inp,width:130,fontFamily:"'Noto Sans Tamil',sans-serif"}} value={ef.ta} onChange={e=>setEf({...ef,ta:e.target.value})}/>
                      :tp.ta}
                  </td>
                  <td style={css.td}>
                    {ed?(
                      <div>
                        <div style={{width:24,height:24,borderRadius:5,background:ef.color||"#999",cursor:"pointer",border:"2px solid #ccc"}}
                          onClick={()=>setColorPick(colorPick==="edit"?null:"edit")}/>
                        {colorPick==="edit"&&<ColorDots selected={ef.color} onSelect={c=>{setEf({...ef,color:c});setColorPick(null);}}/>}
                      </div>
                    ):(
                      <div style={{width:20,height:20,borderRadius:5,background:tp.color||"#999",border:"1px solid #ddd"}}/>
                    )}
                  </td>
                  <td style={{...css.td,textAlign:"center"}}>
                    {cnt>0?<span style={css.badge(P.success)}>{cnt}</span>:<span style={{color:"#CCC",fontSize:11}}>0</span>}
                  </td>
                  <td style={css.td}>
                    <div style={{display:"flex",gap:4}}>
                      {ed?(
                        <>
                          <button style={css.btn("success",true)} onClick={saveEdit}>✓</button>
                          <button style={css.btn("ghost",true)} onClick={()=>{setEditId(null);setColorPick(null);}}>✕</button>
                        </>
                      ):(
                        <>
                          <button style={css.btn("ghost",true)} onClick={()=>startEdit(tp)}>✏️</button>
                          <button style={{...css.btn("danger",true),opacity:cnt>0?0.35:1}} onClick={()=>del(tp.id)} title={cnt>0?t("Cannot delete — reassign recipes first","சமையல்கள் உள்ளன"):""}>🗑{cnt>0&&delErr===tp.id?<span style={{fontSize:9,marginLeft:2}}>⚠</span>:""}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add new type ── */}
      <div style={{...css.sHead,marginBottom:8}}>+ {t("Add New Type","புதிய வகை சேர்")}</div>
      <div style={{display:"flex",gap:8,alignItems:"flex-start",flexWrap:"wrap",background:"#FFF8E6",padding:10,borderRadius:8,border:"1px solid #F5D76E"}}>
        <div>
          <label style={css.lbl}>{t("English Name","ஆங்கில பெயர்")}</label>
          <input style={{...css.inp,width:150}} placeholder="e.g. Aviyal" value={nr.en} onChange={e=>setNr({...nr,en:e.target.value})}/>
        </div>
        <div>
          <label style={css.lbl}>{t("Tamil Name","தமிழ் பெயர்")}</label>
          <input style={{...css.inp,width:150,fontFamily:"'Noto Sans Tamil',sans-serif"}} placeholder="எ.கா. அவியல்" value={nr.ta} onChange={e=>setNr({...nr,ta:e.target.value})}/>
        </div>
        <div>
          <label style={css.lbl}>{t("Colour","வண்ணம்")}</label>
          <div style={{width:24,height:24,borderRadius:5,background:nr.color||"#999",cursor:"pointer",border:"2px solid #ccc"}}
            onClick={()=>setColorPick(colorPick==="new"?null:"new")}/>
          {colorPick==="new"&&<ColorDots selected={nr.color} onSelect={c=>{setNr({...nr,color:c});setColorPick(null);}}/>}
        </div>
        <div style={{display:"flex",alignItems:"flex-end",paddingBottom:1}}>
          <button style={css.btn()} onClick={addNew}>+ {t("Add","சேர்")}</button>
        </div>
      </div>
      {nr.en&&<div style={{fontSize:10,color:P.muted,marginTop:4,marginLeft:2}}>
        {t("ID will be:","ID:")}{" "}<code style={{background:"#F0F0F0",padding:"1px 5px",borderRadius:3}}>{nr.en.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")}</code>
      </div>}
      {addErr&&<div style={{color:P.danger,fontSize:11,marginTop:4}}>{addErr}</div>}

      <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
        <button style={css.btn()} onClick={onClose}>{t("Done","முடிந்தது")}</button>
      </div>
    </div>
  );
}

function RecForm({ctx,rec,onClose}){
  const {ingredients,recipes,setRecipes,recipeTypes,lang,setModal}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [f,setF]=useState(rec||{name:"",nameTamil:"",recipeType:"other",isSubRecipe:false,yield:10,yieldUnit:"kg",prepSteps:[],ingredients:[],subLinks:[]});
  const [ni,setNi]=useState({iid:"",qty:"",unit:"kg"});
  const [nsl,setNsl]=useState({subId:"",qty:"",unit:"kg"});
  const [nps,setNps]=useState({type:"soak",desc:"",duration:"",durationUnit:"hours",daysBefore:0});

  const save=()=>{
    if(!f.name)return;
    if(rec)setRecipes(p=>p.map(r=>r.id===rec.id?{...f,id:rec.id}:r));
    else setRecipes(p=>[...p,{...f,id:Date.now()}]);
    onClose();
  };
  const addIng=()=>{if(!ni.iid||!ni.qty)return;setF(x=>({...x,ingredients:[...(x.ingredients||[]),{iid:+ni.iid,qty:+ni.qty,unit:ni.unit}]}));setNi({iid:"",qty:"",unit:"kg"});};
  const addSubLink=()=>{
    if(!nsl.subId||!nsl.qty)return;
    const sub=recipes.find(r=>r.id===+nsl.subId);
    setF(x=>({...x,subLinks:[...(x.subLinks||[]),{subId:+nsl.subId,qty:+nsl.qty,unit:nsl.unit||sub?.yieldUnit||"kg"}]}));
    setNsl({subId:"",qty:"",unit:"kg"});
  };
  const addPrepStep=()=>{
    if(!nps.duration)return;
    setF(x=>({...x,prepSteps:[...(x.prepSteps||[]),{...nps,duration:+nps.duration,daysBefore:+nps.daysBefore}]}));
    setNps({type:"soak",desc:"",duration:"",durationUnit:"hours",daysBefore:0});
  };
  const rmPrepStep=i=>setF(x=>({...x,prepSteps:(x.prepSteps||[]).filter((_,j)=>j!==i)}));

  const subRecipeOptions=recipes.filter(r=>r.isSubRecipe&&r.id!==rec?.id);
  const STEP_ICONS={soak:"💧",grind:"⚙️",ferment:"🧫",marinate:"🥣",boil:"♨️",steam:"🌫️",pressure:"🫙",chop:"🔪",peel:"🫚",fry:"🍳",other:"📌"};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown}}>{rec?t("Edit Recipe","திருத்து"):t("Add Recipe","சேர்")}</div>
        <button style={css.btn("ghost",true)} onClick={onClose}>✕</button>
      </div>
      {/* ── Basic Info ── */}
      <div style={css.g2}>
        <div><label style={css.lbl}>{t("Name (EN)","பெயர் EN")}</label><input style={css.inp} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></div>
        <div><label style={css.lbl}>{t("Name (Tamil)","பெயர் தமிழ்")}</label><input style={{...css.inp,fontFamily:"'Noto Sans Tamil',sans-serif"}} value={f.nameTamil} onChange={e=>setF({...f,nameTamil:e.target.value})}/></div>
        <div><label style={css.lbl}>{t("Recipe Type","சமையல் வகை")}</label>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            <select style={{...css.sel,flex:1}} value={f.recipeType||"other"} onChange={e=>setF({...f,recipeType:e.target.value,isSubRecipe:e.target.value==="sub"})}>
              {recipeTypes.map(tp=><option key={tp.id} value={tp.id}>{lang==="en"?tp.en:tp.ta}</option>)}
            </select>
            <button type="button" style={{...css.btn("ghost",true),whiteSpace:"nowrap",fontSize:11}} onClick={()=>setModal({type:"recipeTypes"})} title={lang==="en"?"Add / manage types":"வகை சேர்க்க"}>⚙️ {t("Manage","நிர்வகி")}</button>
          </div>
        </div>
        <div><label style={css.lbl}>{t("Base Yield","விளைச்சல்")}</label>
          <div style={{display:"flex",gap:6}}>
            <input type="number" style={{...css.inp}} value={f.yield} onChange={e=>setF({...f,yield:+e.target.value})}/>
            <select style={css.sel} value={f.yieldUnit} onChange={e=>setF({...f,yieldUnit:e.target.value})}>
              {["kg","g","L","nos","plates","portions"].map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Prep Steps ── */}
      <div style={{...css.sHead,marginTop:14,color:"#166534",borderColor:"#BBF7D0"}}>⏱ {t("Prep Steps","தயாரிப்பு படிகள்")}</div>
      <div style={{fontSize:11,color:P.muted,marginBottom:8}}>{t("Soak, grind, ferment, marinate, boil ahead — anything needing time before cooking.","ஊறவை, அரை, புளிக்கவை, வேக வை — சமைக்கும் முன் தேவையான நேரம்.")}</div>
      <div style={{display:"flex",gap:6,marginBottom:8,background:"#F0FDF4",padding:8,borderRadius:7,flexWrap:"wrap"}}>
        <select style={{...css.sel,flex:1,minWidth:110}} value={nps.type} onChange={e=>{const sp=PREP_STEP_TYPES.find(x=>x.id===e.target.value);setNps({...nps,type:e.target.value,durationUnit:sp?.defaultUnit||"minutes"});}}>
          {PREP_STEP_TYPES.map(sp=><option key={sp.id} value={sp.id}>{STEP_ICONS[sp.id]||"📌"} {lang==="en"?sp.en:sp.ta}</option>)}
        </select>
        <input placeholder={t("Description (optional)","விளக்கம்")} style={{...css.inp,flex:2,minWidth:140}} value={nps.desc} onChange={e=>setNps({...nps,desc:e.target.value})}/>
        <input type="number" min="1" placeholder={t("Duration","கால அளவு")} style={{...css.inp,width:70}} value={nps.duration} onChange={e=>setNps({...nps,duration:e.target.value})}/>
        <select style={css.sel} value={nps.durationUnit} onChange={e=>setNps({...nps,durationUnit:e.target.value})}>
          {["minutes","hours"].map(u=><option key={u}>{u}</option>)}
        </select>
        <select style={{...css.sel,width:110}} value={nps.daysBefore} onChange={e=>setNps({...nps,daysBefore:+e.target.value})}>
          <option value={0}>{t("Same day","அன்றே")}</option>
          <option value={1}>{t("1 day before","1 நாள் முன்பு")}</option>
          <option value={2}>{t("2 days before","2 நாள் முன்பு")}</option>
        </select>
        <button style={css.btn("success",true)} onClick={addPrepStep}>+ {t("Add Step","படி சேர்")}</button>
      </div>
      {(f.prepSteps||[]).length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
          {(f.prepSteps||[]).map((step,i)=>{
            const sp=PREP_STEP_TYPES.find(x=>x.id===step.type)||{en:step.type,ta:step.type};
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:step.daysBefore>0?"#FEF9C3":"#F0FDF4",borderRadius:6,padding:"5px 8px",border:"1px solid #D1FAE5"}}>
                <span>{STEP_ICONS[step.type]||"📌"}</span>
                <span style={{fontWeight:600,fontSize:12,flex:1}}>{lang==="en"?sp.en:sp.ta}{step.desc?" — "+step.desc:""}</span>
                <span style={{fontSize:11,color:P.muted}}>{step.duration} {step.durationUnit}</span>
                {step.daysBefore>0&&<span style={{...css.badge("#B45309"),fontSize:10}}>🌙 {step.daysBefore}d</span>}
                <button style={css.btn("danger",true)} onClick={()=>rmPrepStep(i)}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sub-Recipe Links (with quantity) ─────────── */}
      {subRecipeOptions.length>0&&(
        <div style={{marginTop:14}}>
          <div style={{...css.sHead,color:P.purple,borderColor:"#C4B5FD"}}>🔗 {t("Sub-Recipe Links","துணை சமையல் இணைப்பு")}</div>
          <div style={{fontSize:11,color:P.muted,marginBottom:8}}>
            {t("Specify how much of each sub-recipe is needed per base yield of this recipe.","ஒவ்வொரு துணை சமையலுக்கும் தேவையான அளவை குறிப்பிடவும்.")}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8,background:"#F5F0FF",padding:8,borderRadius:7}}>
            <select style={{...css.sel,flex:2}} value={nsl.subId} onChange={e=>{const sub=recipes.find(r=>r.id===+e.target.value);setNsl({...nsl,subId:e.target.value,unit:sub?.yieldUnit||"kg"});}}>
              <option value="">{t("Select sub-recipe...","துணை தேர்வு...")}</option>
              {subRecipeOptions.map(sr=><option key={sr.id} value={sr.id}>{lang==="en"?sr.name:sr.nameTamil} (base {sr.yield} {sr.yieldUnit})</option>)}
            </select>
            <input type="number" min="0" step="0.1" placeholder={t("Qty needed","அளவு")} style={{...css.inp,width:80}} value={nsl.qty} onChange={e=>setNsl({...nsl,qty:e.target.value})}/>
            <select style={css.sel} value={nsl.unit} onChange={e=>setNsl({...nsl,unit:e.target.value})}>{["kg","g","L","ml","nos"].map(u=><option key={u}>{u}</option>)}</select>
            <button style={{...css.btn("info"),whiteSpace:"nowrap"}} onClick={addSubLink}>+ {t("Link","இணை")}</button>
          </div>
          {(f.subLinks||[]).length>0&&(
            <table style={{...css.table,marginBottom:10}}>
              <thead><tr>
                <th style={{...css.th,background:P.purple}}>{t("Sub-Recipe","துணை")}</th>
                <th style={{...css.th,background:P.purple}}>{t("Qty per base yield","அடிப்படை விளைச்சலுக்கு அளவு")}</th>
                <th style={{...css.th,background:P.purple}}></th>
              </tr></thead>
              <tbody>{f.subLinks.map((lk,i)=>{
                const sub=recipes.find(r=>r.id===lk.subId);
                return(
                  <tr key={i} style={{background:i%2===0?P.white:"#FAF5FF"}}>
                    <td style={css.td}><strong>{sub?(lang==="en"?sub.name:sub.nameTamil):"?"}</strong>{sub&&<div style={{fontSize:10,color:P.muted}}>base yield: {sub.yield} {sub.yieldUnit}</div>}</td>
                    <td style={css.td}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input type="number" step="0.1" style={{...css.inp,width:70,padding:"3px 6px"}} value={lk.qty} onChange={ev=>setF(x=>({...x,subLinks:x.subLinks.map((l,j)=>j===i?{...l,qty:+ev.target.value}:l)}))}/>
                        <span style={{fontSize:11,color:P.muted}}>{lk.unit}</span>
                      </div>
                    </td>
                    <td style={css.td}><button style={css.btn("danger",true)} onClick={()=>setF(x=>({...x,subLinks:x.subLinks.filter((_,j)=>j!==i)}))}>✕</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Direct Ingredients ───────────────────────── */}
      <div style={{...css.sHead,marginTop:14}}>{t("Direct Ingredients","நேரடி பொருட்கள்")}</div>
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        <select style={{...css.sel,flex:2}} value={ni.iid} onChange={e=>setNi({...ni,iid:e.target.value})}>
          <option value="">{t("Select ingredient...","தேர்வு...")}</option>
          {ingredients.map(i=><option key={i.id} value={i.id}>{lang==="en"?i.name:i.nameTamil} ({i.unit})</option>)}
        </select>
        <input type="number" placeholder={t("Qty","அளவு")} style={{...css.inp,width:70}} value={ni.qty} onChange={e=>setNi({...ni,qty:e.target.value})}/>
        <select style={css.sel} value={ni.unit} onChange={e=>setNi({...ni,unit:e.target.value})}>{["kg","g","L","ml","nos","tsp","tbsp"].map(u=><option key={u}>{u}</option>)}</select>
        <button style={css.btn()} onClick={addIng}>+</button>
      </div>
      {(f.ingredients||[]).length>0&&<table style={{...css.table,marginBottom:14}}>
        <thead><tr><th style={css.th}>{t("Ingredient","பொருள்")}</th><th style={css.th}>{t("Qty","அளவு")}</th><th style={css.th}></th></tr></thead>
        <tbody>{(f.ingredients||[]).map((ing,i)=>{
          const d=ingredients.find(x=>x.id===ing.iid);
          return(
            <tr key={i}>
              <td style={css.td}>{d?(lang==="en"?d.name:d.nameTamil):ing.iid}</td>
              <td style={css.td}>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <input type="number" step="0.01" style={{...css.inp,width:75,padding:"3px 6px"}}
                    value={ing.qty}
                    onChange={ev=>setF(x=>({...x,ingredients:x.ingredients.map((l,j)=>j===i?{...l,qty:+ev.target.value}:l)}))}/>
                  <select style={{...css.sel,padding:"3px 6px",fontSize:11}}
                    value={ing.unit}
                    onChange={ev=>setF(x=>({...x,ingredients:x.ingredients.map((l,j)=>j===i?{...l,unit:ev.target.value}:l)}))}>
                    {["kg","g","L","ml","nos","tsp","tbsp"].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </td>
              <td style={css.td}><button style={css.btn("danger",true)} onClick={()=>setF(x=>({...x,ingredients:x.ingredients.filter((_,j)=>j!==i)}))}>✕</button></td>
            </tr>
          );
        })}</tbody>
      </table>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={css.btn("ghost")} onClick={onClose}>{t("Cancel","ரத்து")}</button>
        <button style={css.btn()} onClick={save}>💾 {t("Save","சேமி")}</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════
function OrdersPage({ctx}){
  const {orders,setOrders,locations,recipes,ingredients,lang,setModal}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const SESS_ORDER={Breakfast:0,Lunch:1,Snack:2,Dinner:3};
  // Sort by date desc, then by session order
  const sortOrders=arr=>[...arr].sort((a,b)=>{
    if(b.date!==a.date) return b.date.localeCompare(a.date);
    const sa=Math.min(...(a.entries||[]).map(e=>SESS_ORDER[e.session]??9));
    const sb=Math.min(...(b.entries||[]).map(e=>SESS_ORDER[e.session]??9));
    return sa-sb;
  });
  const real=sortOrders(orders.filter(o=>!o.isTemplate));
  const tpls=orders.filter(o=>o.isTemplate);
  const [dateQ,setDateQ]=useState("");
  const [nameQ,setNameQ]=useState("");
  const [dupOpen,setDupOpen]=useState(false);
  const [dupFrom,setDupFrom]=useState(TODAY);
  const [dupTo,setDupTo]=useState(TODAY);
  const [dupSess,setDupSess]=useState("All");
  const importFileRef=useRef();
  const [importMsg,setImportMsg]=useState("");

  const downloadMenuTemplate=()=>{
    const sample=[
      {Date:TODAY,Location:locations[0]?.name||"Madalayam",Session:"Lunch",Recipe:recipes[0]?.name||"Sambar",Qty:20,Pax:200,Gurupooja:""},
      {Date:TODAY,Location:locations[0]?.name||"Madalayam",Session:"Lunch",Recipe:recipes[1]?.name||"Rasam",Qty:15,Pax:200,Gurupooja:""},
      {Date:TODAY,Location:locations[0]?.name||"Madalayam",Session:"Lunch",Recipe:"Vada",Qty:5,Pax:250,Gurupooja:"Yes"},
    ];
    const ws=XLSX.utils.json_to_sheet(sample);
    ws["!cols"]=[{wch:12},{wch:18},{wch:12},{wch:26},{wch:8},{wch:8},{wch:11}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Menu");
    XLSX.writeFile(wb,"menu_import_template.xlsx");
  };

  const importMenuXlsx=e=>{
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
      const valid=rows.filter(r=>(r.Date+"").trim()&&(r.Recipe+"").trim()&&r.Qty!=="");
      if(!valid.length){alert("No valid rows found. Headers needed: Date, Location, Session, Recipe, Qty, Pax (optional), Gurupooja (optional)");return;}

      let created=0,updated=0; const skipped=[];
      let idCounter=Date.now();

      setOrders(prev=>{
        const next=[...prev];
        const byDate={};
        valid.forEach(r=>{
          const dateStr=(r.Date instanceof Date)?r.Date.toISOString().slice(0,10):(r.Date+"").trim();
          if(!byDate[dateStr])byDate[dateStr]=[];
          byDate[dateStr].push(r);
        });
        Object.entries(byDate).forEach(([dateStr,rowsForDate])=>{
          const entries=[];
          rowsForDate.forEach(r=>{
            const loc=locations.find(l=>l.name.toLowerCase()===(r.Location+"").trim().toLowerCase());
            const sess=SESSIONS.find(s=>s.toLowerCase()===(r.Session+"").trim().toLowerCase());
            const rec=recipes.find(x=>x.name.toLowerCase()===(r.Recipe+"").trim().toLowerCase()||(x.nameTamil||"").toLowerCase()===(r.Recipe+"").trim().toLowerCase());
            if(!loc||!sess||!rec){skipped.push((r.Recipe||"?")+" ("+dateStr+")");return;}
            const qty=+r.Qty||0; if(!qty)return;
            const pax=r.Pax?+r.Pax:null;
            entries.push({locId:loc.id,session:sess,recId:rec.id,qty,baseQty:qty,basePax:pax,yu:rec.yieldUnit||"kg"});
          });
          if(!entries.length)return;
          const isGuru=rowsForDate.some(r=>["yes","true","1"].includes((r.Gurupooja+"").trim().toLowerCase()));
          const existingIdx=next.findIndex(o=>o.source==="excel_import"&&o.date===dateStr);
          if(existingIdx>=0){
            const existing=next[existingIdx];
            let mergedEntries=[...existing.entries];
            entries.forEach(en=>{
              const idx=mergedEntries.findIndex(x=>x.locId===en.locId&&x.session===en.session&&x.recId===en.recId);
              if(idx>=0)mergedEntries[idx]={...mergedEntries[idx],qty:en.qty,baseQty:en.qty,basePax:en.basePax??mergedEntries[idx].basePax};
              else mergedEntries.push(en);
            });
            next[existingIdx]={...existing,entries:mergedEntries};
            updated++;
          } else {
            const paxVal=entries.find(en=>en.basePax)?.basePax||"";
            next.push({
              id:idCounter++,
              name:(isGuru?"🕉️ "+t("Gurupooja Menu","குருபூஜை உணவு"):t("Menu","உணவு பட்டியல்"))+" — "+dateStr,
              date:dateStr,isTemplate:false,pax:paxVal,source:"excel_import",entries,
            });
            created++;
          }
        });
        return next;
      });

      setImportMsg(created+" "+t("day(s) created","புதிய நாட்கள்")+", "+updated+" "+t("day(s) updated","புதுப்பிக்கப்பட்ட நாட்கள்")+
        (skipped.length?", "+skipped.length+" "+t("row(s) skipped (no match)","பொருந்தாத வரிசைகள்")+": "+skipped.slice(0,6).join(", "):""));
    };
    reader.readAsBinaryString(file);
    e.target.value="";
  };

  const filtReal=[...real]
    .sort((a,b)=>b.date.localeCompare(a.date))
    .filter(o=>{
      const dq=dateQ.replace(/-/g,"");
      const odate=o.date.replace(/-/g,"");
      return(!dq||odate.includes(dq))&&(!nameQ||o.name.toLowerCase().includes(nameQ.toLowerCase()));
    });

  const useTemplate=tpl=>{
    const newOrd={...tpl,id:Date.now(),isTemplate:false,date:TODAY,name:`Order from "${tpl.name}"`};
    setOrders(p=>[...p,newOrd]);
    setModal({type:"order",ord:newOrd});
  };

  const dupMatchCount=orders.filter(o=>!o.isTemplate&&o.date===dupFrom)
    .flatMap(o=>o.entries||[])
    .filter(e=>dupSess==="All"||e.session===dupSess).length;

  const duplicateDay=()=>{
    if(!dupFrom||!dupTo)return;
    if(dupFrom===dupTo){alert(t("Source and target date are the same.","இருந்து மற்றும் புதிய தேதி ஒன்றே."));return;}
    const source=orders.filter(o=>!o.isTemplate&&o.date===dupFrom);
    if(!source.length){alert(t("No orders found on that date.","அந்த தேதியில் ஆர்டர் இல்லை."));return;}
    const copies=[];
    source.forEach((o,i)=>{
      const entries=(o.entries||[]).filter(e=>dupSess==="All"||e.session===dupSess);
      if(!entries.length)return;
      copies.push({...o,id:Date.now()+i,date:dupTo,entries:entries.map(e=>({...e}))});
    });
    if(!copies.length){alert(t("No entries found for that date and session.","அந்த தேதி / அமர்வுக்கு பதிவுகள் இல்லை."));return;}
    setOrders(p=>[...p,...copies]);
    setDupOpen(false);
    alert(copies.length+" "+t("order(s) duplicated to","ஆர்டர்(கள்) நகலெடுக்கப்பட்டன")+" "+dupTo+(dupSess!=="All"?" ("+dupSess+")":""));
  };

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <button data-tour="new-order" style={css.btn()} onClick={()=>setModal({type:"order"})}>+ {t("New Order","புதிய ஆர்டர்")}</button>
        <button style={css.btn("ghost")} onClick={()=>setModal({type:"addLoc"})}>📍 {t("Add Location","இடம் சேர்")}</button>
        <button data-tour="duplicate-day" style={css.btn(dupOpen?"primary":"ghost")} onClick={()=>setDupOpen(!dupOpen)}>📅 {t("Duplicate Day","நாள் நகலெடு")}</button>
        <button style={css.btn("ghost")} onClick={downloadMenuTemplate}>📋 {t("Menu Template","உணவு டெம்ப்ளேட்")}</button>
        <button style={css.btn("success")} onClick={()=>importFileRef.current.click()}>📤 {t("Import Menu (Excel)","உணவு இறக்கு")}</button>
        <input ref={importFileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={importMenuXlsx}/>
        <input type="date" style={{...css.inp,width:150}} placeholder="Filter by date" value={dateQ} onChange={e=>setDateQ(e.target.value)}/>
        <input style={{...css.inp,maxWidth:200}} placeholder={t("Search order name...","பெயர் தேடு...")} value={nameQ} onChange={e=>setNameQ(e.target.value)}/>
        {(dateQ||nameQ)&&<button style={css.btn("ghost",true)} onClick={()=>{setDateQ("");setNameQ("");}}>✕ Clear</button>}
      </div>

      {importMsg&&(
        <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:8,padding:"8px 14px",marginBottom:12,fontSize:12,color:"#166534",fontWeight:600}}>
          ✓ {importMsg}
        </div>
      )}

      <div style={{fontSize:11,color:P.muted,marginBottom:14,marginTop:-6}}>
        {t("Excel columns needed: Date, Location, Session, Recipe, Qty, Pax (optional), Gurupooja (optional \"Yes\"). Re-uploading a file with more dates added merges in only the new dates — existing ones update in place.","தேவையான தலைப்புகள்: Date, Location, Session, Recipe, Qty, Pax, Gurupooja. மீண்டும் பதிவேற்றினால் புதிய தேதிகள் மட்டும் சேர்க்கப்படும்.")}
      </div>

      {dupOpen&&(
        <div style={{display:"flex",gap:10,alignItems:"flex-end",background:P.highlight,padding:12,borderRadius:8,marginBottom:14,flexWrap:"wrap"}}>
          <div>
            <label style={css.lbl}>{t("Copy orders from","இதிலிருந்து நகலெடு")}</label>
            <input type="date" style={{...css.inp,width:150}} value={dupFrom} onChange={e=>setDupFrom(e.target.value)}/>
          </div>
          <div>
            <label style={css.lbl}>{t("Session","அமர்வு")}</label>
            <div style={{display:"flex",gap:4}}>
              {["All",...SESSIONS].map(s=>(
                <button key={s} style={{...css.btn(dupSess===s?"primary":"ghost",true),
                  borderColor:s!=="All"?(SCOLOR[s]||P.muted):"#DCC88A",
                  color:dupSess===s?"white":(s!=="All"?SCOLOR[s]:P.deepBrown),
                  background:dupSess===s?(SCOLOR[s]||P.saffron):"transparent",
                }} onClick={()=>setDupSess(s)}>{s==="All"?t("All","அனைத்தும்"):s}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={css.lbl}>{t("To date","புதிய தேதி")}</label>
            <input type="date" style={{...css.inp,width:150}} value={dupTo} onChange={e=>setDupTo(e.target.value)}/>
          </div>
          <div style={{fontSize:11,color:P.muted,paddingBottom:8}}>
            {dupMatchCount} {t("entry(ies) found for that date/session","பதிவுகள் கிடைத்தன")}
          </div>
          <button style={css.btn("success")} onClick={duplicateDay}>✓ {t("Duplicate","நகலெடு")}</button>
          <button style={css.btn("ghost")} onClick={()=>setDupOpen(false)}>{t("Cancel","ரத்து")}</button>
        </div>
      )}

      {tpls.length>0&&(
        <div style={css.card}>
          <div style={css.sHead}>📋 {t("Templates","மாதிரிகள்")}</div>
          <table style={css.table}>
            <thead><tr>
              <th style={css.th}>{t("Template Name","மாதிரி பெயர்")}</th>
              <th style={css.th}>{t("Entries","பதிவுகள்")}</th>
              <th style={css.th}></th>
            </tr></thead>
            <tbody>{tpls.map((tpl,i)=>(
              <tr key={tpl.id} style={{background:i%2===0?P.white:P.highlight}}>
                <td style={css.td}>
                  <span style={{fontWeight:700,color:P.saffron,cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted"}}
                    onClick={()=>setModal({type:"order",ord:tpl})}>
                    📋 {tpl.name}
                  </span>
                </td>
                <td style={css.td}>{tpl.entries.length}</td>
                <td style={css.td}><div style={{display:"flex",gap:4}}>
                  <button style={css.btn("success",true)} onClick={()=>useTemplate(tpl)}>▶ {t("Use","பயன்")}</button>
                  <button style={css.btn("danger",true)} onClick={()=>setOrders(p=>p.filter(o=>o.id!==tpl.id))}>🗑</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div style={{...css.card,padding:0,overflow:"hidden"}}>
        <table style={css.table}>
          <thead><tr>
            <th style={css.th}>{t("Date","தேதி")}</th>
            <th style={css.th}>{t("Order Name","பெயர்")}</th>
            <th style={css.th}>{t("Locations","இடங்கள்")}</th>
            <th style={css.th}>{t("Sessions","அமர்வுகள்")}</th>
            <th style={css.th}>{t("Items","பதிவுகள்")}</th>
            <th style={css.th}>{t("Est. Cost","மதிப்பீடு")}</th>
            <th style={css.th}></th>
          </tr></thead>
          <tbody>
            {filtReal.length===0&&<tr><td colSpan={6} style={{...css.td,textAlign:"center",color:P.muted,padding:20}}>{t("No orders found.","ஆர்டர்கள் இல்லை.")}</td></tr>}
            {filtReal.map((ord,i)=>{
              const locs=[...new Set(ord.entries.map(e=>e.locId))];
              const sess=[...new Set(ord.entries.map(e=>e.session))];
              const locNames=locs.map(id=>locations.find(l=>l.id===id)).filter(Boolean).map(l=>lang==="en"?l.name:l.nameTamil);
              return(
                <tr key={ord.id} style={{background:i%2===0?P.white:P.highlight}}>
                  <td style={{...css.td,whiteSpace:"nowrap",fontWeight:600,color:P.deepBrown}}>{ord.date}</td>
                  <td style={css.td}>
                    <span style={{fontWeight:700,color:P.saffron,cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted"}}
                      onClick={()=>setModal({type:"order",ord})}>
                      {ord.name}
                    </span>
                  </td>
                  <td style={{...css.td,fontSize:11}}>{locNames.join(", ")||"—"}</td>
                  <td style={css.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{sess.map(s=><span key={s} style={css.badge(SCOLOR[s]||P.muted)}>{s}</span>)}</div></td>
                  <td style={{...css.td,textAlign:"center"}}>{ord.entries.length}</td>
                  <td style={css.td}>{(()=>{
                    const totalCost=ord.entries.reduce((sum,e)=>{
                      const rec=recipes.find(r=>r.id===e.recId); if(!rec)return sum;
                      return sum+computeRecipeCost(rec,effectiveQty(e,ord)/(rec.yield||1),recipes,ingredients);
                    },0);
                    return totalCost>0?<strong style={{color:P.success}}>₹{totalCost.toFixed(0)}</strong>:<span style={{color:"#CCC"}}>—</span>;
                  })()}</td>
                  <td style={css.td}><div style={{display:"flex",gap:4}}>
                    <button style={css.btn("ghost",true)} onClick={()=>setModal({type:"order",ord})}>✏️</button>
                    <button style={css.btn("danger",true)} onClick={()=>setOrders(p=>p.filter(o=>o.id!==ord.id))}>🗑</button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:11,color:P.muted,marginTop:4}}>{filtReal.length} {t("order(s) — click name to open","ஆர்டர்கள் — பெயரை சொடுக்கி திற")}</div>
    </div>
  );
}

function LocForm({ctx,onClose}){
  const {lang,setLocations,locations,orders}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [f,setF]=useState({name:"",nameTamil:""});
  const [editId,setEditId]=useState(null);
  const [editF,setEditF]=useState({});
  const [err,setErr]=useState("");

  const usedLocIds=new Set((orders||[]).flatMap(o=>(o.entries||[]).map(e=>e.locId)));

  const addLoc=()=>{
    if(!f.name.trim()){setErr(t("Name is required","பெயர் தேவை"));return;}
    setLocations(p=>[...p,{id:Date.now(),name:f.name.trim(),nameTamil:f.nameTamil.trim()}]);
    setF({name:"",nameTamil:""});
    setErr("");
  };

  const startEdit=(loc)=>{setEditId(loc.id);setEditF({name:loc.name,nameTamil:loc.nameTamil||""});};
  const saveEdit=(id)=>{
    if(!editF.name.trim())return;
    setLocations(p=>p.map(l=>l.id===id?{...l,name:editF.name.trim(),nameTamil:editF.nameTamil.trim()}:l));
    setEditId(null);
  };
  const delLoc=(id)=>{
    if(usedLocIds.has(id)){alert(t("Cannot delete — location is used in existing orders.","இந்த இடம் ஆர்டரில் உள்ளது, நீக்க முடியாது."));return;}
    if(!confirm(t("Delete this location?","இந்த இடத்தை நீக்கவா?")))return;
    setLocations(p=>p.filter(l=>l.id!==id));
  };

  return(
    <div style={{minWidth:420}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown,marginBottom:14}}>
        📍 {t("Manage Locations","இடங்களை நிர்வகி")}
      </div>

      {/* Existing locations */}
      {(locations||[]).length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:P.muted,fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>
            {t("Existing Locations","தற்போதுள்ள இடங்கள்")}
          </div>
          {(locations||[]).map(loc=>(
            <div key={loc.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,
              background:P.highlight,borderRadius:7,padding:"7px 10px"}}>
              {editId===loc.id?(
                <>
                  <input style={{...css.inp,flex:1,padding:"4px 8px"}} value={editF.name}
                    onChange={e=>setEditF(p=>({...p,name:e.target.value}))}
                    placeholder={t("English name","ஆங்கிலம்")} />
                  <input style={{...css.inp,flex:1,padding:"4px 8px",fontFamily:"Noto Sans Tamil"}} value={editF.nameTamil}
                    onChange={e=>setEditF(p=>({...p,nameTamil:e.target.value}))}
                    placeholder={t("Tamil name","தமிழ்")} />
                  <button style={css.btn("primary",true)} onClick={()=>saveEdit(loc.id)}>✓</button>
                  <button style={css.btn("ghost",true)} onClick={()=>setEditId(null)}>✕</button>
                </>
              ):(
                <>
                  <span style={{flex:1,fontWeight:600,color:P.deepBrown}}>{loc.name}</span>
                  <span style={{flex:1,color:P.muted,fontSize:12,fontFamily:"Noto Sans Tamil"}}>{loc.nameTamil||"—"}</span>
                  {usedLocIds.has(loc.id)&&<span style={{...css.badge(P.success),fontSize:10}}>in use</span>}
                  <button style={css.btn("ghost",true)} onClick={()=>startEdit(loc)}>✏️</button>
                  <button style={css.btn("danger",true)} onClick={()=>delLoc(loc.id)} disabled={usedLocIds.has(loc.id)} title={usedLocIds.has(loc.id)?"In use — cannot delete":"Delete"}>🗑</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new location */}
      <div style={{fontSize:11,color:P.muted,fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>
        {t("Add New Location","புதிய இடம் சேர்")}
      </div>
      <div style={css.g2}>
        <div>
          <label style={css.lbl}>{t("Name (English)","பெயர் (ஆங்கிலம்)")}</label>
          <input style={css.inp} value={f.name} placeholder="e.g. Dining Hall"
            onChange={e=>{setF(p=>({...p,name:e.target.value}));setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&addLoc()} />
        </div>
        <div>
          <label style={css.lbl}>{t("Name (Tamil)","பெயர் (தமிழ்)")}</label>
          <input style={{...css.inp,fontFamily:"Noto Sans Tamil"}} value={f.nameTamil} placeholder="e.g. சாப்பாட்டு மண்டபம்"
            onChange={e=>setF(p=>({...p,nameTamil:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&addLoc()} />
        </div>
      </div>
      {err&&<div style={{color:P.danger,fontSize:12,marginTop:4}}>{err}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
        <button style={css.btn("ghost")} onClick={onClose}>{t("Close","மூடு")}</button>
        <button style={css.btn()} onClick={addLoc}>+ {t("Add","சேர்")}</button>
      </div>
    </div>
  );
}


function OrderForm({ctx,ord,onClose}){
  const {recipes,locations,ingredients,setOrders,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;

  const [f,setF]=useState(()=>({
    name:"",date:TODAY,isTemplate:false,pax:"",...(ord||{}),
    entries:(ord?.entries||[]).map(e=>({...e,baseQty:e.baseQty??e.qty,basePax:e.basePax??ord?.pax??null}))
  }));
  const madalayam=locations.find(l=>(l.name||"").toLowerCase().includes("madalayam"));
  const [defLocId,setDefLocId]=useState(ord?.entries?.[0]?.locId?.toString()||madalayam?.id?.toString()||"");
  const [defSession,setDefSession]=useState(ord?.entries?.[0]?.session||"Breakfast");
  const [ne,setNe]=useState({recId:"",qty:""});
  const [recSearch,setRecSearch]=useState("");
  const [saveErr,setSaveErr]=useState("");
  const [entryErr,setEntryErr]=useState("");

  // When session changes — update ALL existing entries to new session
  const changeSession=(sess)=>{
    setDefSession(sess);
    setF(x=>({...x,entries:x.entries.map(e=>({...e,session:sess}))}));
  };

  const filteredRecs=recipes
    .filter(r=>!r.isSubRecipe)
    .filter(r=>{const q=recSearch.toLowerCase();return !q||r.name.toLowerCase().includes(q)||r.nameTamil.includes(recSearch);});

  // Scale all entries from their own locked baseQty/basePax — correct on every keystroke
  const changePax=(newPaxStr)=>{
    const np=+newPaxStr;
    setF(x=>({
      ...x,
      pax:newPaxStr,
      entries:x.entries.map(e=>{
        if(!e.basePax||!e.baseQty||np<=0)return e;
        return {...e, qty:+(e.baseQty*(np/e.basePax)).toFixed(3)};
      })
    }));
  };

  const addEntry=()=>{
    if(!defLocId){setEntryErr(t("Select a location","இடம் தேர்வு செய்யவும்"));return;}
    if(!ne.recId){setEntryErr(t("Select a recipe","சமையல் தேர்வு செய்யவும்"));return;}
    if(!ne.qty||+ne.qty<=0){setEntryErr(t("Enter a valid quantity","அளவு கொடுக்கவும்"));return;}
    setEntryErr("");
    const rec=recipes.find(r=>r.id===+ne.recId);
    const curPax=f.pax&&+f.pax>0?+f.pax:null;
    // Lock baseQty and basePax at the moment of adding
    const entry={
      locId:+defLocId,session:defSession,recId:+ne.recId,
      qty:+ne.qty,baseQty:+ne.qty,basePax:curPax,
      yu:rec?.yieldUnit||"kg"
    };
    setF(x=>({...x,entries:[...x.entries,entry]}));
    setNe(n=>({...n,qty:"",recId:""}));
    setRecSearch("");
  };

  const save=()=>{
    if(!f.name){setSaveErr(t("Please enter an order name","ஆர்டர் பெயர் கொடுக்கவும்"));return;}
    if(!f.isTemplate&&!f.date){setSaveErr(t("Please select a date","தேதி தேர்வு செய்யவும்"));return;}
    setSaveErr("");
    const toSave={...f,pax:f.pax?+f.pax:0};
    if(ord)setOrders(p=>p.map(o=>o.id===ord.id?{...toSave,id:ord.id}:o));
    else setOrders(p=>[...p,{...toSave,id:Date.now()}]);
    onClose();
  };

  const totalCost=f.entries.reduce((s,e)=>{
    const rec=recipes.find(r=>r.id===e.recId);
    return s+(rec?computeRecipeCost(rec,e.qty/(rec.yield||1),recipes,ingredients):0);
  },0);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown}}>{ord?t("Edit Order","திருத்து"):t("New Order","புதிய ஆர்டர்")}</div>
        <button style={css.btn("ghost",true)} onClick={onClose}>✕</button>
      </div>

      {/* ── Header row: name, date, persons ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,marginBottom:10,alignItems:"end"}}>
        <div>
          <label style={css.lbl}>{t("Order Name","பெயர்")}</label>
          <input style={css.inp} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
        </div>
        <div>
          <label style={css.lbl}>{t("Date","தேதி")}</label>
          <input type="date" style={css.inp} disabled={f.isTemplate} value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
        </div>
        <div style={{background:"#EFF6FF",border:"2px solid #3B82F6",borderRadius:8,padding:"8px 12px",minWidth:160}}>
          <label style={{...css.lbl,color:"#1E40AF"}}>👥 {t("No. of Persons","நபர் எண்ணிக்கை")}</label>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <input type="number" min="1" step="1"
              style={{...css.inp,width:80,fontWeight:700,fontSize:14,color:"#1E40AF",border:"none",background:"transparent",padding:"2px 4px"}}
              placeholder="—"
              value={f.pax}
              onChange={e=>changePax(e.target.value)}/>
            <span style={{fontSize:11,color:"#3B82F6",whiteSpace:"nowrap"}}>{t("persons","நபர்")}</span>
          </div>
          {f.entries.some(e=>e.basePax)&&(
            <div style={{fontSize:10,color:"#059669",marginTop:2}}>
              ✓ {t("Qtys scale as you type","தட்டச்சிட அளவுகள் மாறும்")}
            </div>
          )}
        </div>
      </div>

      {/* Order-level Location + Session */}
      <div style={{display:"flex",gap:12,alignItems:"center",background:P.highlight,padding:"8px 12px",borderRadius:8,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:180}}>
          <label style={{...css.lbl,margin:0,whiteSpace:"nowrap"}}>{t("Location","இடம்")}</label>
          <select style={{...css.sel,flex:1}} value={defLocId} onChange={e=>setDefLocId(e.target.value)}>
            <option value="">{t("-- Select --","-- தேர்வு --")}</option>
            {locations.map(l=><option key={l.id} value={l.id}>{lang==="en"?l.name:l.nameTamil}</option>)}
          </select>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:160}}>
          <label style={{...css.lbl,margin:0,whiteSpace:"nowrap"}}>{t("Session","அமர்வு")}</label>
          <select style={{...css.sel,flex:1}} value={defSession} onChange={e=>changeSession(e.target.value)}>
            {SESSIONS.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,cursor:"pointer",marginBottom:12}}>
        <input type="checkbox" checked={f.isTemplate} onChange={e=>setF({...f,isTemplate:e.target.checked,date:e.target.checked?"":f.date})}/>
        {t("Save as Template (no date)","மாதிரியாக சேமி")}
      </label>

      {/* ── Add Entry Row ── */}
      <div style={{...css.sHead}}>{t("Order Entries","பதிவுகள்")}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",padding:10,background:P.highlight,borderRadius:8,marginBottom:6}}>

        <div style={{display:"flex",flexDirection:"column",gap:4,flex:2,minWidth:180}}>
          <input style={{...css.inp,fontSize:11}} placeholder={t("Search recipe...","சமையல் தேடு...")} value={recSearch} onChange={e=>{setRecSearch(e.target.value);setNe(n=>({...n,recId:""}));}}/>
          <select style={{...css.sel,width:"100%"}} value={ne.recId} onChange={e=>setNe({...ne,recId:e.target.value})}>
            <option value="">{filteredRecs.length>0?t("Select from results...","தேர்வு..."):t("No match","பொருந்தவில்லை")}</option>
            {filteredRecs.map(r=><option key={r.id} value={r.id}>{lang==="en"?r.name:r.nameTamil}</option>)}
          </select>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:3,justifyContent:"center"}}>
          <label style={{...css.lbl,marginBottom:0}}>{t("Qty","அளவு")}{f.pax&&+f.pax>0?<span style={{color:"#3B82F6",marginLeft:4,fontSize:10}}>for {f.pax} persons</span>:""}</label>
          <input type="number" min="0" step="0.1" style={{...css.inp,width:80}} value={ne.qty} onChange={e=>setNe({...ne,qty:e.target.value})}/>
        </div>
        <button style={{...css.btn(),alignSelf:"flex-end"}} onClick={addEntry}>+ {t("Add","சேர்")}</button>
      </div>
      {entryErr&&<div style={{color:P.danger,fontSize:11,marginBottom:6,padding:"4px 8px",background:"#FEE2E2",borderRadius:5}}>⚠ {entryErr}</div>}

      {/* ── Entries Table ── */}
      {f.entries.length>0&&(
        <div style={{...css.card,padding:0,overflow:"hidden",marginBottom:14}}>
          <table style={css.table}>
            <thead><tr>
              <th style={css.th}>{t("Location","இடம்")}</th>
              <th style={css.th}>{t("Session","அமர்வு")}</th>
              <th style={css.th}>{t("Recipe","சமையல்")}</th>
              <th style={css.th}>{t("Qty","அளவு")}{f.pax&&+f.pax>0?<span style={{fontSize:10,fontWeight:400,marginLeft:4,opacity:0.8}}>/ {f.pax} persons</span>:""}</th>
              <th style={css.th}>{t("Est. Cost","மதிப்பீடு")}</th>
              <th style={css.th}></th>
            </tr></thead>
            <tbody>
              {f.entries.map((e,i)=>{
                const loc=locations.find(l=>l.id===e.locId);
                const rec=recipes.find(r=>r.id===e.recId);
                const lineCost=rec?computeRecipeCost(rec,e.qty/(rec.yield||1),recipes,ingredients):0;
                const scaled=e.basePax&&+f.pax>0&&+f.pax!==e.basePax;
                return(
                  <tr key={i} style={{background:i%2===0?P.white:P.highlight}}>
                    <td style={css.td}>{loc?(lang==="en"?loc.name:loc.nameTamil):"?"}</td>
                    <td style={css.td}><span style={css.badge(SCOLOR[e.session]||P.muted)}>{e.session}</span></td>
                    <td style={css.td}>{rec?(lang==="en"?rec.name:rec.nameTamil):"?"}</td>
                    <td style={css.td}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <input type="number" min="0" step="0.1"
                          style={{...css.inp,width:80,padding:"3px 6px",
                            fontWeight:scaled?700:400,
                            color:scaled?"#2563EB":"inherit",
                            border:scaled?"2px solid #93C5FD":"1px solid #DCC88A"}}
                          value={e.qty}
                          onChange={ev=>setF(x=>({...x,entries:x.entries.map((en,j)=>j===i?{...en,qty:+ev.target.value,baseQty:+ev.target.value,basePax:+f.pax||en.basePax}:en)}))}/>
                        <span style={{fontSize:11,color:P.muted}}>{e.yu}</span>
                        {scaled&&<span style={{fontSize:10,color:"#6B7280"}}>({e.baseQty}@{e.basePax})</span>}
                      </div>
                    </td>
                    <td style={css.td}>{lineCost>0?<strong style={{color:P.success}}>₹{lineCost.toFixed(0)}</strong>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}><button style={css.btn("danger",true)} onClick={()=>setF(x=>({...x,entries:x.entries.filter((_,j)=>j!==i)}))}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalCost>0&&(
            <div style={{padding:"8px 14px",background:P.success+"18",borderTop:`1px solid ${P.success}33`,fontSize:13,fontWeight:700,color:P.success,textAlign:"right"}}>
              📐 {t("Estimated Total Cost","மதிப்பீட்டு மொத்த செலவு")}: ₹{totalCost.toFixed(0)}
              {f.pax&&+f.pax>0&&<span style={{fontSize:11,fontWeight:400,marginLeft:8,color:P.muted}}>({f.pax} {t("persons","நபர்")} — ₹{(totalCost/+f.pax).toFixed(1)}/{t("person","நபர்")})</span>}
            </div>
          )}
        </div>
      )}

      {saveErr&&<div style={{color:P.danger,fontSize:11,marginBottom:8,padding:"4px 8px",background:"#FEE2E2",borderRadius:5,textAlign:"right"}}>⚠ {saveErr}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={css.btn("ghost")} onClick={onClose}>{t("Cancel","ரத்து")}</button>
        <button style={css.btn()} onClick={save}>💾 {t("Save Order","சேமி")}</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// REPORT: DISH-WISE INGREDIENTS
// ════════════════════════════════════════════════════════════════════
function RepDish({ctx}){
  const {orders,recipes,ingredients,lang:gLang,setModal}=ctx;
  const [rLang,setRLang]=useState(gLang);
  // Fix: fallback to English name if Tamil is blank
  const t=(en,ta)=>rLang==="en"?en:ta;
  const n=(x)=>rLang==="en"?x.name:((x.nameTamil&&x.nameTamil.trim())?x.nameTamil:x.name);
  const [dt,setDt]=useState(TODAY);
  const [activeSess,setActiveSess]=useState("All");

  const entries=orders.filter(o=>!o.isTemplate&&o.date===dt).flatMap(o=>o.entries.map(e=>({...e,_order:o})));

  // Sort: grocery/spice=0, other=1, vegetable=2, sub=9
  const CAT_SORT={grocery:0,spice:0,other:1,cut:1,vegetable:2,sub:9};
  const sortIngs=(ings)=>[...ings].sort((a,b)=>{
    const ca=CAT_SORT[a.d.category]??1;
    const cb=CAT_SORT[b.d.category]??1;
    if(ca!==cb)return ca-cb;
    return n(a.d).trim().localeCompare(n(b.d).trim());
  });

  // Name→recipe lookup for sub-recipe detection
  const recByNameLC=new Map(recipes.map(r=>[r.name.toLowerCase().trim(),r]));

  const sessData=SESSIONS.map(sess=>{
    const sessEntries=entries.filter(e=>e.session===sess);
    const byRec={};
    sessEntries.forEach(e=>{
      const rec=recipes.find(r=>r.id===e.recId); if(!rec)return;
      if(!byRec[e.recId])byRec[e.recId]={rec,totalQty:0,totalMult:0};
      byRec[e.recId].totalMult+=e.qty/(rec.yield||1);
      byRec[e.recId].totalQty+=e.qty;
    });
    const recs=Object.values(byRec).map(item=>{
      const rawIngs=sortIngs(mergeIngs(expandRecipeIngs(item.rec,item.totalMult,recipes,ingredients,false)));
      // Detect sub-recipes: either flagged isSubRecipe OR ingredient name matches a recipe
      const seen=new Set();
      const subSections=[];
      rawIngs.forEach(r=>{
        const matchRec=r.isSubRecipe
          ?recipes.find(x=>x.name===r.d.name)
          :recByNameLC.get(r.d.name.toLowerCase().trim());
        if(matchRec&&!seen.has(matchRec.id)){
          seen.add(matchRec.id);
          subSections.push({
            d:{...r.d,name:matchRec.name,nameTamil:matchRec.nameTamil||r.d.nameTamil,isSubRecipe:true},
            qty:r.qty,unit:r.unit,
            ings:sortIngs(mergeIngs(expandRecipeIngs(matchRec,r.qty/(matchRec.yield||1),recipes,ingredients,false)))
          });
        }
      });
      // Mark ingredient rows that are sub-recipes
      const ings=rawIngs.map(r=>{
        const isSub=r.isSubRecipe||recByNameLC.has(r.d.name.toLowerCase().trim());
        return isSub?{...r,isSubRecipe:true,d:{...r.d,isSubRecipe:true}}:r;
      });
      return{...item,ings,subSections};
    });
    return{session:sess,recs};
  }).filter(sd=>sd.recs.length>0);

  const visibleSess=activeSess==="All"?sessData:sessData.filter(sd=>sd.session===activeSess);
  const hasData=visibleSess.length>0;

  // Print font includes Noto Sans Tamil for Tamil rendering
  const PRINT_FONTS='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap"/>';

  const printSession=(sd)=>{
    let recNo=0;
    const recBlocks=sd.recs.map(({rec,totalQty,ings,subSections})=>{
      recNo++;
      const ingRows=ings.map((r,i)=>{
        const isSub=r.isSubRecipe;
        const name=n(r.d)+(isSub?' *':'');
        return `<tr>
          <td style="width:28px;text-align:right;padding:3px 6px 3px 0;color:#666;font-size:12px">${i+1}</td>
          <td style="padding:3px 4px;font-size:13px;font-weight:${isSub?'700':'500'}">${name}</td>
          <td style="padding:3px 0 3px 4px;text-align:right;font-size:13px;font-weight:700;white-space:nowrap">${r.qty.toFixed(3)} ${r.unit}</td>
        </tr>`;
      }).join('');

      const subBlocks=(subSections||[]).map(({d,qty,unit,ings:sings})=>{
        recNo++;
        const srows=sings.map((r,i)=>`<tr>
          <td style="width:28px;text-align:right;padding:3px 6px 3px 0;color:#666;font-size:12px">${i+1}</td>
          <td style="padding:3px 4px;font-size:13px;font-weight:500">${n(r.d)}</td>
          <td style="padding:3px 0 3px 4px;text-align:right;font-size:13px;font-weight:700;white-space:nowrap">${r.qty.toFixed(3)} ${r.unit}</td>
        </tr>`).join('');
        return `<div style="margin:6px 0 8px 24px;border-left:2px solid #999;padding-left:10px">
          <div style="display:flex;align-items:baseline;border-bottom:1px solid #BBB;padding-bottom:3px;margin-bottom:4px">
            <span style="font-size:14px;font-weight:700;flex:1">${n(d)} *</span>
            <span style="font-size:15px;font-weight:800">${qty.toFixed(3)} ${unit}</span>
          </div>
          ${sings.length?`<table style="width:100%;border-collapse:collapse"><tbody>${srows}</tbody></table>`:''}
        </div>`;
      }).join('');

      return `<div style="margin-bottom:12px">
        <div style="display:flex;align-items:baseline;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:6px">
          <span style="font-size:13px;font-weight:600;color:#555;margin-right:6px">${recNo}</span>
          <span style="font-size:16px;font-weight:700;flex:1">${n(rec)}</span>
          <span style="font-size:18px;font-weight:800">${totalQty.toFixed(3)} ${rec.yieldUnit}</span>
        </div>
        ${ings.length?`<table style="width:100%;border-collapse:collapse"><tbody>${ingRows}</tbody></table>`:''}
        ${subBlocks}
      </div>`;
    }).join('');

    printHTML(
      sd.session+' — '+t('Dish-wise Ingredients','சமையல் வாரியாக பொருட்கள்')+' ('+dt+')',
      `<p style="font-size:12px;color:#555;margin:0 0 16px">${t('Date','தேதி')}: ${dt}</p>${recBlocks}`,
      PRINT_FONTS
    );
  };

  const exportSession=(sd)=>{
    const rows=[];
    sd.recs.forEach(({rec,totalQty,ings,subSections})=>{
      rows.push({[t('Recipe','சமையல்')]:'▶ '+n(rec)+' ('+totalQty.toFixed(3)+' '+rec.yieldUnit+')',Quantity:'',Unit:''});
      ings.forEach(r=>rows.push({[t('Recipe','சமையல்')]:'  '+(r.isSubRecipe?'* ':'')+n(r.d),Quantity:+r.qty.toFixed(3),Unit:r.unit}));
      (subSections||[]).forEach(({d,qty,unit,ings:sings})=>{
        rows.push({[t('Recipe','சமையல்')]:'  ▶ * '+n(d)+' ('+qty.toFixed(3)+' '+unit+')',Quantity:'',Unit:''});
        sings.forEach(r=>rows.push({[t('Recipe','சமையல்')]:'    '+n(r.d),Quantity:+r.qty.toFixed(3),Unit:r.unit}));
      });
      rows.push({[t('Recipe','சமையல்')]:'',Quantity:'',Unit:''});
    });
    exportXlsxSheets('dish_ingredients_'+sd.session+'_'+dt+'.xlsx',[{name:sd.session.slice(0,31),data:rows}]);
  };

  // Ingredient row — screen display
  const IngRow=({num,name,qty,unit,isSub,shade})=>(
    <div style={{display:'flex',alignItems:'baseline',padding:'3px 6px',
      background:shade?'#F5F5F5':'white',borderBottom:'1px solid #E8E8E8',
      borderLeft:isSub?'3px solid #444':'none'}}>
      <span style={{fontSize:11,color:'#888',width:22,flexShrink:0,textAlign:'right',marginRight:8}}>{num}</span>
      <span style={{fontSize:13,fontWeight:isSub?700:500,color:'#111',flex:1}}>{name}{isSub?' *':''}</span>
      <span style={{fontSize:13,fontWeight:700,color:'#111',whiteSpace:'nowrap',paddingLeft:12}}>{qty.toFixed(3)} {unit}</span>
    </div>
  );

  return(
    <div>
      <ReportBar onPrint={null} onExport={null} lang={rLang} setLang={setRLang}>
        <div><label style={css.lbl}>{t('Date','தேதி')}</label><input type="date" style={{...css.inp,width:160}} value={dt} onChange={e=>setDt(e.target.value)}/></div>
        {entries.length>0&&<button style={css.btn('info',true)} onClick={()=>setModal({type:'postIssues',date:dt})}>📦 {t('Post Issues','சரக்கு போடு')}</button>}
      </ReportBar>
      {/* Session filter tabs */}
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {['All',...SESSIONS].map(s=>{
          const has=s==='All'?sessData.length>0:sessData.some(sd=>sd.session===s);
          if(!has&&s!=='All')return null;
          return(<button key={s} style={{...css.btn(activeSess===s?'primary':'ghost',true),
            borderColor:s!=='All'?(SCOLOR[s]||P.muted):'#DCC88A',
            color:activeSess===s?'white':(s!=='All'?SCOLOR[s]:P.deepBrown),
            background:activeSess===s?(SCOLOR[s]||P.saffron):'transparent',
          }} onClick={()=>setActiveSess(s)}>{s==='All'?t('All Sessions','அனைத்து'):s}</button>);
        })}
      </div>
      {!hasData&&<div style={{color:P.muted,textAlign:'center',padding:24}}>{t('No orders for this date.','இந்த தேதியில் ஆர்டர் இல்லை.')}</div>}
      {visibleSess.map(sd=>(
        <div key={sd.session} style={{...css.card,marginBottom:16,border:'1px solid #333'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{background:'#222',color:'white',fontWeight:700,fontSize:14,padding:'5px 16px',borderRadius:6}}>{sd.session}</span>
              <span style={{fontSize:12,color:'#555'}}>{dt}</span>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button style={css.btn('ghost',true)} onClick={()=>exportSession(sd)}>📥 {t('Excel','எக்செல்')}</button>
              <button style={css.btn('primary',true)} onClick={()=>printSession(sd)}>🖨 {t('Print','அச்சு')}</button>
            </div>
          </div>
          {sd.recs.map(({rec,totalQty,ings,subSections},ri)=>(
            <div key={rec.id} style={{marginBottom:20}}>
              <div style={{display:'flex',alignItems:'baseline',gap:8,borderBottom:'2px solid #111',paddingBottom:5,marginBottom:6}}>
                <span style={{fontSize:11,color:'#777',fontWeight:600,minWidth:20}}>{ri+1}</span>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:'#111',flex:1}}>{n(rec)}</span>
                <span style={{fontSize:18,fontWeight:800,color:'#111',whiteSpace:'nowrap'}}>{totalQty.toFixed(3)} {rec.yieldUnit}</span>
              </div>
              <div style={{border:'1px solid #DDD',borderRadius:4,overflow:'hidden',marginBottom:subSections&&subSections.length?6:0}}>
                {ings.map((row,i)=><IngRow key={row.d.id} num={i+1} name={n(row.d)} qty={row.qty} unit={row.unit} isSub={row.isSubRecipe} shade={i%2===1}/>)}
              </div>
              {(subSections||[]).map(({d,qty,unit,ings:sings})=>(
                <div key={d.id} style={{marginBottom:6,marginLeft:20,borderLeft:'2px solid #888',padding:'6px 10px',background:'#FAFAFA',borderRadius:'0 4px 4px 0'}}>
                  <div style={{display:'flex',alignItems:'baseline',gap:8,borderBottom:'1px solid #AAA',paddingBottom:3,marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,flex:1}}>{n(d)} *</span>
                    <span style={{fontSize:14,fontWeight:800,whiteSpace:'nowrap'}}>{qty.toFixed(3)} {unit}</span>
                  </div>
                  <div style={{border:'1px solid #DDD',borderRadius:4,overflow:'hidden'}}>
                    {sings.map((row,i)=><IngRow key={row.d.id} num={i+1} name={n(row.d)} qty={row.qty} unit={row.unit} isSub={false} shade={i%2===1}/>)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function RepIng({ctx}){
  const {orders,recipes,ingredients,lang:gLang}=ctx;
  const [rLang,setRLang]=useState(gLang);
  const t=(en,ta)=>rLang==="en"?en:ta;
  const n=(x)=>rLang==="en"?x.name:((x.nameTamil&&x.nameTamil.trim())?x.nameTamil:x.name);
  const [dt,setDt]=useState(TODAY);
  const [activeSess,setActiveSess]=useState("All");

  const entries=orders.filter(o=>!o.isTemplate&&o.date===dt).flatMap(o=>o.entries.map(e=>({...e,_order:o})));

  // Build session → ingredient → dishes
  const sessData=SESSIONS.map(sess=>{
    const sessEntries=entries.filter(e=>e.session===sess);
    const rows=computeTotals(sessEntries,recipes,ingredients,undefined,true); // expand sub-recipes to raw ingredients
    const byIng={};
    rows.forEach(r=>{
      if(!byIng[r.d.id])byIng[r.d.id]={d:r.d,total:0,unit:r.unit,dishes:{}};
      byIng[r.d.id].total+=r.qty;
      if(!byIng[r.d.id].dishes[r.recId])byIng[r.d.id].dishes[r.recId]={name:r.recName,nameT:r.recNameT,qty:0,unit:r.unit};
      byIng[r.d.id].dishes[r.recId].qty+=r.qty;
    });
    const ings=Object.values(byIng).sort((a,b)=>a.d.category.localeCompare(b.d.category));
    return {session:sess,ings};
  }).filter(sd=>sd.ings.length>0);

  const visibleSess=activeSess==="All"?sessData:sessData.filter(sd=>sd.session===activeSess);
  const hasData=visibleSess.length>0;

  const printSession=(sd)=>{
    const trows=sd.ings.map(row=>{
      const dishList=Object.values(row.dishes).map(d=>(rLang==="en"?d.name:d.nameT)+": "+d.qty.toFixed(2)+" "+d.unit).join(", ");
      return "<tr><td><strong>"+(rLang==="en"?row.d.name:row.d.nameTamil)+"</strong></td>"
        +"<td>"+row.d.category+"</td>"
        +"<td style='font-size:11px;color:#555'>"+dishList+"</td>"
        +"<td><strong>"+row.total.toFixed(2)+" "+row.unit+"</strong></td></tr>";
    }).join("");
    const thead="<thead><tr><th>"+t("Ingredient","பொருள்")+"</th><th>"+t("Category","வகை")+"</th><th>"+t("Used In","பயன்படுத்திய சமையல்")+"</th><th>"+t("Total Qty","மொத்த அளவு")+"</th></tr></thead>";
    printHTML(sd.session+" — "+t("Ingredient-wise Dishes","பொருள் வாரியாக சமையல்")+" ("+dt+")",
      "<h2 style='border:none;margin:0 0 4px'>"+sd.session+"</h2><p style='color:#9B7355;margin:0 0 12px;font-size:12px'>"+t("Date","தேதி")+": "+dt+" &nbsp;|&nbsp; "+sd.ings.length+" "+t("ingredient(s)","பொருட்கள்")+"</p>"
      +"<table>"+thead+"<tbody>"+trows+"</tbody></table>");
  };

  const exportSession=(sd)=>{
    // Group by category, category as heading row, ingredients below
    const cats=[...new Set(sd.ings.map(r=>r.d.category))].sort();
    const rows=[];
    cats.forEach((cat,ci)=>{
      rows.push({"Category / Ingredient":"▶ "+cat.toUpperCase(),"Used In Dishes":"","Total Qty":"",Unit:""});
      sd.ings.filter(r=>r.d.category===cat).forEach(row=>{
        const usedIn=Object.values(row.dishes).map(d=>d.name+": "+d.qty.toFixed(2)+" "+d.unit).join("; ");
        rows.push({
          "Category / Ingredient":"    "+n(row.d),
          "Used In Dishes":usedIn,
          "Total Qty":+row.total.toFixed(2),
          Unit:row.unit,
        });
      });
      if(ci<cats.length-1)rows.push({"Category / Ingredient":"","Used In Dishes":"","Total Qty":"",Unit:""});
    });
    exportXlsxSheets("ingredient_dishes_"+sd.session+"_"+dt+".xlsx",[{name:sd.session.slice(0,31),data:rows}]);
  };

  return(
    <div>
      <ReportBar onPrint={null} onExport={null} lang={rLang} setLang={setRLang}>
        <div><label style={css.lbl}>{t("Date","தேதி")}</label><input type="date" style={{...css.inp,width:160}} value={dt} onChange={e=>setDt(e.target.value)}/></div>
      </ReportBar>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {["All",...SESSIONS].map(s=>{
          const has=s==="All"?sessData.length>0:sessData.some(sd=>sd.session===s);
          if(!has&&s!=="All")return null;
          return(<button key={s} style={{...css.btn(activeSess===s?"primary":"ghost",true),
            borderColor:s!=="All"?(SCOLOR[s]||P.muted):"#DCC88A",
            color:activeSess===s?"white":(s!=="All"?SCOLOR[s]:P.deepBrown),
            background:activeSess===s?(SCOLOR[s]||P.saffron):"transparent",
          }} onClick={()=>setActiveSess(s)}>{s==="All"?t("All Sessions","அனைத்து"):s}</button>);
        })}
      </div>
      {!hasData&&<div style={{color:P.muted,textAlign:"center",padding:24}}>{t("No orders for this date.","இந்த தேதியில் ஆர்டர் இல்லை.")}</div>}
      {visibleSess.map(sd=>(
        <div key={sd.session} style={{...css.card,marginBottom:16}}>
          {/* Session header with print/export buttons */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{...css.badge(SCOLOR[sd.session]||P.muted),fontSize:14,padding:"5px 16px"}}>{sd.session}</span>
              <span style={{fontSize:12,color:P.muted}}>{dt}</span>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={css.btn("ghost",true)} onClick={()=>exportSession(sd)}>📥 {t("Excel","எக்செல்")}</button>
              <button style={css.btn("primary",true)} onClick={()=>printSession(sd)}>🖨 {t("Print","அச்சு")}</button>
            </div>
          </div>
          {/* Ingredient table for this session */}
          <table style={css.table}>
            <thead><tr>
              <th style={css.th}>{t("Ingredient","பொருள்")}</th>
              <th style={css.th}>{t("Category","வகை")}</th>
              <th style={css.th}>{t("Used In","பயன்படுத்திய சமையல்")}</th>
              <th style={css.th}>{t("Total Qty","மொத்த அளவு")}</th>
            </tr></thead>
            <tbody>{sd.ings.map((row,i)=>(
              <tr key={row.d.id} style={{background:i%2===0?P.white:P.highlight}}>
                <td style={css.td}><strong>{n(row.d)}</strong></td>
                <td style={css.td}><span style={css.badge(CATCOLOR[row.d.category]||P.muted)}>{row.d.category}</span></td>
                <td style={{...css.td,fontSize:11}}>
                  {Object.values(row.dishes).map((d,j)=>(
                    <div key={j} style={{lineHeight:1.7}}>
                      {rLang==="en"?d.name:d.nameT}
                      <span style={{color:P.saffron,marginLeft:4,fontWeight:600}}>{d.qty.toFixed(2)} {d.unit}</span>
                    </div>
                  ))}
                </td>
                <td style={css.td}><strong style={{color:P.saffron,fontSize:13}}>{row.total.toFixed(2)} {row.unit}</strong></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// REPORT: SHOPPING LIST
// ════════════════════════════════════════════════════════════════════
function RepShop({ctx}){
  const {orders,recipes,ingredients,inventory,lang:gLang}=ctx;
  const [rLang,setRLang]=useState(gLang);
  const t=(en,ta)=>rLang==="en"?en:ta;
  const n=(x)=>rLang==="en"?x.name:((x.nameTamil&&x.nameTamil.trim())?x.nameTamil:x.name);
  const [fromDate,setFromDate]=useState(TODAY);
  const [toDate,setToDate]=useState(TODAY);
  // Ingredients to exclude from purchase order (AC pre-cut veg, Milk, etc.)
  const EXCLUDE_PREFIXES=["AC ","AC-"];
  const EXCLUDE_NAMES=["milk","water for dal","water"];
  const isExcluded=(name)=>{
    const n=(name||"").toLowerCase().trim();
    if(EXCLUDE_NAMES.includes(n))return true;
    if(EXCLUDE_PREFIXES.some(p=>name.startsWith(p)))return true;
    return false;
  };

  const sortedDates=useMemo(()=>{
    const dates=[]; const start=new Date(fromDate); const end=new Date(toDate);
    if(start>end)return[fromDate];
    const cur=new Date(start);
    while(cur<=end){dates.push(cur.toISOString().slice(0,10));cur.setDate(cur.getDate()+1);}
    return dates;
  },[fromDate,toDate]);

  const getStock=iid=>{
    const bought=inventory.purchases.filter(x=>x.iid===iid).reduce((s,x)=>s+x.qty,0);
    const used=inventory.issues.filter(x=>x.iid===iid).reduce((s,x)=>s+x.qty,0);
    return bought-used;
  };

  // Category order: grocery first, then spice, then vegetable, then other
  const CATS=["grocery","spice","vegetable","other"];
  const CATICON={grocery:"🛒",spice:"🌶️",vegetable:"🥬",other:"📦"};
  const CATLABEL={grocery:"Grocery",spice:"Spice",vegetable:"Vegetable",other:"Other"};

  // Build data per session filter + "All"
  const SESSION_OPTS=["All",...SESSIONS];

  // Compute ingredient totals for a given session filter and date list
  // Normalise qty to ingredient's base unit to avoid mixing g/kg, ml/L
  const cvtUnit=(qty,from,to)=>{
    if(!from||!to||from===to)return qty;
    if(from==="g"&&to==="kg")return qty/1000;
    if(from==="kg"&&to==="g")return qty*1000;
    if(from==="ml"&&to==="L")return qty/1000;
    if(from==="L"&&to==="ml")return qty*1000;
    return qty;
  };
  const buildData=(sessFilter)=>{
    const byDate={};
    sortedDates.forEach(dt=>{
      byDate[dt]={};
      const ents=orders.filter(o=>!o.isTemplate&&o.date===dt)
        .flatMap(o=>o.entries.filter(e=>sessFilter==="All"||e.session===sessFilter).map(e=>({...e,_order:o})));
      computeTotals(ents,recipes,ingredients).forEach(r=>{
        const id=r.d.id;
        const baseUnit=r.d.unit||r.unit;
        if(!byDate[dt][id])byDate[dt][id]={d:r.d,qty:0,unit:baseUnit};
        byDate[dt][id].qty+=cvtUnit(r.qty,r.unit,baseUnit);
      });
    });
    const combined={};
    sortedDates.forEach(dt=>{
      Object.values(byDate[dt]).forEach(r=>{
        if(!combined[r.d.id])combined[r.d.id]={d:r.d,qty:0,unit:r.unit};
        combined[r.d.id].qty+=cvtUnit(r.qty,r.unit,combined[r.d.id].unit);
      });
    });
    const allIngIds=[...new Set(sortedDates.flatMap(dt=>Object.keys(byDate[dt]).map(Number)))];
    const allIngs=allIngIds
      .map(id=>ingredients.find(x=>x.id===id)).filter(Boolean)
      .filter(ing=>!isExcluded(ing.name))
      .sort((a,b)=>CATS.indexOf(a.category)-CATS.indexOf(b.category)||a.name.localeCompare(b.name));
    return {byDate,combined,allIngs};
  };

  const exportPurchaseOrder=()=>{
    const {allIngs,combined,byDate}=buildData("All");
    if(!allIngs.length){alert("No ingredients found for selected dates.");return;}

    // Build rows with SheetJS formula for To Order column
    const dateLabel=fromDate===toDate?fromDate:fromDate+" to "+toDate;
    const title=t("Purchase Order","கொள்முதல் ஆர்டர்")+" — "+dateLabel;

    // Track row number for formulas (1-indexed, header=1, col headers=2, data from 3)
    const rows=[];
    const catOrder=["grocery","spice","other","vegetable","cut"];
    const catLabel={grocery:"Grocery",spice:"Spice",other:"Other",vegetable:"Vegetable",cut:"Cut Veg"};

    // Collect columns: Name | Unit | date1 | date2... | Total | Available | To Order
    const dateCols=sortedDates;
    const totalCol=dateCols.length+3; // 1=Name, 2=Unit, then dates, then Total
    const availCol=totalCol+1;
    const orderCol=availCol+1;

    // Helper to get Excel column letter
    const colLetter=n=>{let s="";while(n>0){s=String.fromCharCode(64+(n%26||26))+s;n=Math.floor((n-1)/26);}return s;};

    let rowNum=2; // start after header row

    CATS.forEach(cat=>{
      const ings=allIngs.filter(x=>x.category===cat);
      if(!ings.length)return;

      // Category header row
      const catRow={Name:"▶ "+catLabel[cat].toUpperCase(),Unit:""};
      dateCols.forEach(d=>{catRow[d]="";});
      catRow[t("Total Needed","மொத்தம்")]="";
      catRow[t("Available","கையிருப்பு")]="";
      catRow[t("To Order","வாங்க")]="";
      rows.push(catRow); rowNum++;

      ings.forEach(ing=>{
        const tot=combined[ing.id]?.qty||0;
        const unit=combined[ing.id]?.unit||ing.unit;
        const row={Name:n(ing),Unit:unit};
        dateCols.forEach(d=>{const v=byDate[d][ing.id];row[d]=v?+v.qty.toFixed(3):""});
        row[t("Total Needed","மொத்தம்")]=+tot.toFixed(3);
        row[t("Available","கையிருப்பு")]=""; // blank for manual entry
        // Formula: To Order = Total - Available (if Available is blank, =Total)
        const totCell=colLetter(totalCol)+rowNum;
        const avlCell=colLetter(availCol)+rowNum;
        row[t("To Order","வாங்க")]={f:`IF(${avlCell}="",${totCell},MAX(0,${totCell}-${avlCell}))`};
        rows.push(row); rowNum++;
      });

      // Blank separator
      const blankRow={Name:"",Unit:""};
      dateCols.forEach(d=>{blankRow[d]="";});
      blankRow[t("Total Needed","மொத்தம்")]="";
      blankRow[t("Available","கையிருப்பு")]="";
      blankRow[t("To Order","வாங்க")]="";
      rows.push(blankRow); rowNum++;
    });

    const ws=XLSX.utils.json_to_sheet(rows);
    // Style-ish: set column widths
    ws["!cols"]=[{wch:30},{wch:8},...dateCols.map(()=>({wch:10})),{wch:14},{wch:14},{wch:12}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Purchase Order");
    XLSX.writeFile(wb,"purchase_order_"+fromDate+(fromDate!==toDate?"_to_"+toDate:"")+".xlsx");
  };

  const exportSession=(sessFilter)=>{
    const {byDate,combined,allIngs}=buildData(sessFilter);
    if(!allIngs.length)return;
    const rows=[];
    // Column layout: Category | Ingredient | date cols... | Total | Unit | In Stock | To Buy
    CATS.forEach((cat,ci)=>{
      const ings=allIngs.filter(x=>x.category===cat);
      if(!ings.length)return;
      // Category heading row — name in Category col, ingredient col blank
      const headRow={Category:"▶ "+CATLABEL[cat].toUpperCase(),[t("Ingredient","பொருள்")]:"",Unit:""};
      sortedDates.forEach(dt=>{headRow[dt]="";});
      headRow["Total"]=""; headRow["In Stock"]=""; headRow["To Buy"]="";
      rows.push(headRow);
      // Ingredient rows — category col blank, name in Ingredient col
      ings.forEach(ing=>{
        const tot=combined[ing.id]?.qty||0;
        const unit=combined[ing.id]?.unit||ing.unit;
        const stk=getStock(ing.id);
        const row={Category:"",[t("Ingredient","பொருள்")]:n(ing),Unit:unit};
        sortedDates.forEach(dt=>{const v=byDate[dt][ing.id];row[dt]=v?+v.qty.toFixed(2):0;});
        row["Total"]=+tot.toFixed(2);
        row["In Stock"]=+stk.toFixed(2);
        row["To Buy"]=+Math.max(0,tot-stk).toFixed(2);
        rows.push(row);
      });
      // Blank separator between categories
      if(ci<CATS.length-1)rows.push({Category:"",[t("Ingredient","பொருள்")]:"",Unit:"",Total:"","In Stock":"","To Buy":""});
    });
    const label=sessFilter==="All"?"All_Sessions":sessFilter;
    exportXlsxSheets("shopping_"+label+"_"+sortedDates[0]+".xlsx",[{name:label.slice(0,31),data:rows}]);
  };

  // Active session tab
  const [activeTab,setActiveTab]=useState("All");
  const {byDate,combined,allIngs}=useMemo(()=>buildData(activeTab),[activeTab,sortedDates,orders,recipes,ingredients]);
  const hasData=allIngs.length>0;

  return(
    <div>
      <ReportBar onPrint={null} onExport={null} lang={rLang} setLang={setRLang}>
        <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div>
            <label style={css.lbl}>{t("From","இருந்து")}</label>
            <input type="date" style={{...css.inp,width:148}} value={fromDate}
              onChange={e=>{setFromDate(e.target.value);if(e.target.value>toDate)setToDate(e.target.value);}}/>
          </div>
          <div>
            <label style={css.lbl}>{t("To","வரை")}</label>
            <input type="date" style={{...css.inp,width:148}} value={toDate}
              onChange={e=>{setToDate(e.target.value);if(e.target.value<fromDate)setFromDate(e.target.value);}}/>
          </div>
          <div style={{fontSize:11,color:P.muted,paddingBottom:6}}>
            {sortedDates.length} {t("day(s)","நாள்")}
          </div>
        </div>
      </ReportBar>

      {/* Session tabs */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {SESSION_OPTS.map(s=>(
          <button key={s} style={{
            ...css.btn(activeTab===s?"primary":"ghost",true),
            borderColor:s!=="All"?(SCOLOR[s]||P.muted):"#DCC88A",
            color:activeTab===s?undefined:(s!=="All"?SCOLOR[s]:P.deepBrown),
            fontWeight:activeTab===s?700:400,
          }} onClick={()=>setActiveTab(s)}>{s==="All"?t("All Sessions","அனைத்து அமர்வு"):s}</button>
        ))}
      </div>

      {!hasData&&(
        <div style={{color:P.muted,textAlign:"center",padding:32}}>
          {t("No orders for the selected dates / session.","தேர்ந்த தேதிகளில் ஆர்டர் இல்லை.")}
        </div>
      )}

      {hasData&&(
        <>
          {/* Print/Export buttons for this session */}
          <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginBottom:10}}>
            <button style={{...css.btn("success",true),fontWeight:700}} onClick={exportPurchaseOrder}>📋 {t("Purchase Order","கொள்முதல் ஆர்டர்")}</button>
            <button style={css.btn("ghost",true)} onClick={()=>exportSession(activeTab)}>📥 {t("Excel","எக்செல்")}</button>
            <button style={css.btn("primary",true)} onClick={()=>{
              const dateCols=sortedDates.map(d=>"<th style='text-align:right'>"+d.slice(5)+"</th>").join("");
              const catBlocks=CATS.map(cat=>{
                const ings=allIngs.filter(x=>x.category===cat);
                if(!ings.length)return "";
                const rows=ings.map(ing=>{
                  const tot=combined[ing.id]?.qty||0;
                  const unit=combined[ing.id]?.unit||ing.unit;
                  const stk=getStock(ing.id);
                  const tb=Math.max(0,tot-stk);
                  const cells=sortedDates.map(dt=>{const v=byDate[dt][ing.id];return"<td style='text-align:right'>"+(v?v.qty.toFixed(2)+" "+v.unit:"—")+"</td>";}).join("");
                  return"<tr><td><strong>"+n(ing)+"</strong></td>"+cells
                    +"<td style='text-align:right;background:#fffbe8'><strong>"+tot.toFixed(2)+" "+unit+"</strong></td>"
                    +"<td style='text-align:right'>"+stk.toFixed(2)+" "+unit+"</td>"
                    +"<td style='text-align:right;color:"+(tb>0?"#C0392B":"#1A7A40")+"'><strong>"+(tb>0?tb.toFixed(2)+" "+unit:"✓ OK")+"</strong></td></tr>";
                }).join("");
                return"<h3>"+CATICON[cat]+" "+CATLABEL[cat]+"</h3>"
                  +"<table><thead><tr><th>"+t("Ingredient","பொருள்")+"</th>"+dateCols
                  +"<th style='text-align:right'>"+t("Total","மொத்தம்")+"</th>"
                  +"<th style='text-align:right'>"+t("In Stock","கையிருப்பு")+"</th>"
                  +"<th style='text-align:right'>"+t("To Buy","வாங்க")+"</th>"
                  +"</tr></thead><tbody>"+rows+"</tbody></table>";
              }).join("");
              const label=activeTab==="All"?t("All Sessions","அனைத்து அமர்வு"):activeTab;
              printHTML("Shopping List — "+label+" ("+sortedDates.join(", ")+")",
                "<p style='color:#9B7355;margin:0 0 12px;font-size:12px'>"+t("Session","அமர்வு")+": "+label+" | "+t("Dates","தேதிகள்")+": "+sortedDates.join(" · ")+"</p>"+catBlocks);
            }}>🖨 {t("Print","அச்சு")}</button>
          </div>

          {/* Category cards */}
          {CATS.map(cat=>{
            const ings=allIngs.filter(x=>x.category===cat);
            if(!ings.length)return null;
            return(
              <div key={cat} style={css.card}>
                <div style={css.sHead}>{CATICON[cat]} {CATLABEL[cat]}</div>
                <div style={{overflowX:"auto"}}>
                  <table style={css.table}>
                    <thead>
                      <tr>
                        <th style={{...css.th,paddingLeft:0,background:"transparent",color:P.muted,fontSize:10,fontWeight:400}}>{t("Name","பெயர்")}</th>
                        {sortedDates.map(dt=>(
                          <th key={dt} style={{...css.th,textAlign:"right",minWidth:80}}>{dt.slice(5)}</th>
                        ))}
                        <th style={{...css.th,textAlign:"right",background:"#7C4A00",minWidth:80}}>{t("Total","மொத்தம்")}</th>
                        <th style={{...css.th,textAlign:"right",minWidth:80}}>{t("In Stock","கையிருப்பு")}</th>
                        <th style={{...css.th,textAlign:"right",minWidth:80,background:P.danger}}>{t("To Buy","வாங்க")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ings.map((ing,i)=>{
                        const tot=combined[ing.id]?.qty||0;
                        const unit=combined[ing.id]?.unit||ing.unit;
                        const stk=getStock(ing.id);
                        const toBuy=Math.max(0,tot-stk);
                        return(
                          <tr key={ing.id} style={{background:i%2===0?P.white:P.highlight}}>
                            <td style={{...css.td,paddingLeft:0}}><strong style={{fontSize:13}}>{n(ing)}</strong></td>
                            {sortedDates.map(dt=>{
                              const v=byDate[dt][ing.id];
                              return(
                                <td key={dt} style={{...css.td,textAlign:"right",color:v?P.deepBrown:"#CCC"}}>
                                  {v?v.qty.toFixed(2)+" "+v.unit:"—"}
                                </td>
                              );
                            })}
                            <td style={{...css.td,textAlign:"right",background:"#FFFBE8"}}>
                              {tot>0?<strong>{tot.toFixed(2)+" "+unit}</strong>:"—"}
                            </td>
                            <td style={{...css.td,textAlign:"right"}}>
                              <span style={{color:stk>=tot?P.success:P.danger}}>{stk.toFixed(2)+" "+unit}</span>
                            </td>
                            <td style={{...css.td,textAlign:"right"}}>
                              <strong style={{color:toBuy>0?P.danger:P.success}}>
                                {toBuy>0?toBuy.toFixed(2)+" "+unit:"✓ OK"}
                              </strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// REPORT: DELIVERY SHEET
// ════════════════════════════════════════════════════════════════════
function RepDel({ctx}){
  const {orders,recipes,locations,lang:gLang}=ctx;
  const [rLang,setRLang]=useState(gLang);
  const t=(en,ta)=>rLang==="en"?en:ta;
  const n=(x)=>rLang==="en"?x.name:((x.nameTamil&&x.nameTamil.trim())?x.nameTamil:x.name);
  const [dt,setDt]=useState(TODAY);
  const [sessF,setSessF]=useState("All");
  const [locF,setLocF]=useState("all");

  const allEntries=orders.filter(o=>!o.isTemplate&&o.date===dt).flatMap(o=>o.entries.map(e=>({...e,_order:o})));
  // Filter by session
  const entries=sessF==="All"?allEntries:allEntries.filter(e=>e.session===sessF);
  const filtLocs=locF==="all"?locations:locations.filter(l=>l.id===+locF);
  // Sessions that actually have data for this date
  const activeSessions=["All",...SESSIONS.filter(s=>allEntries.some(e=>e.session===s))];

  const doPrint=()=>{
    const blank="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
    const html=filtLocs.map(loc=>{
      const le=entries.filter(e=>e.locId===loc.id); if(!le.length)return "";
      const sg=SESSIONS.filter(s=>sessF==="All"||s===sessF).map(s=>({sess:s,items:le.filter(e=>e.session===s)})).filter(g=>g.items.length>0);
      const sessHtml=sg.map(({sess,items})=>{
        const irows=items.map(e=>{
          const rec=recipes.find(r=>r.id===e.recId);
          return "<tr><td><strong>"+(rec?(rLang==="en"?rec.name:rec.nameTamil):"?")+"</strong></td><td>"+e.qty+" "+e.yu+"</td><td>"+blank+"</td><td>"+blank+blank+"</td></tr>";
        }).join("");
        return "<p><strong>"+sess+"</strong></p>"
          +"<table><thead><tr><th>"+t("Dish","உணவு")+"</th><th>"+t("Ordered","ஆர்டர்")+"</th><th>"+t("Delivered","வழங்கல்")+"</th><th>"+t("Remarks","குறிப்பு")+"</th></tr></thead>"
          +"<tbody>"+irows+"</tbody></table>";
      }).join("");
      return "<h3>📍 "+(rLang==="en"?loc.name:loc.nameTamil)+"</h3>"+sessHtml;
    }).join("");
    const locLabel=locF==="all"?"All":(locations.find(l=>l.id===+locF)?.name||"");
    const title="Delivery Sheet — "+dt+(sessF!=="All"?" ("+sessF+")":"");
    printHTML(title,"<p class='meta'>Date: "+dt+" | Session: "+sessF+" | Location: "+locLabel+"</p>"+html);
  };

  const doExport=()=>{
    const data=[];
    filtLocs.forEach(loc=>{
      const le=entries.filter(e=>e.locId===loc.id); if(!le.length)return;
      le.forEach(e=>{
        const rec=recipes.find(r=>r.id===e.recId);
        data.push({
          Location: rLang==="en"?loc.name:loc.nameTamil,
          Session: e.session,
          Dish: rec?(rLang==="en"?rec.name:rec.nameTamil):"?",
          "Ordered Qty": e.qty, Unit: e.yu,
          Delivered: "", Remarks: ""
        });
      });
    });
    exportXlsxSheets(`delivery_${dt}.xlsx`,[{name:"Delivery Sheet",data}]);
  };

  return(
    <div>
      <ReportBar onPrint={entries.length>0?doPrint:null} onExport={entries.length>0?doExport:null} lang={rLang} setLang={setRLang}>
        <div><label style={css.lbl}>{t("Date","தேதி")}</label><input type="date" style={{...css.inp,width:160}} value={dt} onChange={e=>setDt(e.target.value)}/></div>
        <div>
          <label style={css.lbl}>{t("Session","அமர்வு")}</label>
          <div style={{display:"flex",gap:4}}>
            {activeSessions.map(s=>(
              <button key={s} style={{...css.btn(sessF===s?"primary":"ghost",true)}} onClick={()=>setSessF(s)}>
                {s==="All"?t("All","அனைத்தும்"):s}
              </button>
            ))}
          </div>
        </div>
        <div><label style={css.lbl}>{t("Location","இடம்")}</label>
          <select style={css.sel} value={locF} onChange={e=>setLocF(e.target.value)}>
            <option value="all">{t("All Locations","அனைத்து இடங்கள்")}</option>
            {locations.map(l=><option key={l.id} value={l.id}>{rLang==="en"?l.name:l.nameTamil}</option>)}
          </select>
        </div>
      </ReportBar>

      {filtLocs.map(loc=>{
        const le=entries.filter(e=>e.locId===loc.id);
        if(!le.length)return null;

        // Group by session for this location
        const sessionGroups=SESSIONS.filter(s=>sessF==="All"||s===sessF).map(s=>({
          sess:s,
          items:le.filter(e=>e.session===s),
        })).filter(g=>g.items.length>0);

        return(
          <div key={loc.id} style={css.card}>
            <div style={{background:P.nav,color:"#F5DEB3",margin:"-18px -18px 14px",padding:"12px 18px",borderRadius:"10px 10px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:15}}>📍 {rLang==="en"?loc.name:loc.nameTamil}</span>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                {sessF!=="All"&&<span style={{...css.badge(SCOLOR[sessF]||P.muted),fontSize:11}}>{sessF}</span>}
                <span style={{fontSize:12,opacity:0.7}}>{dt}</span>
              </div>
            </div>

            {sessionGroups.map(({sess,items})=>(
              <div key={sess} style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{...css.badge(SCOLOR[sess]||P.muted),fontSize:12,padding:"3px 10px"}}>{sess}</span>
                  <span style={{fontSize:11,color:P.muted}}>{items.length} {t("dish(es)","உணவு")}</span>
                </div>
                <table style={css.table}>
                  <thead><tr>
                    <th style={css.th}>{t("Dish","உணவு")}</th>
                    <th style={css.th}>{t("Ordered Qty","ஆர்டர்")}</th>
                    <th style={css.th}>{t("Delivered","வழங்கியது")}</th>
                    <th style={css.th}>{t("Remarks","குறிப்பு")}</th>
                  </tr></thead>
                  <tbody>
                    {items.map((e,i)=>{
                      const rec=recipes.find(r=>r.id===e.recId);
                      return(
                        <tr key={i} style={{background:i%2===0?P.white:P.highlight}}>
                          <td style={css.td}><strong>{rec?(rLang==="en"?rec.name:rec.nameTamil):"?"}</strong></td>
                          <td style={css.td}><strong style={{color:P.deepBrown}}>{e.qty} {e.yu}</strong></td>
                          <td style={{...css.td,width:90}}><input type="number" style={{...css.inp,padding:"3px 6px",width:80}} placeholder={String(e.qty)}/></td>
                          <td style={{...css.td}}><input style={{...css.inp,padding:"3px 6px"}} placeholder={t("Note...","குறிப்பு...")}/></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        );
      })}
      {filtLocs.every(loc=>entries.filter(e=>e.locId===loc.id).length===0)&&(
        <div style={{color:P.muted,textAlign:"center",padding:24}}>{t("No orders for this date / session.","இந்த தேதி / அமர்வுக்கு ஆர்டர் இல்லை.")}</div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// REPORT: WEEKLY MENU (columnar recipe list across a date range)
// ════════════════════════════════════════════════════════════════════
function RepMenu({ctx}){
  const {orders,recipes,lang:gLang}=ctx;
  const [rLang,setRLang]=useState(gLang);
  const t=(en,ta)=>rLang==="en"?en:ta;
  const n=(x)=>rLang==="en"?x.name:((x.nameTamil&&x.nameTamil.trim())?x.nameTamil:x.name);
  const [fromDate,setFromDate]=useState(TODAY);
  const [toDate,setToDate]=useState(()=>{
    const d=new Date(TODAY); d.setDate(d.getDate()+6); return d.toISOString().slice(0,10);
  });
  const [sessF,setSessF]=useState("All");

  const sortedDates=useMemo(()=>{
    const dates=[]; const start=new Date(fromDate); const end=new Date(toDate);
    if(start>end)return[fromDate];
    const cur=new Date(start);
    while(cur<=end){dates.push(cur.toISOString().slice(0,10));cur.setDate(cur.getDate()+1);}
    return dates;
  },[fromDate,toDate]);

  // Rows keyed by session__recipeId, columns = dates
  const rows=useMemo(()=>{
    const map={};
    sortedDates.forEach(dt=>{
      const ents=orders.filter(o=>!o.isTemplate&&o.date===dt)
        .flatMap(o=>o.entries.filter(e=>sessF==="All"||e.session===sessF));
      ents.forEach(e=>{
        const rec=recipes.find(r=>r.id===e.recId); if(!rec)return;
        const key=e.session+"__"+e.recId;
        if(!map[key])map[key]={session:e.session,rec,byDate:{}};
        map[key].byDate[dt]=(map[key].byDate[dt]||0)+e.qty;
      });
    });
    return Object.values(map).sort((a,b)=>{
      const so=SESSIONS.indexOf(a.session)-SESSIONS.indexOf(b.session);
      if(so!==0)return so;
      return (rLang==="en"?a.rec.name:a.rec.nameTamil||a.rec.name).localeCompare(rLang==="en"?b.rec.name:b.rec.nameTamil||b.rec.name);
    });
  },[sortedDates,orders,recipes,sessF,rLang]);

  const hasData=rows.length>0;

  const doPrint=()=>{
    const dateHeaders=sortedDates.map(d=>"<th style='text-align:center'>"+d.slice(5)+"</th>").join("");
    const trows=rows.map(row=>{
      const cells=sortedDates.map(dt=>{
        const v=row.byDate[dt];
        return "<td style='text-align:center'>"+(v?"<strong>"+v+" "+row.rec.yieldUnit+"</strong>":"—")+"</td>";
      }).join("");
      return "<tr>"+(sessF==="All"?"<td>"+row.session+"</td>":"")+"<td><strong>"+n(row.rec)+"</strong></td>"+cells+"</tr>";
    }).join("");
    const thead="<thead><tr>"+(sessF==="All"?"<th>"+t("Session","அமர்வு")+"</th>":"")+"<th>"+t("Dish","உணவு")+"</th>"+dateHeaders+"</tr></thead>";
    const sessLabel=sessF==="All"?t("All Sessions","அனைத்து அமர்வு"):sessF;
    printHTML(t("Weekly Menu","வார உணவு பட்டியல்")+" ("+fromDate+" – "+toDate+")",
      "<p style='color:#9B7355;margin:0 0 12px;font-size:12px'>"+t("Session","அமர்வு")+": "+sessLabel+" | "+t("Range","வரம்பு")+": "+fromDate+" – "+toDate+"</p>"
      +"<table>"+thead+"<tbody>"+trows+"</tbody></table>");
  };

  const doExport=()=>{
    const data=rows.map(row=>{
      const obj={};
      if(sessF==="All")obj[t("Session","அமர்வு")]=row.session;
      obj[t("Dish","உணவு")]=n(row.rec);
      sortedDates.forEach(dt=>{obj[dt]=row.byDate[dt]||"";});
      return obj;
    });
    exportXlsxSheets("weekly_menu_"+fromDate+"_to_"+toDate+".xlsx",[{name:"Weekly Menu",data}]);
  };

  return(
    <div>
      <ReportBar onPrint={hasData?doPrint:null} onExport={hasData?doExport:null} lang={rLang} setLang={setRLang}>
        <div>
          <label style={css.lbl}>{t("From","இருந்து")}</label>
          <input type="date" style={{...css.inp,width:148}} value={fromDate}
            onChange={e=>{setFromDate(e.target.value);if(e.target.value>toDate)setToDate(e.target.value);}}/>
        </div>
        <div>
          <label style={css.lbl}>{t("To","வரை")}</label>
          <input type="date" style={{...css.inp,width:148}} value={toDate}
            onChange={e=>{setToDate(e.target.value);if(e.target.value<fromDate)setFromDate(e.target.value);}}/>
        </div>
        <div style={{fontSize:11,color:P.muted,paddingBottom:6}}>
          {sortedDates.length} {t("day(s)","நாள்")}
        </div>
      </ReportBar>

      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {["All",...SESSIONS].map(s=>(
          <button key={s} style={{...css.btn(sessF===s?"primary":"ghost",true),
            borderColor:s!=="All"?(SCOLOR[s]||P.muted):"#DCC88A",
            color:sessF===s?"white":(s!=="All"?SCOLOR[s]:P.deepBrown),
            background:sessF===s?(SCOLOR[s]||P.saffron):"transparent",
          }} onClick={()=>setSessF(s)}>{s==="All"?t("All Sessions","அனைத்து அமர்வு"):s}</button>
        ))}
      </div>

      {!hasData?(
        <div style={{color:P.muted,textAlign:"center",padding:32}}>{t("No orders in this date range.","இந்த தேதி வரம்பில் ஆர்டர் இல்லை.")}</div>
      ):(
        <div style={{...css.card,padding:0,overflow:"auto"}}>
          <table style={css.table}>
            <thead><tr>
              {sessF==="All"&&<th style={css.th}>{t("Session","அமர்வு")}</th>}
              <th style={css.th}>{t("Dish","உணவு")}</th>
              {sortedDates.map(dt=><th key={dt} style={{...css.th,textAlign:"center",minWidth:80}}>{dt.slice(5)}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((row,i)=>(
                <tr key={row.session+"_"+row.rec.id} style={{background:i%2===0?P.white:P.highlight}}>
                  {sessF==="All"&&<td style={css.td}><span style={css.badge(SCOLOR[row.session]||P.muted)}>{row.session}</span></td>}
                  <td style={css.td}><strong>{n(row.rec)}</strong></td>
                  {sortedDates.map(dt=>{
                    const v=row.byDate[dt];
                    return(
                      <td key={dt} style={{...css.td,textAlign:"center"}}>
                        {v?<strong style={{color:P.saffron}}>{v} {row.rec.yieldUnit}</strong>:<span style={{color:"#DDD"}}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// REPORT: COLUMNAR (locations as columns)
// ════════════════════════════════════════════════════════════════════
function RepCol({ctx}){
  const {orders,recipes,locations,lang:gLang}=ctx;
  const [rLang,setRLang]=useState(gLang);
  const t=(en,ta)=>rLang==="en"?en:ta;
  const n=(x)=>rLang==="en"?x.name:((x.nameTamil&&x.nameTamil.trim())?x.nameTamil:x.name);
  const [dt,setDt]=useState(TODAY);
  const [sessF,setSessF]=useState("All");

  const allEntries=orders.filter(o=>!o.isTemplate&&o.date===dt).flatMap(o=>o.entries.map(e=>({...e,_order:o})));
  const entries=sessF==="All"?allEntries:allEntries.filter(e=>e.session===sessF);
  const activeSessions=["All",...SESSIONS.filter(s=>allEntries.some(e=>e.session===s))];
  const rows={};
  entries.forEach(e=>{
    const rec=recipes.find(r=>r.id===e.recId); if(!rec)return;
    const key=e.session+"__"+e.recId;
    if(!rows[key])rows[key]={session:e.session,rec,locs:{}};
    rows[key].locs[e.locId]=(rows[key].locs[e.locId]||0)+e.qty;
  });
  const sorted=Object.values(rows).sort((a,b)=>SESSIONS.indexOf(a.session)-SESSIONS.indexOf(b.session));

  const doPrint=()=>{
    const locHeaders=locations.map(l=>`<th>${rLang==="en"?l.name:l.nameTamil}</th>`).join("");
    const tableRows=sorted.map(row=>{
      const total=Object.values(row.locs).reduce((s,v)=>s+v,0);
      const locCells=locations.map(l=>{
        const v=row.locs[l.id];
        return "<td style='text-align:center'>"+(v?"<strong>"+v+" "+row.rec.yieldUnit+"</strong>":"—")+"</td>";
      }).join("");
      return "<tr><td>"+row.session+"</td><td><strong>"+(rLang==="en"?row.rec.name:row.rec.nameTamil)+"</strong></td>"+locCells+"<td style='text-align:center;background:#fffbe8'><strong>"+total.toFixed(1)+" "+row.rec.yieldUnit+"</strong></td></tr>";
    }).join("");
    const thead2="<thead><tr><th>"+t("Session","அமர்வு")+"</th><th>"+t("Dish","உணவு")+"</th>"+locHeaders+"<th>"+t("Total","மொத்தம்")+"</th></tr></thead>";
    const sessLabel=sessF==="All"?"All Sessions":sessF;
    printHTML("Location Columnar — "+dt+" ("+sessLabel+")","<p class='meta'>Date: "+dt+" | Session: "+sessLabel+"</p><table>"+thead2+"<tbody>"+tableRows+"</tbody></table>");
  };

  const doExport=()=>{
    const data=sorted.map(row=>{
      const total=Object.values(row.locs).reduce((s,v)=>s+v,0);
      const obj={Session:row.session,[t("Dish","உணவு")]:rLang==="en"?row.rec.name:row.rec.nameTamil};
      locations.forEach(l=>{obj[rLang==="en"?l.name:l.nameTamil]=row.locs[l.id]||0;});
      obj.Total=total; obj.Unit=row.rec.yieldUnit;
      return obj;
    });
    exportXlsxSheets(`columnar_${dt}.xlsx`,[{name:"Location Columnar",data}]);
  };

  return(
    <div>
      <ReportBar onPrint={sorted.length>0?doPrint:null} onExport={sorted.length>0?doExport:null} lang={rLang} setLang={setRLang}>
        <div><label style={css.lbl}>{t("Date","தேதி")}</label><input type="date" style={{...css.inp,width:160}} value={dt} onChange={e=>setDt(e.target.value)}/></div>
        <div><label style={css.lbl}>{t("Session","அமர்வு")}</label>
          <select style={css.sel} value={sessF} onChange={e=>setSessF(e.target.value)}>
            {activeSessions.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </ReportBar>
      {sorted.length===0?<div style={{color:P.muted,textAlign:"center",padding:24}}>{t("No orders for this date.","இந்த தேதிக்கு ஆர்டர் இல்லை.")}</div>:(
        <div style={{...css.card,padding:0,overflow:"auto"}}>
          <table style={css.table}>
            <thead><tr>
              {sessF==="All"&&<th style={css.th}>{t("Session","அமர்வு")}</th>}
              <th style={css.th}>{t("Dish","உணவு")}</th>
              {locations.map(l=><th key={l.id} style={css.th}>{n(l)}</th>)}
              <th style={{...css.th,background:"#2d1a0e"}}>{t("Total","மொத்தம்")}</th>
            </tr></thead>
            <tbody>{sorted.map((row,i)=>{
              const total=Object.values(row.locs).reduce((s,v)=>s+v,0);
              return(
                <tr key={i} style={{background:i%2===0?P.white:P.highlight}}>
                  {sessF==="All"&&<td style={css.td}><span style={css.badge(SCOLOR[row.session]||P.muted)}>{row.session}</span></td>}
                  <td style={css.td}><strong>{n(row.rec)}</strong></td>
                  {locations.map(l=><td key={l.id} style={{...css.td,textAlign:"center"}}>{row.locs[l.id]?<strong>{row.locs[l.id]} {row.rec.yieldUnit}</strong>:<span style={{color:"#DDD"}}>—</span>}</td>)}
                  <td style={{...css.td,textAlign:"center",background:"#FEF0D4"}}><strong style={{color:P.saffron}}>{total.toFixed(1)} {row.rec.yieldUnit}</strong></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// REPORT: COST ANALYSIS BY RECIPE TYPE
// ════════════════════════════════════════════════════════════════════
function RepCost({ctx}){
  const {recipes,ingredients,recipeTypes,lang:gLang}=ctx;
  const [rLang,setRLang]=useState(gLang);
  const t=(en,ta)=>rLang==="en"?en:ta;
  const n=(x)=>rLang==="en"?x.name:((x.nameTamil&&x.nameTamil.trim())?x.nameTamil:x.name);
  const [drillId,setDrillId]=useState(null);

  const getType=(r)=>{
    if(!r||!r.recipeType)return{id:"other",en:"Other",ta:"மற்றவை",color:P.muted};
    return recipeTypes.find(x=>x.id===r.recipeType)||{id:"other",en:"Other",ta:"மற்றவை",color:P.muted};
  };

  // Build per-recipe cost rows
  const recRows=useMemo(()=>
    (recipes||[]).map(r=>{
      const tp=getType(r);
      const baseCost=computeRecipeCost(r,1,recipes,ingredients);
      const cpu=(r.yield&&r.yield>0)?baseCost/r.yield:0;
      return{r,tp,cpu,baseCost};
    })
  ,[recipes,ingredients,recipeTypes]);

  // Group by recipeTypes order, within each group sort by cpu desc
  const grouped=useMemo(()=>{
    const typeOrder=recipeTypes.map(t=>t.id);
    const groups={};
    recRows.forEach(row=>{
      const tid=row.tp.id;
      if(!groups[tid])groups[tid]={tp:row.tp,rows:[]};
      groups[tid].rows.push(row);
    });
    // Sort rows within each group by cpu desc
    Object.values(groups).forEach(g=>{g.rows.sort((a,b)=>b.cpu-a.cpu);});
    // Sort groups by recipeTypes order
    return Object.values(groups).sort((a,b)=>{
      const ai=typeOrder.indexOf(a.tp.id);
      const bi=typeOrder.indexOf(b.tp.id);
      return(ai===-1?999:ai)-(bi===-1?999:bi);
    });
  },[recRows,recipeTypes]);

  // Drill down
  const drillRec=drillId?recipes.find(r=>r.id===drillId):null;
  const drillRows=useMemo(()=>{
    if(!drillRec)return{rows:[],total:0};
    const expanded=mergeIngs(expandRecipeIngs(drillRec,1,recipes,ingredients));
    const total=expanded.reduce((s,row)=>s+(row.d.normCost||0)*row.qty,0);
    return{rows:expanded.map(row=>({...row,lineCost:(row.d.normCost||0)*row.qty})).sort((a,b)=>b.lineCost-a.lineCost),total};
  },[drillRec,recipes,ingredients]);

  const allRows=grouped.flatMap(g=>g.rows);

  const doExport=()=>{
    const data=[];
    grouped.forEach(({tp,rows})=>{
      // Type heading row
      data.push({[t("Type","வகை")]:"▶ "+(rLang==="en"?tp.en:tp.ta).toUpperCase(),[t("Recipe","சமையல்")]:"",Yield:"","Cost/unit":"","Batch Cost":""});
      rows.forEach(({r,cpu,baseCost})=>{
        data.push({
          [t("Type","வகை")]:"",
          [t("Recipe","சமையல்")]:n(r),
          Yield:r.yield+" "+r.yieldUnit,
          "Cost/unit":+cpu.toFixed(2),
          "Batch Cost":+baseCost.toFixed(2),
        });
      });
      data.push({[t("Type","வகை")]:"",Recipe:"",Yield:"","Cost/unit":"","Batch Cost":""});
    });
    exportXlsxSheets("cost_analysis.xlsx",[{name:"Cost Analysis",data}]);
  };

  return(
    <div>
      <ReportBar onPrint={null} onExport={allRows.length>0?doExport:null} lang={rLang} setLang={setRLang}>
        <div/>
      </ReportBar>

      {/* Grouped table */}
      {grouped.map(({tp,rows})=>{
        const col=tp.color||P.muted;
        const withCost=rows.filter(x=>x.cpu>0);
        return(
          <div key={tp.id} style={{marginBottom:18}}>
            {/* Group header */}
            <div style={{display:"flex",alignItems:"center",gap:10,background:col+"18",border:"1px solid "+col+"33",borderRadius:"8px 8px 0 0",padding:"8px 14px"}}>
              <span style={{...css.badge(col),fontSize:13,padding:"3px 12px"}}>{rLang==="en"?tp.en:tp.ta}</span>
              <span style={{fontSize:11,color:P.muted}}>{rows.length} {t("recipes","சமையல்")}</span>

            </div>
            {/* Recipes table */}
            <div style={{border:"1px solid "+col+"33",borderTop:"none",borderRadius:"0 0 8px 8px",overflow:"hidden"}}>
              <table style={css.table}>
                <thead><tr>
                  <th style={css.th}>#</th>
                  <th style={css.th}>{t("Recipe","சமையல்")}</th>
                  <th style={css.th}>{t("Yield","விளைச்சல்")}</th>
                  <th style={{...css.th,textAlign:"right"}}>{t("Cost/unit","செலவு/அலகு")}</th>
                  <th style={{...css.th,textAlign:"right"}}>{t("Batch Cost","தொகுதி செலவு")}</th>
                  <th style={css.th}></th>
                </tr></thead>
                <tbody>
                  {rows.map(({r,cpu,baseCost},i)=>{
                    const isOpen=drillId===r.id;

                    return(
                      <tr key={r.id} style={{background:isOpen?col+"18":i%2===0?P.white:P.highlight}}>
                        <td style={{...css.td,width:28,color:P.muted,fontSize:10}}>{i+1}</td>
                        <td style={css.td}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <strong style={{color:P.saffron,cursor:"pointer"}} onClick={()=>setDrillId(isOpen?null:r.id)}>{n(r)}</strong>

                          </div>
                        </td>
                        <td style={css.td}>{r.yield} {r.yieldUnit}</td>
                        <td style={{...css.td,textAlign:"right"}}>
                          {cpu>0?<strong style={{color:P.success}}>₹{cpu.toFixed(2)}/{r.yieldUnit}</strong>:<span style={{color:"#CCC"}}>—</span>}
                        </td>
                        <td style={{...css.td,textAlign:"right"}}>
                          {baseCost>0?<span style={{color:P.deepBrown}}>₹{baseCost.toFixed(2)}</span>:<span style={{color:"#CCC"}}>—</span>}
                        </td>
                        <td style={css.td}>
                          <button style={css.btn("ghost",true)} onClick={()=>setDrillId(isOpen?null:r.id)}>{isOpen?"▲":"▼"}</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Drill-down inline */}
            {rows.some(x=>x.r.id===drillId)&&drillRec&&drillRows.rows.length>0&&(
              <div style={{border:"1px solid "+P.gold+"44",borderTop:"none",background:"#FFFDF5",borderRadius:"0 0 8px 8px",padding:14,marginTop:-1}}>
                <div style={{fontWeight:700,color:P.deepBrown,marginBottom:8,fontSize:13}}>
                  🔍 {n(drillRec)} — {t("Ingredient Breakdown","பொருள் விவரம்")}
                  <span style={{fontWeight:400,fontSize:11,color:P.muted,marginLeft:8}}>(1 batch = {drillRec.yield} {drillRec.yieldUnit})</span>
                </div>
                <table style={css.table}>
                  <thead><tr>
                    <th style={css.th}>{t("Ingredient","பொருள்")}</th>
                    <th style={css.th}>{t("Category","வகை")}</th>
                    <th style={{...css.th,textAlign:"right"}}>{t("Qty","அளவு")}</th>
                    <th style={{...css.th,textAlign:"right"}}>{t("Rate","விலை")}</th>
                    <th style={{...css.th,textAlign:"right"}}>{t("Cost","செலவு")}</th>
                    <th style={{...css.th,textAlign:"right"}}>%</th>
                  </tr></thead>
                  <tbody>
                    {drillRows.rows.map((row,i)=>{
                      const pct=drillRows.total>0?(row.lineCost/drillRows.total*100):0;
                      const ccol=CATCOLOR[row.d.category]||P.muted;
                      return(
                        <tr key={row.d.id} style={{background:i%2===0?P.white:P.highlight}}>
                          <td style={css.td}><strong>{rLang==="en"?row.d.name:row.d.nameTamil}</strong></td>
                          <td style={css.td}><span style={css.badge(ccol)}>{row.d.category}</span></td>
                          <td style={{...css.td,textAlign:"right"}}>{row.qty.toFixed(2)} {row.unit}</td>
                          <td style={{...css.td,textAlign:"right",fontSize:11,color:P.muted}}>{row.d.normCost?("₹"+row.d.normCost+"/"+row.unit):"—"}</td>
                          <td style={{...css.td,textAlign:"right"}}>{row.lineCost>0?<strong style={{color:P.success}}>₹{row.lineCost.toFixed(2)}</strong>:<span style={{color:"#CCC"}}>—</span>}</td>
                          <td style={{...css.td,textAlign:"right",fontSize:10,color:P.muted}}>{pct>0?pct.toFixed(1)+"%":"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {drillRows.total>0&&(
                  <div style={{padding:"6px 10px",background:P.success+"18",borderTop:"1px solid "+P.success+"33",textAlign:"right",fontWeight:700,color:P.success,borderRadius:"0 0 6px 6px",marginTop:4}}>
                    {t("Total","மொத்தம்")}: ₹{drillRows.total.toFixed(2)}
                    <span style={{fontWeight:400,fontSize:11,color:P.muted,marginLeft:8}}>₹{(drillRows.total/drillRec.yield).toFixed(2)}/{drillRec.yieldUnit}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// REPORT: COMPARE RECIPES (columnar, normalized to same output qty)
// ════════════════════════════════════════════════════════════════════
function RepCompare({ctx}){
  const {recipes,ingredients,lang:gLang}=ctx;
  const [rLang,setRLang]=useState(gLang);
  const t=(en,ta)=>rLang==="en"?en:ta;
  const n=(x)=>rLang==="en"?x.name:((x.nameTamil&&x.nameTamil.trim())?x.nameTamil:x.name);
  const [selectedIds,setSelectedIds]=useState([]);
  const [addId,setAddId]=useState("");
  const [targetQty,setTargetQty]=useState(1);

  const selected=selectedIds.map(id=>recipes.find(r=>r.id===id)).filter(Boolean);
  const round2=v=>Math.round((+v||0)*100)/100;

  const addRecipe=()=>{
    if(!addId)return;
    const id=+addId;
    if(!selectedIds.includes(id))setSelectedIds(p=>[...p,id]);
    setAddId("");
  };
  const removeRecipe=id=>setSelectedIds(p=>p.filter(x=>x!==id));

  const costPerRecipe=rec=>{
    const mult=rec.yield?(targetQty/rec.yield):1;
    return computeRecipeCost(rec,mult,recipes,ingredients);
  };

  const rows=useMemo(()=>{
    const byIng={};
    selected.forEach(rec=>{
      const mult=rec.yield?(targetQty/rec.yield):1;
      const expanded=mergeIngs(expandRecipeIngs(rec,mult,recipes,ingredients,true));
      expanded.forEach(row=>{
        if(!byIng[row.d.id])byIng[row.d.id]={ing:row.d,perRecipe:{}};
        byIng[row.d.id].perRecipe[rec.id]=(byIng[row.d.id].perRecipe[rec.id]||0)+row.qty;
      });
    });
    return Object.values(byIng).sort((a,b)=>n(a.ing).localeCompare(n(b.ing)));
  },[selected,targetQty,recipes,ingredients,rLang]);

  const doExport=()=>{
    const data=rows.map(row=>{
      const obj={[t("Ingredient","பொருள்")]:n(row.ing),[t("Unit","அலகு")]:row.ing.unit};
      selected.forEach(rec=>{obj[n(rec)]=row.perRecipe[rec.id]?round2(row.perRecipe[rec.id]):"";});
      return obj;
    });
    if(selected.length){
      const costRow={[t("Ingredient","பொருள்")]:t("— Total Cost —","— மொத்த செலவு —"),[t("Unit","அலகு")]:""};
      selected.forEach(rec=>{costRow[n(rec)]=round2(costPerRecipe(rec));});
      data.push(costRow);
    }
    exportXlsxSheets("recipe_comparison.xlsx",[{name:"Comparison",data}]);
  };

  const doPrint=()=>{
    const headers=selected.map(rec=>"<th style='text-align:center'>"+n(rec)+"<br><span style='font-weight:400;font-size:10px'>"+t("per","")+" "+targetQty+" "+rec.yieldUnit+"</span></th>").join("");
    const trows=rows.map(row=>{
      const vals=selected.map(rec=>row.perRecipe[rec.id]||0);
      const max=Math.max(...vals);
      const maxCount=vals.filter(v=>v===max).length;
      const cells=selected.map(rec=>{
        const v=row.perRecipe[rec.id]||0;
        const isMax=v===max&&max>0&&maxCount===1;
        return "<td style='text-align:center"+(isMax?";font-weight:800;color:#C0392B":"")+"'>"+(v?round2(v):"—")+"</td>";
      }).join("");
      return "<tr><td><strong>"+n(row.ing)+"</strong></td>"+cells+"</tr>";
    }).join("");
    const costCells=selected.map(rec=>"<td style='text-align:center;font-weight:700'>₹"+round2(costPerRecipe(rec))+"</td>").join("");
    printHTML(t("Recipe Comparison","சமையல் ஒப்பீடு"),
      "<table><thead><tr><th>"+t("Ingredient","பொருள்")+"</th>"+headers+"</tr></thead><tbody>"+trows+
      "<tr style='background:#FFF3CD'><td><strong>"+t("Total Cost","மொத்த செலவு")+"</strong></td>"+costCells+"</tr></tbody></table>");
  };

  return(
    <div>
      <ReportBar onPrint={selected.length>0?doPrint:null} onExport={selected.length>0?doExport:null} lang={rLang} setLang={setRLang}>
        <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div>
            <label style={css.lbl}>{t("Add Recipe","சமையல் சேர்")}</label>
            <select style={{...css.sel,minWidth:220}} value={addId} onChange={e=>setAddId(e.target.value)}>
              <option value="">{t("Select recipe...","தேர்வு...")}</option>
              {recipes.filter(r=>!selectedIds.includes(r.id)).map(r=><option key={r.id} value={r.id}>{n(r)}</option>)}
            </select>
          </div>
          <button style={css.btn()} onClick={addRecipe} disabled={!addId}>+ {t("Add","சேர்")}</button>
          <div>
            <label style={css.lbl}>{t("Normalize to output qty","இயல் அளவுக்கு மாற்று")}</label>
            <input type="number" min="0.1" step="0.1" style={{...css.inp,width:100}} value={targetQty} onChange={e=>setTargetQty(+e.target.value||1)}/>
          </div>
        </div>
      </ReportBar>

      <div style={{fontSize:11,color:P.muted,marginBottom:10}}>
        {t("Each recipe is scaled to the quantity above, in its own yield unit, so ingredient amounts become directly comparable regardless of original batch size.","ஒவ்வொரு சமையலும் மேலே உள்ள அளவுக்கு மாற்றப்பட்டு ஒப்பிடப்படுகிறது.")}
      </div>

      {selected.length>0&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
          {selected.map(rec=>(
            <span key={rec.id} style={{...css.badge(P.saffron),display:"flex",alignItems:"center",gap:6,fontSize:12,padding:"5px 10px"}}>
              {n(rec)} ({targetQty} {rec.yieldUnit})
              <span style={{cursor:"pointer",fontWeight:700}} onClick={()=>removeRecipe(rec.id)}>✕</span>
            </span>
          ))}
        </div>
      )}

      {selected.length<2?(
        <div style={{color:P.muted,textAlign:"center",padding:32}}>{t("Add at least 2 recipes to compare.","ஒப்பிட 2 சமையல்களையாவது சேர்க்கவும்.")}</div>
      ):(
        <div style={{...css.card,padding:0,overflow:"auto"}}>
          <table style={css.table}>
            <thead><tr>
              <th style={css.th}>{t("Ingredient","பொருள்")}</th>
              {selected.map(rec=>(
                <th key={rec.id} style={{...css.th,textAlign:"center",minWidth:110}}>
                  {n(rec)}<div style={{fontWeight:400,fontSize:10,opacity:0.8}}>{t("per","")} {targetQty} {rec.yieldUnit}</div>
                </th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((row,i)=>{
                const vals=selected.map(rec=>row.perRecipe[rec.id]||0);
                const max=Math.max(...vals);
                const maxCount=vals.filter(v=>v===max).length;
                return(
                  <tr key={row.ing.id} style={{background:i%2===0?P.white:P.highlight}}>
                    <td style={css.td}><strong>{n(row.ing)}</strong> <span style={{fontSize:10,color:P.muted}}>({row.ing.unit})</span></td>
                    {selected.map(rec=>{
                      const v=row.perRecipe[rec.id]||0;
                      const isMax=v===max&&max>0&&maxCount===1;
                      return(
                        <td key={rec.id} style={{...css.td,textAlign:"center"}}>
                          {v?<strong style={{color:isMax?P.danger:P.deepBrown}}>{round2(v)}</strong>:<span style={{color:"#DDD"}}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr style={{background:"#FFF3CD"}}>
                <td style={css.td}><strong>{t("Total Cost","மொத்த செலவு")}</strong></td>
                {selected.map(rec=>(
                  <td key={rec.id} style={{...css.td,textAlign:"center"}}>
                    <strong style={{color:P.success}}>₹{round2(costPerRecipe(rec))}</strong>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {selected.length>=2&&(
        <div style={{fontSize:11,color:P.muted,marginTop:8}}>
          {t("Red bold values mark the recipe using the most of that ingredient, per the same normalized output quantity — useful for spotting e.g. which kuzhambu uses the most chilli powder.","சிவப்பு நிற எண்கள் அதிக பயன்பாட்டைக் காட்டுகின்றன.")}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// INVENTORY
// ════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════
// POOJA MATERIAL MODULE
// ════════════════════════════════════════════════════════════════════


// ── Items Master (no qty — just name, Tamil, unit) ─────────────────────────

// ── Items Master ──────────────────────────────────────────────────────────
function PoojaItemsPage({ctx}){
  const {poojaItems,setPoojaItems,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [form,setForm]=useState({name:"",nameTamil:"",unit:"nos"});
  const [editId,setEditId]=useState(null);
  const [ef,setEf]=useState({});
  const UNITS=["nos","kg","g","L","tsp","packet","box","bundle","pair"];
  const fRef=useRef();

  const add=()=>{
    if(!form.name.trim())return;
    setPoojaItems(p=>[...p,{id:Date.now(),name:form.name.trim(),nameTamil:form.nameTamil.trim(),unit:form.unit}]);
    setForm({name:"",nameTamil:"",unit:"nos"});
  };
  const saveEdit=()=>{setPoojaItems(p=>p.map(x=>x.id===editId?{...x,...ef}:x));setEditId(null);};
  const del=(id)=>setPoojaItems(p=>p.filter(x=>x.id!==id));

  const importXlsx=e=>{
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
      const valid=rows.filter(r=>(r.name+"").trim());
      if(!valid.length){alert("No valid rows found. Make sure row 1 has headers: name, nameTamil, unit");return;}
      let nextId=Date.now();
      const imported=valid.map(r=>({
        id:nextId++,
        name:(r.name+"").trim(),
        nameTamil:(r.nameTamil+"").trim(),
        unit:((r.unit||"nos")+"").trim()||"nos",
      }));
      setPoojaItems(prev=>{
        const map=new Map(prev.map(x=>[x.name.toLowerCase(),x]));
        imported.forEach(r=>{
          const key=r.name.toLowerCase();
          if(map.has(key)){const ex=map.get(key);map.set(key,{...ex,...r,id:ex.id});}
          else{map.set(key,r);}
        });
        return Array.from(map.values());
      });
      alert(imported.length+" items imported.");
    };
    reader.readAsBinaryString(file);
    e.target.value="";
  };

  const exportItems=()=>{
    const data=poojaItems.map(pi=>({name:pi.name,nameTamil:pi.nameTamil||"",unit:pi.unit||"nos"}));
    const ws=XLSX.utils.json_to_sheet(data);
    ws["!cols"]=[{wch:30},{wch:28},{wch:10}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Pooja Items");
    XLSX.writeFile(wb,"pooja_items_export.xlsx");
  };

  return(
    <div>
      <div style={css.card}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:P.deepBrown}}>
            🪔 {t("Pooja Items Master","பூஜை பொருட்கள்")}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button style={css.btn("ghost",true)} onClick={exportItems}>⬇️ {t("Export Excel","Excel ஏற்று")}</button>
            <button style={css.btn("success",true)} onClick={()=>fRef.current.click()}>📤 {t("Import Excel","Excel இறக்கு")}</button>
            <input ref={fRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={importXlsx}/>
          </div>
        </div>
        <div style={{fontSize:11,color:P.muted,marginBottom:10}}>
          {t("Import expects column headers: name, nameTamil, unit. Existing items are matched by name and updated; new names are added.","தலைப்புகள்: name, nameTamil, unit. பெயர் பொருந்தினால் புதுப்பிக்கப்படும்.")}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 120px",gap:10,marginBottom:10}}>
          <div><label style={css.lbl}>{t("Item Name","பொருள் பெயர்")}</label>
            <input style={css.inp} value={form.name} placeholder="e.g. Agarbatti"
              onChange={e=>setForm({...form,name:e.target.value})} onKeyDown={e=>e.key==="Enter"&&add()}/>
          </div>
          <div><label style={css.lbl}>{t("Tamil Name","தமிழ் பெயர்")}</label>
            <input style={{...css.inp,fontFamily:"Noto Sans Tamil"}} value={form.nameTamil}
              placeholder="e.g. அகர்பத்தி" onChange={e=>setForm({...form,nameTamil:e.target.value})}/>
          </div>
          <div><label style={css.lbl}>{t("Unit","அலகு")}</label>
            <select style={css.sel} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
              {UNITS.map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <button data-tour="pooja-add-item" style={css.btn()} onClick={add}>+ {t("Add Item","சேர்")}</button>
      </div>
      <div style={{...css.card,padding:0,overflow:"hidden"}}>
        <table style={css.table}>
          <thead><tr>
            <th style={css.th}>#</th>
            <th style={css.th}>{t("Item","பொருள்")}</th>
            <th style={css.th}>{t("Tamil","தமிழ்")}</th>
            <th style={css.th}>{t("Unit","அலகு")}</th>
            <th style={css.th}></th>
          </tr></thead>
          <tbody>
            {poojaItems.map((item,i)=>(
              <tr key={item.id} style={{background:i%2===0?P.white:P.highlight}}>
                <td style={{...css.td,color:P.muted,fontSize:11}}>{i+1}</td>
                <td style={css.td}>{editId===item.id?<input style={css.inp} value={ef.name||""} onChange={e=>setEf({...ef,name:e.target.value})}/>:<strong>{item.name}</strong>}</td>
                <td style={css.td}>{editId===item.id?<input style={{...css.inp,fontFamily:"Noto Sans Tamil"}} value={ef.nameTamil||""} onChange={e=>setEf({...ef,nameTamil:e.target.value})}/>:<span style={{fontFamily:"Noto Sans Tamil"}}>{item.nameTamil||"—"}</span>}</td>
                <td style={css.td}>{editId===item.id?<select style={css.sel} value={ef.unit||item.unit} onChange={e=>setEf({...ef,unit:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select>:<span style={css.badge(P.muted)}>{item.unit}</span>}</td>
                <td style={css.td}>
                  <div style={{display:"flex",gap:4}}>
                    {editId===item.id
                      ?<><button style={css.btn("success",true)} onClick={saveEdit}>✓</button><button style={css.btn("ghost",true)} onClick={()=>setEditId(null)}>✕</button></>
                      :<><button style={css.btn("ghost",true)} onClick={()=>{setEditId(item.id);setEf({...item});}}>✏️</button><button style={css.btn("danger",true)} onClick={()=>del(item.id)}>🗑</button></>}
                  </div>
                </td>
              </tr>
            ))}
            {!poojaItems.length&&<tr><td colSpan={5} style={{...css.td,textAlign:"center",color:P.muted,padding:20}}>{t("No items yet.","பொருட்கள் இல்லை.")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Temples & Weekly Schedule ─────────────────────────────────────────────
// Each temple → each item → 7 days × 3 slots (Morning/Afternoon/Evening)
// ── Temples & Weekly Schedule ─────────────────────────────────────────────
// Schedule stored as: temple.schedule[itemId][day][slot] = qty
// Always renders ALL items from poojaItems — no sync needed
function PoojaTemplesPage({ctx}){
  const {poojaTemples,setPoojaTemples,poojaItems,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [form,setForm]=useState({name:"",nameTamil:"",location:"",contact:""});
  const [openId,setOpenId]=useState(null);
  const [selDay,setSelDay]=useState("monday");

  const DAYS=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const DAY_LABEL={monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat",sunday:"Sun"};
  const DAY_LABEL_TA={monday:"திங்கள்",tuesday:"செவ்வாய்",wednesday:"புதன்",thursday:"வியாழன்",friday:"வெள்ளி",saturday:"சனி",sunday:"ஞாயிறு"};
  const SLOTS=["morning","afternoon","evening"];
  const SLOT_COLOR={morning:"#1a5276",afternoon:"#784212",evening:"#1a237e"};
  const SLOT_ICON={morning:"🌅",afternoon:"☀️",evening:"🌙"};
  const dayN=(d)=>lang==="en"?DAY_LABEL[d]:DAY_LABEL_TA[d];

  const addTemple=()=>{
    if(!form.name.trim())return;
    setPoojaTemples(p=>[...p,{id:Date.now(),name:form.name.trim(),nameTamil:form.nameTamil.trim(),
      location:form.location.trim(),contact:form.contact.trim(),schedule:{}}]);
    setForm({name:"",nameTamil:"",location:"",contact:""});
  };
  const delTemple=(id)=>{if(confirm(t("Delete this temple?","நீக்கவா?")))setPoojaTemples(p=>p.filter(x=>x.id!==id));};

  // Get qty for a slot
  const getQty=(temple,itemId,day,slot)=>{
    return (temple.schedule?.[itemId]?.[day]?.[slot])||"";
  };

  // Set qty for a slot
  const setQty=(templeId,itemId,day,slot,val)=>{
    setPoojaTemples(p=>p.map(tm=>{
      if(tm.id!==templeId)return tm;
      const sch={...tm.schedule};
      if(!sch[itemId])sch[itemId]={};
      if(!sch[itemId][day])sch[itemId][day]={morning:"",afternoon:"",evening:""};
      sch[itemId]={...sch[itemId],[day]:{...sch[itemId][day],[slot]:val}};
      return{...tm,schedule:sch};
    }));
  };

  return(
    <div>
      <div style={css.card}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:P.deepBrown,marginBottom:12}}>
          🛕 {t("Temples & Weekly Schedule","கோவில்கள் & வாராந்திர அட்டவணை")}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={css.lbl}>{t("Temple Name","கோவில் பெயர்")}</label>
            <input style={css.inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Sri Murugan Temple"/>
          </div>
          <div><label style={css.lbl}>{t("Temple Name (Tamil)","கோவில் பெயர் (தமிழ்)")}</label>
            <input style={{...css.inp,fontFamily:"Noto Sans Tamil"}} value={form.nameTamil} onChange={e=>setForm({...form,nameTamil:e.target.value})} placeholder="ஸ்ரீ முருகன் கோவில்"/>
          </div>
          <div><label style={css.lbl}>{t("Location","இடம்")}</label>
            <input style={css.inp} value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Chennai"/>
          </div>
          <div><label style={css.lbl}>{t("Contact","தொடர்பு")}</label>
            <input style={css.inp} value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addTemple()} placeholder="9876543210"/>
          </div>
        </div>
        <button style={css.btn()} onClick={addTemple}>+ {t("Add Temple","கோவில் சேர்")}</button>
      </div>

      {!poojaItems.length&&(
        <div style={{...css.card,color:"#92400E",background:"#FFF3CD",border:"1px solid #F59E0B",textAlign:"center"}}>
          ⚠️ {t("Add items in Items Master first, then set up temple schedules.","முதலில் பொருட்கள் சேர்க்கவும்.")}
        </div>
      )}

      {poojaTemples.map(temple=>{
        const isOpen=openId===temple.id;
        return(
          <div key={temple.id} style={{...css.card,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <strong style={{color:P.deepBrown,fontSize:14}}>{temple.name}</strong>
                {temple.location&&<span style={{fontSize:12,color:P.muted,marginLeft:8}}>{temple.location}</span>}
                {temple.contact&&<span style={{fontSize:12,color:P.muted,marginLeft:8}}>📞 {temple.contact}</span>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <button style={css.btn(isOpen?"primary":"ghost",true)}
                  onClick={()=>setOpenId(isOpen?null:temple.id)}>
                  {isOpen?"▲":"▼"} {t("Schedule","அட்டவணை")}
                  {poojaItems&&poojaItems.length>0&&<span style={{marginLeft:6,fontSize:11,opacity:0.8}}>({poojaItems.length} {t("items","பொருட்கள்")})</span>}
                </button>
                <button style={css.btn("danger",true)} onClick={()=>delTemple(temple.id)}>🗑</button>
              </div>
            </div>

            {isOpen&&(
              <div style={{marginTop:12,borderTop:"1px solid #F0D8B0",paddingTop:12}}>
                {!poojaItems||!poojaItems.length?(
                  <div style={{color:"#92400E",background:"#FFF3CD",border:"1px solid #F59E0B",borderRadius:6,padding:"10px 14px",margin:"4px 0"}}>
                    ⚠️ {t("No items found. Please go to Items Master and add items first, then come back here.","Items Master பக்கத்தில் பொருட்களை சேர்க்கவும்.")}
                  </div>
                ):(
                  <>
                    {/* Day tabs */}
                    <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,color:P.muted,paddingTop:6,marginRight:4}}>{t("Day:","நாள்:")}</span>
                      {DAYS.map(d=>(
                        <button key={d} style={{...css.btn(selDay===d?"primary":"ghost",true),
                          minWidth:44,padding:"5px 10px",fontSize:12,
                          borderColor:d==="friday"||d==="saturday"?P.saffron:"#DCC88A"}}>
                          <span onClick={()=>setSelDay(d)}>{dayN(d)}</span>
                        </button>
                      ))}
                    </div>

                    {/* Item schedule table */}
                    <div style={{overflowX:"auto"}}>
                      <table style={{...css.table,marginBottom:8,minWidth:500}}>
                        <thead><tr>
                          <th style={{...css.th,minWidth:160}}>{t("Item","பொருள்")}</th>
                          <th style={{...css.th,minWidth:60}}>{t("Unit","அலகு")}</th>
                          {SLOTS.map(slot=>(
                            <th key={slot} style={{...css.th,textAlign:"center",minWidth:90,background:SLOT_COLOR[slot],color:"white"}}>
                              {SLOT_ICON[slot]} {t(slot.charAt(0).toUpperCase()+slot.slice(1),slot==="morning"?"காலை":slot==="afternoon"?"மதியம்":"மாலை")}
                            </th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {poojaItems.map((pi,i)=>(
                            <tr key={pi.id} style={{background:i%2===0?P.white:P.highlight}}>
                              <td style={css.td}>
                                <strong>{pi.name}</strong>
                                {pi.nameTamil&&<div style={{fontFamily:"Noto Sans Tamil",fontSize:11,color:P.muted}}>{pi.nameTamil}</div>}
                              </td>
                              <td style={css.td}><span style={css.badge(P.muted)}>{pi.unit}</span></td>
                              {SLOTS.map(slot=>{
                                const val=getQty(temple,pi.id,selDay,slot);
                                return(
                                  <td key={slot} style={{...css.td,textAlign:"center",padding:"4px 8px"}}>
                                    <input type="number" min="0" step="0.5"
                                      style={{...css.inp,width:76,textAlign:"center",padding:"5px 8px",
                                        background:val?"#FEF3C7":"white",
                                        border:val?"1px solid #F59E0B":"1px solid #DCC88A",
                                        fontWeight:val?700:400}}
                                      value={val}
                                      placeholder="—"
                                      onChange={e=>setQty(temple.id,pi.id,selDay,slot,e.target.value)}/>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{fontSize:11,color:P.muted}}>{t("Leave blank if not dispatched on this day/slot. Changes save automatically.","காலியாக விட்டால் அனுப்பப்படாது.")}</div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!poojaTemples.length&&<div style={{...css.card,textAlign:"center",color:P.muted,padding:24}}>{t("No temples yet.","கோவில்கள் இல்லை.")}</div>}
    </div>
  );
}

function PoojaDispatchPage({ctx}){
  const {poojaTemples,poojaItems,poojaDels,setPoojaDels,setPage,setQuickDate,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:(x.nameTamil||x.name);
  const [dt,setDt]=useState(TODAY);
  const [view,setView]=useState("dispatch");
  // Overrides: {templeId_itemId_slot: qty}
  const [overrides,setOverrides]=useState({});
  const [saved,setSaved]=useState(false);

  const DAYS=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const getDayOfWeek=(dateStr)=>DAYS[new Date(dateStr).getDay()];

  const SLOTS=[
    {key:"morning",label:t("Morning","காலை"),icon:"🌅",bg:"#EBF5FB"},
    {key:"afternoon",label:t("Afternoon","மதியம்"),icon:"☀️",bg:"#FEF9E7"},
    {key:"evening",label:t("Evening","மாலை"),icon:"🌙",bg:"#EAF2F8"},
  ];

  const dayKey=getDayOfWeek(dt);

  // Get scheduled qty — reads from temple.schedule[itemId][day][slot] (new structure)
  const getQty=(templeId,itemId,slot)=>{
    const oKey=`${templeId}_${itemId}_${slot}`;
    if(overrides[oKey]!==undefined)return overrides[oKey];
    const temple=poojaTemples.find(t=>t.id===templeId);
    return (temple?.schedule?.[itemId]?.[dayKey]?.[slot])||"";
  };

  const setQty=(templeId,itemId,slot,val)=>{
    setOverrides(p=>({...p,[`${templeId}_${itemId}_${slot}`]:val}));
    setSaved(false);
  };

  const dKey=(templeId,itemId,slot)=>`${dt}_${templeId}_${itemId}_${slot}`;
  const isDispatched=(templeId,itemId,slot)=>poojaDels.some(d=>d.key===dKey(templeId,itemId,slot));

  const toggleDispatch=(templeId,itemId,slot,templeName,itemName,unit)=>{
    const key=dKey(templeId,itemId,slot);
    const qty=getQty(templeId,itemId,slot);
    if(isDispatched(templeId,itemId,slot)){
      setPoojaDels(p=>p.filter(d=>d.key!==key));
    } else {
      setPoojaDels(p=>[...p,{key,date:dt,templeId,itemId,slot,templeName,itemName,qty,unit,
        dispatchedAt:new Date().toISOString()}]);
    }
    setSaved(true);
  };

  const activeTemples=poojaTemples.filter(tm=>
    poojaItems.some(pi=>
      SLOTS.some(s=>(tm.schedule?.[pi.id]?.[dayKey]?.[s.key])||overrides[`${tm.id}_${pi.id}_${s.key}`])
    )
  );

  const exportSheet=()=>{
    const rows=[];
    activeTemples.forEach(tm=>{
      rows.push({Temple:tm.name,Item:"",Morning:"",Afternoon:"",Evening:"",Status:""});
      poojaItems.forEach(pi=>{
        const m=getQty(tm.id,pi.id,"morning"),a=getQty(tm.id,pi.id,"afternoon"),e=getQty(tm.id,pi.id,"evening");
        if(!m&&!a&&!e)return;
        rows.push({Temple:"",Item:pi.name,
          Morning:m?`${m} ${pi.unit}`:"",Afternoon:a?`${a} ${pi.unit}`:"",Evening:e?`${e} ${pi.unit}`:"",
          Status:SLOTS.filter(s=>getQty(tm.id,pi.id,s.key)).map(s=>isDispatched(tm.id,pi.id,s.key)?"✓ "+s.label:s.label).join(" / ")});
      });
      rows.push({Temple:"",Item:"",Morning:"",Afternoon:"",Evening:"",Status:""});
    });
    exportXlsxSheets("pooja_dispatch_"+dt+".xlsx",[{name:"Dispatch",data:rows}]);
  };

  const printReport=()=>{
    const DAY_TA={sunday:"ஞாயிறு",monday:"திங்கள்",tuesday:"செவ்வாய்",wednesday:"புதன்",thursday:"வியாழன்",friday:"வெள்ளி",saturday:"சனி"};
    const dayLabel=lang==="en"?dayKey.charAt(0).toUpperCase()+dayKey.slice(1):DAY_TA[dayKey];
    const temples=activeTemples;
    if(!temples.length){alert("No items scheduled for this day.");return;}

    const SLOT_LIST=[
      {key:"morning",label:t("Morning","காலை"),icon:"🌅"},
      {key:"afternoon",label:t("Afternoon","மதியம்"),icon:"☀️"},
      {key:"evening",label:t("Evening","மாலை"),icon:"🌙"},
    ];

    // Build HTML for each slot section
    const slotBlocks=SLOT_LIST.map(sl=>{
      // Find items that have qty in this slot for at least one temple
      const activeItems=poojaItems.filter(pi=>
        temples.some(tm=>getQty(tm.id,pi.id,sl.key))
      );
      if(!activeItems.length)return "";

      const thCols=temples.map(tm=>`<th style='padding:6px 10px;border:1px solid #000;background:#222;color:white;font-size:12px;white-space:nowrap'>${tm.nameTamil||tm.name}</th>`).join("");
      const rows=activeItems.map((pi,i)=>{
        const tds=temples.map(tm=>{
          const qty=getQty(tm.id,pi.id,sl.key);
          const done=isDispatched(tm.id,pi.id,sl.key);
          return `<td style='padding:5px 10px;border:1px solid #CCC;text-align:center;font-size:12px;background:${done?"#E8F8E8":"white"}'>${qty?`<strong>${qty} ${pi.unit}</strong>${done?" ✓":""}`:"—"}</td>`;
        }).join("");
        return `<tr style='background:${i%2===0?"white":"#F5F5F5"}'><td style='padding:5px 10px;border:1px solid #CCC;font-size:12px;font-weight:600'>${pi.nameTamil||pi.name}</td>${tds}</tr>`;
      }).join("");

      return `<div style='margin-bottom:14px'>
        <div style='font-size:14px;font-weight:700;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:8px'>${sl.icon} ${sl.label}</div>
        <table style='width:100%;border-collapse:collapse'>
          <thead><tr>
            <th style='padding:6px 10px;border:1px solid #000;background:#222;color:white;font-size:12px;text-align:left'>${t("Item","பொருள்")}</th>
            ${thCols}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join("");

    printHTML(
      t("Pooja Dispatch — ","பூஜை பொருள் அனுப்புதல் — ")+dayLabel+" "+dt,
      `<div style='margin-bottom:16px'>
        <div style='font-size:11px;color:#555'>${t("Date","தேதி")}: ${dt} | ${dayLabel} | ${temples.length} ${t("temple(s)","கோவில்கள்")}</div>
      </div>
      ${slotBlocks}
      <div style='margin-top:16px;font-size:11px;color:#555;border-top:1px solid #CCC;padding-top:6px'>${t("✓ = Dispatched — = Not scheduled","✓ = அனுப்பப்பட்டது — = அட்டவணை இல்லை")}</div>`
    );
  };

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div>
          <label style={css.lbl}>{t("Date","தேதி")}</label>
          <input type="date" style={{...css.inp,width:160}} value={dt}
            onChange={e=>{setDt(e.target.value);setOverrides({});setSaved(false);}}/>
        </div>
        <div style={{fontSize:11,color:P.muted,paddingBottom:6,fontWeight:600}}>
          📅 {dayKey.charAt(0).toUpperCase()+dayKey.slice(1)}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"flex-end"}}>
          {saved&&<span style={{fontSize:12,color:P.success,fontWeight:700,paddingBottom:6}}>✓ {t("Saved","சேமிக்கப்பட்டது")}</span>}
          <button style={css.btn(view==="dispatch"?"primary":"ghost",true)} onClick={()=>setView("dispatch")}>📦 {t("Dispatch","அனுப்புதல்")}</button>
          <button style={css.btn(view==="history"?"primary":"ghost",true)} onClick={()=>setView("history")}>📋 {t("History","வரலாறு")}</button>
          <button style={css.btn("ghost",true)} onClick={()=>{setQuickDate(dt);setPage("pooja_send");}}>📋 {t("Items to Send","அனுப்ப வேண்டியவை")}</button>
          <button style={{...css.btn("ghost",true),borderColor:P.success,color:P.success}} onClick={()=>{setQuickDate(dt);setPage("pooja_weekshop");}}>🛒 {t("Purchase","கொள்முதல்")}</button>
          <button style={css.btn("ghost",true)} onClick={exportSheet}>📥 Excel</button>
          <button style={css.btn("primary",true)} onClick={printReport}>🖨 {t("Print Report","அறிக்கை அச்சு")}</button>
        </div>
      </div>

      {view==="dispatch"&&(
        <>
          {!activeTemples.length&&<div style={{...css.card,textAlign:"center",color:P.muted}}>
            {t("No items scheduled for this day. Set up weekly schedule in Temples & Lists.","இந்த நாளில் அட்டவணை இல்லை.")}
          </div>}
          {activeTemples.map(tm=>(
            <div key={tm.id} style={{...css.card,marginBottom:12}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:P.deepBrown,marginBottom:10}}>
                🛕 {n(tm)}
                {tm.location&&<span style={{fontSize:12,color:P.muted,marginLeft:8,fontFamily:"sans-serif",fontWeight:400}}>{tm.location}</span>}
              </div>
              <table style={{...css.table,marginBottom:0}}>
                <thead><tr>
                  <th style={css.th}>{t("Item","பொருள்")}</th>
                  {SLOTS.map(s=><th key={s.key} style={{...css.th,textAlign:"center",minWidth:130}}>{s.icon} {s.label}</th>)}
                </tr></thead>
                <tbody>
                  {poojaItems.map((pi,i)=>{
                    const hasAny=SLOTS.some(s=>getQty(tm.id,pi.id,s.key));
                    if(!hasAny)return null;
                    return(
                      <tr key={pi.id} style={{background:i%2===0?P.white:P.highlight}}>
                        <td style={css.td}><strong>{n(pi)}</strong></td>
                        {SLOTS.map(s=>{
                          const qty=getQty(tm.id,pi.id,s.key);
                          const done=isDispatched(tm.id,pi.id,s.key);
                          return(
                            <td key={s.key} style={{...css.td,textAlign:"center",background:done?"#E8F8E8":qty?s.bg:"transparent"}}>
                              {qty?(
                                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                                  <input type="number" min="0" step="0.5"
                                    style={{...css.inp,width:72,textAlign:"center",padding:"3px 6px",
                                      fontSize:13,fontWeight:700,background:"white",
                                      border:done?"2px solid #1A7A40":"1px solid #DCC88A"}}
                                    value={qty} onChange={e=>setQty(tm.id,pi.id,s.key,e.target.value)}
                                    disabled={done}/>
                                  <span style={{fontSize:10,color:P.muted}}>{pi.unit}</span>
                                  <button onClick={()=>toggleDispatch(tm.id,pi.id,s.key,n(tm),n(pi),pi.unit)}
                                    style={{...css.btn(done?"success":"ghost",true),fontSize:11,padding:"3px 12px"}}>
                                    {done?"✓ "+t("Done","முடிந்தது"):t("Dispatch","அனுப்பு")}
                                  </button>
                                </div>
                              ):<span style={{color:P.muted,fontSize:12}}>—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {view==="history"&&(()=>{
        const dayDels=poojaDels.filter(d=>d.date===dt);
        if(!dayDels.length)return <div style={{...css.card,textAlign:"center",color:P.muted}}>{t("No dispatches for this date.","இந்த தேதியில் பதிவு இல்லை.")}</div>;
        const byTemple={};
        dayDels.forEach(d=>{if(!byTemple[d.templeName])byTemple[d.templeName]=[];byTemple[d.templeName].push(d);});
        return Object.entries(byTemple).map(([name,dels])=>(
          <div key={name} style={{...css.card,marginBottom:8}}>
            <div style={{fontWeight:700,color:P.deepBrown,marginBottom:6}}>🛕 {name}</div>
            {dels.map(d=>(
              <div key={d.key} style={{display:"flex",gap:10,fontSize:12,padding:"4px 0",borderBottom:"1px solid #F0D8B0"}}>
                <span style={{flex:1,fontWeight:600}}>{d.itemName}</span>
                <span style={{color:P.muted}}>{d.slot==="morning"?"🌅":d.slot==="afternoon"?"☀️":"🌙"} {d.slot}</span>
                <span style={{fontWeight:700,color:P.saffron}}>{d.qty} {d.unit}</span>
                <span style={{color:"#888",fontSize:10}}>{new Date(d.dispatchedAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>
              </div>
            ))}
          </div>
        ));
      })()}
    </div>
  );
}

// ── Items to Send: clean, date-based, organized like the Kitchen Dish-wise report ──
function PoojaSendPage({ctx}){
  const {poojaTemples,poojaItems,occOrders,setPage,setQuickDate,lang:gLang}=ctx;
  const [lang,setLang]=useState(gLang);
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:(x.nameTamil||x.name);
  const [dt,setDt]=useState(TODAY);

  const DAYS=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const DAY_TA={sunday:"ஞாயிறு",monday:"திங்கள்",tuesday:"செவ்வாய்",wednesday:"புதன்",thursday:"வியாழன்",friday:"வெள்ளி",saturday:"சனி"};
  const dayKey=DAYS[new Date(dt).getDay()];
  const dayLabel=lang==="en"?dayKey.charAt(0).toUpperCase()+dayKey.slice(1):DAY_TA[dayKey];

  const SLOTS=[
    {key:"morning",label:t("Morning","காலை"),icon:"🌅"},
    {key:"afternoon",label:t("Afternoon","மதியம்"),icon:"☀️"},
    {key:"evening",label:t("Evening","மாலை"),icon:"🌙"},
  ];

  // Build: temple -> slot -> [{item,qty}]
  const templeSections=poojaTemples.map(tm=>{
    const slots=SLOTS.map(sl=>{
      const items=poojaItems
        .map(pi=>{
          const dd=tm.schedule?.[pi.id]?.[dayKey]||{};
          const qty=+dd[sl.key]||0;
          return qty>0?{item:pi,qty}:null;
        })
        .filter(Boolean);
      return{...sl,items};
    }).filter(sl=>sl.items.length>0);
    const total=slots.reduce((s,sl)=>s+sl.items.reduce((s2,x)=>s2+x.qty,0),0);
    return{temple:tm,slots,total};
  }).filter(s=>s.slots.length>0);

  const occSections=occOrders.filter(o=>o.date===dt).map(o=>({
    order:o,
    items:(o.items||[]).map(it=>{
      const pi=poojaItems.find(x=>x.id===it.itemId);
      return pi?{item:pi,qty:+it.qty||0}:null;
    }).filter(Boolean),
  }));

  const hasData=templeSections.length>0||occSections.length>0;

  const round2=v=>Math.round((+v||0)*100)/100;

  const doPrint=()=>{
    let blockNo=0;
    const templeBlocks=templeSections.map(({temple,slots,total})=>{
      blockNo++;
      const slotHtml=slots.map(sl=>{
        const rows=sl.items.map((x,i)=>`<tr>
          <td style="width:26px;text-align:right;padding:3px 6px 3px 0;color:#666;font-size:12px">${i+1}</td>
          <td style="padding:3px 4px;font-size:13px;font-weight:500">${n(x.item)}</td>
          <td style="padding:3px 0 3px 4px;text-align:right;font-size:13px;font-weight:700;white-space:nowrap">${round2(x.qty)} ${x.item.unit}</td>
        </tr>`).join("");
        return `<div style="margin:6px 0 8px 0">
          <div style="font-size:12px;font-weight:700;color:#555;margin-bottom:3px">${sl.icon} ${sl.label}</div>
          <table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table>
        </div>`;
      }).join("");
      return `<div style="margin-bottom:14px">
        <div style="display:flex;align-items:baseline;border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:4px">
          <span style="font-size:13px;font-weight:600;color:#555;margin-right:6px">${blockNo}</span>
          <span style="font-size:16px;font-weight:700;flex:1">🛕 ${n(temple)}</span>
          <span style="font-size:15px;font-weight:800">${round2(total)} ${t("items total","மொத்தம்")}</span>
        </div>
        ${slotHtml}
      </div>`;
    }).join("");

    const occBlocks=occSections.map(({order,items})=>{
      blockNo++;
      const rows=items.map((x,i)=>`<tr>
        <td style="width:26px;text-align:right;padding:3px 6px 3px 0;color:#666;font-size:12px">${i+1}</td>
        <td style="padding:3px 4px;font-size:13px;font-weight:500">${n(x.item)}</td>
        <td style="padding:3px 0 3px 4px;text-align:right;font-size:13px;font-weight:700;white-space:nowrap">${round2(x.qty)} ${x.item.unit}</td>
      </tr>`).join("");
      const nm=lang==="en"?order.templateName:(order.templateNameTamil||order.templateName);
      return `<div style="margin-bottom:14px">
        <div style="display:flex;align-items:baseline;border-bottom:2px solid #6B3FA0;padding-bottom:5px;margin-bottom:4px">
          <span style="font-size:13px;font-weight:600;color:#555;margin-right:6px">${blockNo}</span>
          <span style="font-size:16px;font-weight:700;flex:1;color:#6B3FA0">🕉️ ${nm}</span>
        </div>
        <table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table>
      </div>`;
    }).join("");

    printHTML(
      t("Items to Send","அனுப்ப வேண்டிய பொருட்கள்")+" — "+dayLabel+" "+dt,
      `<p style="font-size:12px;color:#555;margin:0 0 14px">${t("Date","தேதி")}: ${dt} (${dayLabel})</p>${templeBlocks}${occBlocks}`
    );
  };

  const doExport=()=>{
    const rows=[];
    templeSections.forEach(({temple,slots})=>{
      rows.push({Section:"🛕 "+n(temple),Slot:"",Item:"",Qty:"",Unit:""});
      slots.forEach(sl=>{
        sl.items.forEach(x=>rows.push({Section:"",Slot:sl.label,Item:n(x.item),Qty:round2(x.qty),Unit:x.item.unit}));
      });
      rows.push({Section:"",Slot:"",Item:"",Qty:"",Unit:""});
    });
    occSections.forEach(({order,items})=>{
      const nm=lang==="en"?order.templateName:(order.templateNameTamil||order.templateName);
      rows.push({Section:"🕉️ "+nm,Slot:"",Item:"",Qty:"",Unit:""});
      items.forEach(x=>rows.push({Section:"",Slot:"",Item:n(x.item),Qty:round2(x.qty),Unit:x.item.unit}));
      rows.push({Section:"",Slot:"",Item:"",Qty:"",Unit:""});
    });
    exportXlsxSheets("items_to_send_"+dt+".xlsx",[{name:"Items to Send",data:rows}]);
  };

  return(
    <div>
      <ReportBar onPrint={hasData?doPrint:null} onExport={hasData?doExport:null} lang={lang} setLang={setLang}>
        <div>
          <label style={css.lbl}>{t("Date","தேதி")}</label>
          <input type="date" style={{...css.inp,width:160}} value={dt} onChange={e=>setDt(e.target.value)}/>
        </div>
        <div style={{fontSize:11,color:P.muted,paddingBottom:6,fontWeight:600}}>📅 {dayLabel}</div>
        <button style={{...css.btn("ghost",true),borderColor:P.success,color:P.success}} onClick={()=>{setQuickDate(dt);setPage("pooja_weekshop");}}>
          🛒 {t("Purchase for this date","இந்த தேதிக்கு கொள்முதல்")}
        </button>
      </ReportBar>
      <div style={{fontSize:11,color:P.muted,marginBottom:14}}>
        {t("Everything scheduled to go out on this date — recurring temple items plus any Moolam/Pradosham/etc. occasion orders that fall on it.","இந்த தேதியில் அனுப்பப்பட வேண்டிய அனைத்தும் — வழக்கமான கோவில் பொருட்கள் மற்றும் சிறப்பு நாள் ஆர்டர்கள்.")}
      </div>

      {!hasData?(
        <div style={{color:P.muted,textAlign:"center",padding:32}}>{t("Nothing scheduled to send on this date.","இந்த தேதியில் எதுவும் அனுப்ப வேண்டியதில்லை.")}</div>
      ):(
        <>
          {templeSections.map(({temple,slots,total})=>(
            <div key={temple.id} style={{...css.card,marginBottom:16,border:"1px solid #333"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:P.deepBrown}}>🛕 {n(temple)}</span>
                </div>
                <span style={{...css.badge(P.saffron),fontSize:12,padding:"4px 12px"}}>{round2(total)} {t("items total","மொத்தம்")}</span>
              </div>
              {slots.map(sl=>(
                <div key={sl.key} style={{marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:P.muted,marginBottom:4}}>{sl.icon} {sl.label}</div>
                  <div style={{border:"1px solid #DDD",borderRadius:4,overflow:"hidden"}}>
                    {sl.items.map((x,i)=>(
                      <div key={x.item.id} style={{display:"flex",alignItems:"baseline",padding:"5px 10px",
                        background:i%2===1?"#F5F5F5":"white",borderBottom:"1px solid #E8E8E8"}}>
                        <span style={{fontSize:11,color:"#888",width:22,flexShrink:0,textAlign:"right",marginRight:8}}>{i+1}</span>
                        <span style={{fontSize:13,fontWeight:500,color:"#111",flex:1}}>{n(x.item)}</span>
                        <span style={{fontSize:13,fontWeight:700,color:"#111"}}>{round2(x.qty)} {x.item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {occSections.map(({order,items})=>{
            const nm=lang==="en"?order.templateName:(order.templateNameTamil||order.templateName);
            return(
              <div key={order.id} style={{...css.card,marginBottom:16,border:"1px solid "+P.purple+"55"}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:P.purple,marginBottom:10}}>
                  🕉️ {nm}
                </div>
                <div style={{border:"1px solid #DDD",borderRadius:4,overflow:"hidden"}}>
                  {items.map((x,i)=>(
                    <div key={x.item.id} style={{display:"flex",alignItems:"baseline",padding:"5px 10px",
                      background:i%2===1?"#F5F5F5":"white",borderBottom:"1px solid #E8E8E8"}}>
                      <span style={{fontSize:11,color:"#888",width:22,flexShrink:0,textAlign:"right",marginRight:8}}>{i+1}</span>
                      <span style={{fontSize:13,fontWeight:500,color:"#111",flex:1}}>{n(x.item)}</span>
                      <span style={{fontSize:13,fontWeight:700,color:"#111"}}>{round2(x.qty)} {x.item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Purchase Summary ───────────────────────────────────────────────────────
function PoojaPurchasePage({ctx}){
  const {poojaTemples,poojaItems,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const DAYS=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const [selDay,setSelDay]=useState("monday");
  const DAY_LABEL={monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat",sunday:"Sun"};

  // Aggregate for selected day — uses temple.schedule[itemId][day][slot] (new structure)
  const totals={};
  poojaTemples.forEach(tm=>{
    poojaItems.forEach(pi=>{
      const dayData=(tm.schedule?.[pi.id]?.[selDay])||{};
      const m=+dayData.morning||0,a=+dayData.afternoon||0,e=+dayData.evening||0;
      if(!m&&!a&&!e)return;
      if(!totals[pi.id])totals[pi.id]={item:pi,morning:0,afternoon:0,evening:0,temples:[]};
      totals[pi.id].morning+=m;
      totals[pi.id].afternoon+=a;
      totals[pi.id].evening+=e;
      totals[pi.id].temples.push({name:tm.name,m,a,e});
    });
  });
  const rows=Object.values(totals).sort((a,b)=>a.item.name.localeCompare(b.item.name));

  const exportPO=()=>{
    const data=rows.map((r,i)=>({
      Item:r.item.name,Unit:r.item.unit,
      [t("Morning","காலை")]:r.morning||"",
      [t("Afternoon","மதியம்")]:r.afternoon||"",
      [t("Evening","மாலை")]:r.evening||"",
      [t("Total","மொத்தம்")]:r.morning+r.afternoon+r.evening,
      Available:"",
      [t("To Purchase","வாங்க")]:{f:`IF(G${i+2}="",F${i+2},MAX(0,F${i+2}-G${i+2}))`},
      [t("Temples","கோவில்கள்")]:r.temples.map(tt=>`${tt.name}(${tt.m||0}/${tt.a||0}/${tt.e||0})`).join(", "),
    }));
    exportXlsxSheets("pooja_purchase_"+selDay+".xlsx",[{name:DAY_LABEL[selDay],data}]);
  };

  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:P.muted,marginRight:4}}>{t("Day:","நாள்:")}</span>
        {DAYS.map(d=><button key={d} style={{...css.btn(selDay===d?"primary":"ghost",true),
          minWidth:44,padding:"4px 10px",fontSize:12}} onClick={()=>setSelDay(d)}>{DAY_LABEL[d]}</button>)}
        <button style={{...css.btn("success",true),marginLeft:"auto"}} onClick={exportPO}>📋 {t("Purchase Order","கொள்முதல் ஆர்டர்")}</button>
      </div>

      {!rows.length?<div style={{...css.card,textAlign:"center",color:P.muted}}>{t("No items scheduled for this day.","இந்த நாளில் அட்டவணை இல்லை.")}</div>:(
        <div style={{...css.card,padding:0,overflow:"hidden"}}>
          <table style={css.table}>
            <thead><tr>
              <th style={css.th}>{t("Item","பொருள்")}</th>
              <th style={{...css.th,textAlign:"center"}}>🌅</th>
              <th style={{...css.th,textAlign:"center"}}>☀️</th>
              <th style={{...css.th,textAlign:"center"}}>🌙</th>
              <th style={{...css.th,textAlign:"center"}}>{t("Total","மொத்தம்")}</th>
              <th style={css.th}>{t("Temples","கோவில்கள்")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={r.item.id} style={{background:i%2===0?P.white:P.highlight}}>
                  <td style={css.td}><strong>{r.item.name}</strong></td>
                  <td style={{...css.td,textAlign:"center"}}>{r.morning?<strong style={{color:"#1a5276"}}>{r.morning} {r.item.unit}</strong>:"—"}</td>
                  <td style={{...css.td,textAlign:"center"}}>{r.afternoon?<strong style={{color:"#784212"}}>{r.afternoon} {r.item.unit}</strong>:"—"}</td>
                  <td style={{...css.td,textAlign:"center"}}>{r.evening?<strong style={{color:"#1a237e"}}>{r.evening} {r.item.unit}</strong>:"—"}</td>
                  <td style={{...css.td,textAlign:"center"}}><strong style={{color:P.saffron,fontSize:14}}>{r.morning+r.afternoon+r.evening} {r.item.unit}</strong></td>
                  <td style={css.td}><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{r.temples.map(tt=><span key={tt.name} style={{...css.badge(P.muted),fontSize:10}}>{tt.name}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



// ════════════════════════════════════════════════════════════════════
// TEMPLE OCCASIONS MODULE (Moolam/star, Ekadasi, Pradosham, Ashtami, Gurupooja...)
// ════════════════════════════════════════════════════════════════════
function PoojaWeeklyIssuePage({ctx}){
  const {poojaTemples,poojaItems,lang:gLang}=ctx;
  const [lang,setLang]=useState(gLang);
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:(x.nameTamil||x.name);
  const DAYS=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const DAY_LABEL={monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri",saturday:"Sat",sunday:"Sun"};
  const DAY_LABEL_TA={monday:"திங்கள்",tuesday:"செவ்வாய்",wednesday:"புதன்",thursday:"வியாழன்",friday:"வெள்ளி",saturday:"சனி",sunday:"ஞாயிறு"};
  const dayN=d=>lang==="en"?DAY_LABEL[d]:DAY_LABEL_TA[d];
  const [templeF,setTempleF]=useState("all");

  const temples=templeF==="all"?poojaTemples:poojaTemples.filter(tm=>tm.id===+templeF);

  const dayTotal=(pi,d)=>{
    let sum=0;
    temples.forEach(tm=>{
      const dd=tm.schedule?.[pi.id]?.[d]||{};
      sum+=(+dd.morning||0)+(+dd.afternoon||0)+(+dd.evening||0);
    });
    return sum;
  };

  const rows=poojaItems.map(pi=>{
    const byDay={};
    DAYS.forEach(d=>{const s=dayTotal(pi,d); if(s>0)byDay[d]=s;});
    return{item:pi,byDay,total:Object.values(byDay).reduce((s,v)=>s+v,0)};
  }).filter(r=>r.total>0);

  const hasData=rows.length>0;
  const templeLabel=templeF==="all"?t("All Temples","அனைத்து கோவில்கள்"):(poojaTemples.find(tm=>tm.id===+templeF)?.name||"");

  const doPrint=()=>{
    const dayHeaders=DAYS.map(d=>"<th style='text-align:center'>"+dayN(d)+"</th>").join("");
    const trows=rows.map(r=>{
      const cells=DAYS.map(d=>"<td style='text-align:center'>"+(r.byDay[d]?"<strong>"+r.byDay[d]+" "+r.item.unit+"</strong>":"—")+"</td>").join("");
      return "<tr><td><strong>"+n(r.item)+"</strong></td>"+cells+"<td style='text-align:center;background:#fffbe8'><strong>"+r.total+" "+r.item.unit+"</strong></td></tr>";
    }).join("");
    const thead="<thead><tr><th>"+t("Item","பொருள்")+"</th>"+dayHeaders+"<th>"+t("Weekly Total","வார மொத்தம்")+"</th></tr></thead>";
    printHTML(t("Weekly Issue List","வார அனுப்புதல் பட்டியல்")+" ("+templeLabel+")",
      "<p style='color:#9B7355;margin:0 0 12px;font-size:12px'>"+t("Temple","கோவில்")+": "+templeLabel+"</p><table>"+thead+"<tbody>"+trows+"</tbody></table>");
  };

  const doExport=()=>{
    const data=rows.map(r=>{
      const obj={[t("Item","பொருள்")]:n(r.item)};
      DAYS.forEach(d=>{obj[dayN(d)]=r.byDay[d]||"";});
      obj[t("Weekly Total","வார மொத்தம்")]=r.total;
      obj[t("Unit","அலகு")]=r.item.unit;
      return obj;
    });
    exportXlsxSheets("weekly_issue_list_"+templeF+".xlsx",[{name:"Weekly Issue",data}]);
  };

  return(
    <div>
      <ReportBar onPrint={hasData?doPrint:null} onExport={hasData?doExport:null} lang={lang} setLang={setLang}>
        <div>
          <label style={css.lbl}>{t("Temple","கோவில்")}</label>
          <select style={{...css.sel,minWidth:180}} value={templeF} onChange={e=>setTempleF(e.target.value)}>
            <option value="all">{t("All Temples","அனைத்து கோவில்கள்")}</option>
            {poojaTemples.map(tm=><option key={tm.id} value={tm.id}>{n(tm)}</option>)}
          </select>
        </div>
      </ReportBar>
      {!hasData?(
        <div style={{color:P.muted,textAlign:"center",padding:32}}>{t("No weekly schedule set up yet. Configure it in Temples & Lists.","அட்டவணை இல்லை.")}</div>
      ):(
        <div style={{...css.card,padding:0,overflow:"auto"}}>
          <table style={css.table}>
            <thead><tr>
              <th style={css.th}>{t("Item","பொருள்")}</th>
              {DAYS.map(d=><th key={d} style={{...css.th,textAlign:"center",minWidth:70}}>{dayN(d)}</th>)}
              <th style={{...css.th,background:"#7C4A00",textAlign:"center"}}>{t("Weekly Total","வார மொத்தம்")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={r.item.id} style={{background:i%2===0?P.white:P.highlight}}>
                  <td style={css.td}><strong>{n(r.item)}</strong></td>
                  {DAYS.map(d=>(
                    <td key={d} style={{...css.td,textAlign:"center"}}>
                      {r.byDay[d]?<strong style={{color:P.saffron}}>{r.byDay[d]}</strong>:<span style={{color:"#DDD"}}>—</span>}
                    </td>
                  ))}
                  <td style={{...css.td,textAlign:"center",background:"#FFFBE8"}}><strong>{r.total} {r.item.unit}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PoojaWeeklyShopPage({ctx}){
  const {poojaTemples,poojaItems,occOrders,quickDate,lang:gLang}=ctx;
  const [lang,setLang]=useState(gLang);
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:(x.nameTamil||x.name);
  const [fromDate,setFromDate]=useState(quickDate||TODAY);
  const [toDate,setToDate]=useState(quickDate||TODAY);

  const DAYS=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

  const sortedDates=useMemo(()=>{
    const dates=[]; const start=new Date(fromDate); const end=new Date(toDate);
    if(start>end)return[fromDate];
    const cur=new Date(start);
    while(cur<=end){dates.push(cur.toISOString().slice(0,10));cur.setDate(cur.getDate()+1);}
    return dates;
  },[fromDate,toDate]);

  // Build dynamic columns: one per temple + one per distinct occasion template name used in range
  const { rows, columns } = useMemo(()=>{
    const templeCols=poojaTemples.map(tm=>({key:"tm_"+tm.id,label:tm.name,type:"temple",id:tm.id}));
    const occNames=[...new Set(
      occOrders.filter(o=>sortedDates.includes(o.date)).map(o=>o.templateName)
    )];
    const occCols=occNames.map(nm=>({key:"occ_"+nm,label:nm,type:"occasion"}));
    const columns=[...templeCols,...occCols];

    const data={}; // itemId -> { colKey: qty }
    // Temple recurring schedule, expanded across each date in range
    sortedDates.forEach(dt=>{
      const dow=DAYS[new Date(dt).getDay()];
      poojaTemples.forEach(tm=>{
        poojaItems.forEach(pi=>{
          const dd=tm.schedule?.[pi.id]?.[dow]||{};
          const sum=(+dd.morning||0)+(+dd.afternoon||0)+(+dd.evening||0);
          if(!sum)return;
          if(!data[pi.id])data[pi.id]={};
          const key="tm_"+tm.id;
          data[pi.id][key]=(data[pi.id][key]||0)+sum;
        });
      });
    });
    // Occasion orders within range
    occOrders.filter(o=>sortedDates.includes(o.date)).forEach(o=>{
      (o.items||[]).forEach(it=>{
        if(!data[it.itemId])data[it.itemId]={};
        const key="occ_"+o.templateName;
        data[it.itemId][key]=(data[it.itemId][key]||0)+(+it.qty||0);
      });
    });

    const rows=poojaItems.map(pi=>{
      const byCol=data[pi.id]||{};
      const total=Object.values(byCol).reduce((s,v)=>s+v,0);
      return{item:pi,byCol,total};
    }).filter(r=>r.total>0).sort((a,b)=>n(a.item).localeCompare(n(b.item)));

    return{rows,columns:columns.filter(c=>rows.some(r=>r.byCol[c.key]))};
  },[sortedDates,poojaTemples,poojaItems,occOrders,lang]);

  const hasData=rows.length>0;
  const round2=v=>Math.round((+v||0)*100)/100;

  const doExport=()=>{
    const data=rows.map(r=>{
      const obj={[t("Item","பொருள்")]:n(r.item),[t("Unit","அலகு")]:r.item.unit};
      columns.forEach(c=>{obj[c.label]=r.byCol[c.key]?round2(r.byCol[c.key]):"";});
      obj[t("Total","மொத்தம்")]=round2(r.total);
      return obj;
    });
    exportXlsxSheets("shopping_list_"+fromDate+"_to_"+toDate+".xlsx",[{name:"Shopping List",data}]);
  };

  const doPrint=()=>{
    const colHeaders=columns.map(c=>"<th style='text-align:center'>"+c.label+"</th>").join("");
    const trows=rows.map(r=>{
      const cells=columns.map(c=>"<td style='text-align:center'>"+(r.byCol[c.key]?"<strong>"+round2(r.byCol[c.key])+"</strong>":"—")+"</td>").join("");
      return "<tr><td><strong>"+n(r.item)+"</strong></td>"+cells+"<td style='text-align:center;background:#fffbe8'><strong>"+round2(r.total)+" "+r.item.unit+"</strong></td></tr>";
    }).join("");
    const thead="<thead><tr><th>"+t("Item","பொருள்")+"</th>"+colHeaders+"<th>"+t("Total","மொத்தம்")+"</th></tr></thead>";
    printHTML(t("Shopping List","கொள்முதல் பட்டியல்")+" ("+fromDate+" – "+toDate+")",
      "<p style='color:#9B7355;margin:0 0 12px;font-size:12px'>"+t("Range","வரம்பு")+": "+fromDate+" – "+toDate+"</p><table>"+thead+"<tbody>"+trows+"</tbody></table>");
  };

  return(
    <div>
      <ReportBar onPrint={hasData?doPrint:null} onExport={hasData?doExport:null} lang={lang} setLang={setLang}>
        <div>
          <label style={css.lbl}>{t("From","இருந்து")}</label>
          <input type="date" style={{...css.inp,width:150}} value={fromDate}
            onChange={e=>{setFromDate(e.target.value);if(e.target.value>toDate)setToDate(e.target.value);}}/>
        </div>
        <div>
          <label style={css.lbl}>{t("To","வரை")}</label>
          <input type="date" style={{...css.inp,width:150}} value={toDate}
            onChange={e=>{setToDate(e.target.value);if(e.target.value<fromDate)setFromDate(e.target.value);}}/>
        </div>
        <div style={{fontSize:11,color:P.muted,paddingBottom:6}}>{sortedDates.length} {t("day(s)","நாள்")}</div>
      </ReportBar>
      <div style={{fontSize:11,color:P.muted,marginBottom:10}}>
        {t("Combines each temple's recurring weekly schedule with any one-off occasion orders (Moolam, Pradosham, etc.) whose date falls in this range.","கோவில்களின் வார அட்டவணை மற்றும் இந்த வரம்பில் உள்ள சிறப்பு நாள் ஆர்டர்களை (மூலம், பிரதோஷம்) இணைக்கிறது.")}
      </div>
      {!hasData?(
        <div style={{color:P.muted,textAlign:"center",padding:32}}>{t("No items scheduled or ordered in this date range.","இந்த வரம்பில் பொருட்கள் இல்லை.")}</div>
      ):(
        <div style={{...css.card,padding:0,overflow:"auto"}}>
          <table style={css.table}>
            <thead><tr>
              <th style={css.th}>{t("Item","பொருள்")}</th>
              {columns.map(c=>(
                <th key={c.key} style={{...css.th,textAlign:"center",minWidth:100,
                  background:c.type==="occasion"?P.purple:P.nav}}>{c.label}</th>
              ))}
              <th style={{...css.th,background:"#7C4A00",textAlign:"center"}}>{t("All / Total","அனைத்தும்")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={r.item.id} style={{background:i%2===0?P.white:P.highlight}}>
                  <td style={css.td}><strong>{n(r.item)}</strong></td>
                  {columns.map(c=>(
                    <td key={c.key} style={{...css.td,textAlign:"center"}}>
                      {r.byCol[c.key]?<strong style={{color:c.type==="occasion"?P.purple:P.saffron}}>{round2(r.byCol[c.key])}</strong>:<span style={{color:"#DDD"}}>—</span>}
                    </td>
                  ))}
                  <td style={{...css.td,textAlign:"center",background:"#FFFBE8"}}><strong>{round2(r.total)} {r.item.unit}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OccTemplatesPage({ctx}){
  const {poojaItems,occTemplates,setOccTemplates,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:(x.nameTamil||x.name);
  const [form,setForm]=useState({name:"",nameTamil:""});
  const [openId,setOpenId]=useState(null);
  const [ni,setNi]=useState({itemId:"",qty:""});
  const fRef=useRef();
  const [importTarget,setImportTarget]=useState(null);
  const [importMsg,setImportMsg]=useState({});

  const addTemplate=()=>{
    if(!form.name.trim())return;
    setOccTemplates(p=>[...p,{id:Date.now(),name:form.name.trim(),nameTamil:form.nameTamil.trim(),items:[]}]);
    setForm({name:"",nameTamil:""});
  };
  const delTemplate=(id)=>{if(confirm(t("Delete this template?","இந்த மாதிரியை நீக்கவா?")))setOccTemplates(p=>p.filter(x=>x.id!==id));};

  const addItem=(tplId)=>{
    if(!ni.itemId||!ni.qty)return;
    setOccTemplates(p=>p.map(tp=>tp.id!==tplId?tp:{...tp,items:[...(tp.items||[]),{itemId:+ni.itemId,qty:+ni.qty}]}));
    setNi({itemId:"",qty:""});
  };
  const rmItem=(tplId,idx)=>setOccTemplates(p=>p.map(tp=>tp.id!==tplId?tp:{...tp,items:tp.items.filter((_,j)=>j!==idx)}));
  const changeItemQty=(tplId,idx,qty)=>setOccTemplates(p=>p.map(tp=>tp.id!==tplId?tp:{...tp,items:tp.items.map((it,j)=>j===idx?{...it,qty:+qty}:it)}));

  const startImport=(tplId)=>{setImportTarget(tplId);fRef.current.click();};
  const importXlsx=e=>{
    const file=e.target.files[0]; if(!file||!importTarget)return;
    const tplId=importTarget;
    const reader=new FileReader();
    reader.onload=ev=>{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
      const valid=rows.filter(r=>(r.name+"").trim()&&(r.qty!==""));
      if(!valid.length){alert("No valid rows found. Make sure row 1 has headers: name, qty");return;}
      let matched=0,unmatched=[];
      const upserts=[];
      valid.forEach(r=>{
        const nameLC=(r.name+"").trim().toLowerCase();
        const pi=poojaItems.find(x=>x.name.toLowerCase()===nameLC||(x.nameTamil||"").toLowerCase()===nameLC);
        if(!pi){unmatched.push(r.name);return;}
        matched++;
        upserts.push({itemId:pi.id,qty:+r.qty});
      });
      setOccTemplates(p=>p.map(tp=>{
        if(tp.id!==tplId)return tp;
        const items=[...(tp.items||[])];
        upserts.forEach(u=>{
          const idx=items.findIndex(x=>x.itemId===u.itemId);
          if(idx>=0)items[idx]={...items[idx],qty:u.qty};
          else items.push(u);
        });
        return{...tp,items};
      }));
      setImportMsg(m=>({...m,[tplId]:matched+" imported"+(unmatched.length?", "+unmatched.length+" not found: "+unmatched.slice(0,5).join(", "):"")}));
    };
    reader.readAsBinaryString(file);
    e.target.value="";
    setImportTarget(null);
  };

  return(
    <div>
      <input ref={fRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={importXlsx}/>
      <div style={css.card}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:P.deepBrown,marginBottom:12}}>
          🕉️ {t("New Occasion Template","புதிய மாதிரி")}
        </div>
        <div style={{fontSize:11,color:P.muted,marginBottom:10}}>
          {t("e.g. Moolam, a specific star, Ekadasi, Pradosham, Ashtami, Gurupooja — each with its own fixed item list.","எ.கா. மூலம், நட்சத்திரம், ஏகாதசி, பிரதோஷம், அஷ்டமி, குருபூஜை.")}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={css.lbl}>{t("Name","பெயர்")}</label>
            <input style={css.inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addTemplate()} placeholder="Moolam"/>
          </div>
          <div><label style={css.lbl}>{t("Tamil Name","தமிழ் பெயர்")}</label>
            <input style={{...css.inp,fontFamily:"Noto Sans Tamil"}} value={form.nameTamil} onChange={e=>setForm({...form,nameTamil:e.target.value})} placeholder="மூலம்"/>
          </div>
        </div>
        <button style={css.btn()} onClick={addTemplate}>+ {t("Add Template","சேர்")}</button>
      </div>

      {!poojaItems.length&&(
        <div style={{...css.card,color:"#92400E",background:"#FFF3CD",border:"1px solid #F59E0B",textAlign:"center"}}>
          ⚠️ {t("Add items in Pooja Material → Items Master first, then build templates here.","முதலில் Items Master-இல் பொருட்கள் சேர்க்கவும்.")}
        </div>
      )}

      {occTemplates.map(tpl=>{
        const isOpen=openId===tpl.id;
        return(
          <div key={tpl.id} style={{...css.card,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <strong style={{color:P.deepBrown,fontSize:14}}>{n(tpl)}</strong>
              <div style={{display:"flex",gap:6}}>
                <button style={css.btn(isOpen?"primary":"ghost",true)} onClick={()=>setOpenId(isOpen?null:tpl.id)}>
                  {isOpen?"▲":"▼"} {t("Items","பொருட்கள்")} <span style={{marginLeft:4,fontSize:11,opacity:0.8}}>({(tpl.items||[]).length})</span>
                </button>
                <button style={css.btn("danger",true)} onClick={()=>delTemplate(tpl.id)}>🗑</button>
              </div>
            </div>
            {isOpen&&(
              <div style={{marginTop:12,borderTop:"1px solid #F0D8B0",paddingTop:12}}>
                <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
                  <select style={{...css.sel,flex:2,minWidth:160}} value={ni.itemId} onChange={e=>setNi({...ni,itemId:e.target.value})}>
                    <option value="">{t("Select item...","தேர்வு...")}</option>
                    {poojaItems.map(pi=><option key={pi.id} value={pi.id}>{n(pi)} ({pi.unit})</option>)}
                  </select>
                  <input type="number" min="0" step="0.5" placeholder={t("Qty","அளவு")} style={{...css.inp,width:90}} value={ni.qty} onChange={e=>setNi({...ni,qty:e.target.value})}/>
                  <button style={css.btn()} onClick={()=>addItem(tpl.id)}>+ {t("Add","சேர்")}</button>
                  <button style={css.btn("success",true)} onClick={()=>startImport(tpl.id)}>📤 {t("Import Excel","Excel இறக்கு")}</button>
                </div>
                <div style={{fontSize:11,color:P.muted,marginBottom:8}}>
                  {t("Import expects column headers: name, qty (name matched against Items Master, English or Tamil).","தலைப்புகள்: name, qty.")}
                </div>
                {importMsg[tpl.id]&&<div style={{fontSize:11,color:P.success,marginBottom:8}}>✓ {importMsg[tpl.id]}</div>}
                {(tpl.items||[]).length>0?(
                  <table style={css.table}>
                    <thead><tr><th style={css.th}>{t("Item","பொருள்")}</th><th style={css.th}>{t("Qty","அளவு")}</th><th style={css.th}></th></tr></thead>
                    <tbody>
                      {tpl.items.map((it,i)=>{
                        const pi=poojaItems.find(x=>x.id===it.itemId);
                        return(
                          <tr key={i} style={{background:i%2===0?P.white:P.highlight}}>
                            <td style={css.td}><strong>{pi?n(pi):"?"}</strong></td>
                            <td style={css.td}>
                              <div style={{display:"flex",alignItems:"center",gap:4}}>
                                <input type="number" step="0.5" style={{...css.inp,width:80,padding:"3px 6px"}} value={it.qty} onChange={e=>changeItemQty(tpl.id,i,e.target.value)}/>
                                <span style={{fontSize:11,color:P.muted}}>{pi?.unit}</span>
                              </div>
                            </td>
                            <td style={css.td}><button style={css.btn("danger",true)} onClick={()=>rmItem(tpl.id,i)}>✕</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ):<div style={{color:P.muted,fontSize:12,textAlign:"center",padding:10}}>{t("No items yet.","பொருட்கள் இல்லை.")}</div>}
              </div>
            )}
          </div>
        );
      })}
      {!occTemplates.length&&<div style={{...css.card,textAlign:"center",color:P.muted,padding:24}}>{t("No templates yet. Add one above (e.g. Moolam, Ekadasi, Pradosham, Ashtami, Gurupooja).","மாதிரிகள் இல்லை.")}</div>}
    </div>
  );
}

function OccOrdersPage({ctx}){
  const {poojaItems,occTemplates,occOrders,setOccOrders,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:(x.nameTamil||x.name);
  const [tplId,setTplId]=useState("");
  const [date,setDate]=useState(TODAY);
  const [openId,setOpenId]=useState(null);
  const [ni,setNi]=useState({itemId:"",qty:""});
  const [dateQ,setDateQ]=useState("");

  const createOrder=()=>{
    if(!tplId){alert(t("Select a template","மாதிரி தேர்வு செய்யவும்"));return;}
    const tpl=occTemplates.find(x=>x.id===+tplId);
    if(!tpl)return;
    const newOrd={
      id:Date.now(),templateId:tpl.id,templateName:tpl.name,templateNameTamil:tpl.nameTamil,
      date,items:(tpl.items||[]).map(it=>({...it})),
    };
    setOccOrders(p=>[...p,newOrd]);
    setOpenId(newOrd.id);
  };

  const delOrder=(id)=>{if(confirm(t("Delete this order?","நீக்கவா?")))setOccOrders(p=>p.filter(x=>x.id!==id));};

  // Known remaining-2026 dates (Chennai/Tamil Nadu panchangam) for quick bulk creation
  const BULK_DATES={
    moolam:["2026-07-26","2026-08-22","2026-09-19","2026-10-16","2026-11-12","2026-12-09"],
    uthiram:["2026-08-16","2026-09-12","2026-10-09","2026-11-05","2026-12-03","2026-12-30"],
    pradosham:["2026-07-26","2026-08-10","2026-08-25","2026-09-08","2026-09-24","2026-10-08","2026-10-23","2026-11-06","2026-11-22","2026-12-06","2026-12-21"],
  };
  const [bulkMsg,setBulkMsg]=useState("");
  const bulkCreate=(key,label)=>{
    const tpl=occTemplates.find(x=>x.name.toLowerCase().includes(key));
    if(!tpl){setBulkMsg(t("No template found named","")+" \""+label+"\" — "+t("create it first in Templates.","முதலில் மாதிரி உருவாக்கவும்."));return;}
    const dates=BULK_DATES[key];
    const existing=new Set(occOrders.filter(o=>o.templateId===tpl.id).map(o=>o.date));
    const toCreate=dates.filter(d=>!existing.has(d));
    if(!toCreate.length){setBulkMsg(t("All dates already have orders for","")+" "+tpl.name+".");return;}
    const newOrders=toCreate.map((d,i)=>({
      id:Date.now()+i,templateId:tpl.id,templateName:tpl.name,templateNameTamil:tpl.nameTamil,
      date:d,items:(tpl.items||[]).map(it=>({...it})),
    }));
    setOccOrders(p=>[...p,...newOrders]);
    setBulkMsg(toCreate.length+" "+t("order(s) created for","ஆர்டர்கள் உருவாக்கப்பட்டன")+" "+tpl.name+
      (dates.length-toCreate.length>0?" ("+(dates.length-toCreate.length)+" "+t("already existed, skipped","ஏற்கனவே உள்ளன")+")":""));
  };

  // ── Custom bulk create: any template, any pasted list of dates (e.g. Gurupooja once dates are known) ──
  const [customTplId,setCustomTplId]=useState("");
  const [customDatesText,setCustomDatesText]=useState("");
  const [customMsg,setCustomMsg]=useState("");
  const bulkCreateCustom=()=>{
    const tpl=occTemplates.find(x=>x.id===+customTplId);
    if(!tpl){setCustomMsg(t("Select a template first.","முதலில் மாதிரி தேர்வு செய்யவும்."));return;}
    const dates=[...new Set(customDatesText.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean))];
    if(!dates.length){setCustomMsg(t("Paste at least one date (YYYY-MM-DD, one per line or comma-separated).","குறைந்தது ஒரு தேதியையாவது சேர்க்கவும்."));return;}
    const bad=dates.filter(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d));
    if(bad.length){setCustomMsg(t("Invalid date format (use YYYY-MM-DD):","தவறான தேதி வடிவம்:")+" "+bad.slice(0,5).join(", "));return;}
    const existing=new Set(occOrders.filter(o=>o.templateId===tpl.id).map(o=>o.date));
    const toCreate=dates.filter(d=>!existing.has(d));
    if(!toCreate.length){setCustomMsg(t("All dates already have orders for","")+" "+tpl.name+".");return;}
    const newOrders=toCreate.map((d,i)=>({
      id:Date.now()+i,templateId:tpl.id,templateName:tpl.name,templateNameTamil:tpl.nameTamil,
      date:d,items:(tpl.items||[]).map(it=>({...it})),
    }));
    setOccOrders(p=>[...p,...newOrders]);
    setCustomMsg(toCreate.length+" "+t("order(s) created for","ஆர்டர்கள் உருவாக்கப்பட்டன")+" "+tpl.name+
      (dates.length-toCreate.length>0?" ("+(dates.length-toCreate.length)+" "+t("already existed, skipped","ஏற்கனவே உள்ளன")+")":""));
    setCustomDatesText("");
  };

  const addItem=(ordId)=>{
    if(!ni.itemId||!ni.qty)return;
    setOccOrders(p=>p.map(o=>o.id!==ordId?o:{...o,items:[...(o.items||[]),{itemId:+ni.itemId,qty:+ni.qty}]}));
    setNi({itemId:"",qty:""});
  };
  const rmItem=(ordId,idx)=>setOccOrders(p=>p.map(o=>o.id!==ordId?o:{...o,items:o.items.filter((_,j)=>j!==idx)}));
  const changeItemQty=(ordId,idx,qty)=>setOccOrders(p=>p.map(o=>o.id!==ordId?o:{...o,items:o.items.map((it,j)=>j===idx?{...it,qty:+qty}:it)}));

  const filtered=[...occOrders].sort((a,b)=>b.date.localeCompare(a.date))
    .filter(o=>!dateQ||o.date.replace(/-/g,"").includes(dateQ.replace(/-/g,"")));

  return(
    <div>
      <div data-tour="occ-bulk-create" style={{...css.card,background:"#F3F0FF",border:"1px solid #C4B5FD"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:P.purple,marginBottom:8}}>
          ⚡ {t("Bulk Create — Known 2026 Dates","குவிப்பு உருவாக்கம் — 2026 தேதிகள்")}
        </div>
        <div style={{fontSize:11,color:P.muted,marginBottom:10}}>
          {t("Creates one order per remaining 2026 date, matched to a template by name (e.g. a template named \"Moolam\"). Existing dates are skipped automatically.","பெயர் பொருந்தும் மாதிரிக்கு ஆர்டர்கள் உருவாக்கப்படும்.")}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button style={css.btn("primary")} onClick={()=>bulkCreate("moolam","Moolam")}>🌕 {t("Moolam (6 dates)","மூலம் (6)")}</button>
          <button style={css.btn("info")} onClick={()=>bulkCreate("uthiram","Uthiram")}>⭐ {t("Uthiram (6 dates)","உத்திரம் (6)")}</button>
          <button style={css.btn("success")} onClick={()=>bulkCreate("pradosham","Pradosham")}>🕉️ {t("Pradosham (11 dates)","பிரதோஷம் (11)")}</button>
        </div>
        {bulkMsg&&<div style={{fontSize:12,color:P.deepBrown,marginTop:10,fontWeight:600}}>{bulkMsg}</div>}
      </div>

      <div style={{...css.card,background:"#FFF8EC",border:"1px solid #F5D76E"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:P.deepBrown,marginBottom:8}}>
          📆 {t("Custom Bulk Create — Any Template, Any Dates","தனிப்பயன் குவிப்பு — எந்த மாதிரி, எந்த தேதி")}
        </div>
        <div style={{fontSize:11,color:P.muted,marginBottom:10}}>
          {t("For occasions without a fixed panchang list — e.g. Gurupooja. Pick a template, paste the dates (YYYY-MM-DD, one per line or comma-separated), and create them all at once.","இது நிலையான தேதிகள் இல்லாத சிறப்பு நாட்களுக்கு — எ.கா. குருபூஜை.")}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-start"}}>
          <div>
            <label style={css.lbl}>{t("Template","மாதிரி")}</label>
            <select style={{...css.sel,minWidth:180}} value={customTplId} onChange={e=>setCustomTplId(e.target.value)}>
              <option value="">{t("Select template...","மாதிரி தேர்வு...")}</option>
              {occTemplates.map(tp=><option key={tp.id} value={tp.id}>{lang==="en"?tp.name:(tp.nameTamil||tp.name)}</option>)}
            </select>
          </div>
          <div style={{flex:1,minWidth:220}}>
            <label style={css.lbl}>{t("Dates","தேதிகள்")}</label>
            <textarea style={{...css.inp,minHeight:70,fontFamily:"monospace",fontSize:12}} value={customDatesText}
              onChange={e=>setCustomDatesText(e.target.value)}
              placeholder={"2026-09-05\n2026-10-03\n2026-11-01"}/>
          </div>
          <button style={{...css.btn("primary"),alignSelf:"flex-end"}} onClick={bulkCreateCustom}>⚡ {t("Create Orders","ஆர்டர்கள் உருவாக்கு")}</button>
        </div>
        {customMsg&&<div style={{fontSize:12,color:P.deepBrown,marginTop:10,fontWeight:600}}>{customMsg}</div>}
      </div>

      <div style={css.card}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:P.deepBrown,marginBottom:12}}>
          + {t("New Occasion Order","புதிய ஆர்டர்")}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div>
            <label style={css.lbl}>{t("Template","மாதிரி")}</label>
            <select style={{...css.sel,minWidth:200}} value={tplId} onChange={e=>setTplId(e.target.value)}>
              <option value="">{t("Select template...","மாதிரி தேர்வு...")}</option>
              {occTemplates.map(tp=><option key={tp.id} value={tp.id}>{n(tp)}</option>)}
            </select>
          </div>
          <div>
            <label style={css.lbl}>{t("Date","தேதி")}</label>
            <input type="date" style={css.inp} value={date} onChange={e=>setDate(e.target.value)}/>
          </div>
          <button style={css.btn()} onClick={createOrder}>+ {t("Create Order","ஆர்டர் உருவாக்கு")}</button>
        </div>
        {!occTemplates.length&&<div style={{fontSize:11,color:P.danger,marginTop:8}}>{t("No templates yet — create one in Templates first.","முதலில் மாதிரி உருவாக்கவும்.")}</div>}
      </div>

      <input type="date" style={{...css.inp,width:160,marginBottom:12}} placeholder="Filter by date" value={dateQ} onChange={e=>setDateQ(e.target.value)}/>

      {filtered.map(ord=>{
        const isOpen=openId===ord.id;
        return(
          <div key={ord.id} style={{...css.card,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <strong style={{color:P.deepBrown,fontSize:14}}>{lang==="en"?ord.templateName:(ord.templateNameTamil||ord.templateName)}</strong>
                <span style={{fontSize:12,color:P.muted,marginLeft:8}}>{ord.date}</span>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button style={css.btn(isOpen?"primary":"ghost",true)} onClick={()=>setOpenId(isOpen?null:ord.id)}>
                  {isOpen?"▲":"▼"} {(ord.items||[]).length} {t("items","பொருட்கள்")}
                </button>
                <button style={css.btn("danger",true)} onClick={()=>delOrder(ord.id)}>🗑</button>
              </div>
            </div>
            {isOpen&&(
              <div style={{marginTop:12,borderTop:"1px solid #F0D8B0",paddingTop:12}}>
                <div style={{fontSize:11,color:P.muted,marginBottom:8}}>{t("Add extra items here for one-off issues on top of the template.","கூடுதல் பொருட்களை இங்கு சேர்க்கலாம்.")}</div>
                <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                  <select style={{...css.sel,flex:2,minWidth:160}} value={ni.itemId} onChange={e=>setNi({...ni,itemId:e.target.value})}>
                    <option value="">{t("Add extra item...","கூடுதல் பொருள்...")}</option>
                    {poojaItems.map(pi=><option key={pi.id} value={pi.id}>{n(pi)} ({pi.unit})</option>)}
                  </select>
                  <input type="number" min="0" step="0.5" placeholder={t("Qty","அளவு")} style={{...css.inp,width:90}} value={ni.qty} onChange={e=>setNi({...ni,qty:e.target.value})}/>
                  <button style={css.btn("success")} onClick={()=>addItem(ord.id)}>+ {t("Add","சேர்")}</button>
                </div>
                <table style={css.table}>
                  <thead><tr><th style={css.th}>{t("Item","பொருள்")}</th><th style={css.th}>{t("Qty","அளவு")}</th><th style={css.th}></th></tr></thead>
                  <tbody>
                    {(ord.items||[]).map((it,i)=>{
                      const pi=poojaItems.find(x=>x.id===it.itemId);
                      return(
                        <tr key={i} style={{background:i%2===0?P.white:P.highlight}}>
                          <td style={css.td}><strong>{pi?n(pi):"?"}</strong></td>
                          <td style={css.td}>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <input type="number" step="0.5" style={{...css.inp,width:80,padding:"3px 6px"}} value={it.qty} onChange={e=>changeItemQty(ord.id,i,e.target.value)}/>
                              <span style={{fontSize:11,color:P.muted}}>{pi?.unit}</span>
                            </div>
                          </td>
                          <td style={css.td}><button style={css.btn("danger",true)} onClick={()=>rmItem(ord.id,i)}>✕</button></td>
                        </tr>
                      );
                    })}
                    {!(ord.items||[]).length&&<tr><td colSpan={3} style={{...css.td,textAlign:"center",color:P.muted}}>{t("No items.","பொருட்கள் இல்லை.")}</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      {!filtered.length&&<div style={{...css.card,textAlign:"center",color:P.muted,padding:24}}>{t("No occasion orders found.","ஆர்டர்கள் இல்லை.")}</div>}
    </div>
  );
}

function OccPurchasePage({ctx}){
  const {poojaItems,occOrders,lang:gLang}=ctx;
  const [lang,setLang]=useState(gLang);
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:(x.nameTamil||x.name);
  const [fromDate,setFromDate]=useState(TODAY);
  const [toDate,setToDate]=useState(TODAY);

  const matching=occOrders.filter(o=>o.date>=fromDate&&o.date<=toDate);

  const totals={};
  matching.forEach(o=>{
    (o.items||[]).forEach(it=>{
      const pi=poojaItems.find(x=>x.id===it.itemId); if(!pi)return;
      if(!totals[it.itemId])totals[it.itemId]={item:pi,qty:0,occasions:[]};
      totals[it.itemId].qty+=(+it.qty||0);
      totals[it.itemId].occasions.push({name:(lang==="en"?o.templateName:(o.templateNameTamil||o.templateName)),date:o.date,qty:it.qty});
    });
  });
  const rows=Object.values(totals).sort((a,b)=>n(a.item).localeCompare(n(b.item)));

  const doExport=()=>{
    const data=rows.map(r=>({
      [t("Item","பொருள்")]:n(r.item),
      [t("Unit","அலகு")]:r.item.unit,
      [t("Total Qty","மொத்த அளவு")]:r.qty,
      [t("Occasions","சிறப்பு நாட்கள்")]:r.occasions.map(o=>o.name+" ("+o.date+"): "+o.qty).join("; "),
    }));
    exportXlsxSheets("occasion_purchase_"+fromDate+"_to_"+toDate+".xlsx",[{name:"Purchase Planning",data}]);
  };

  const doPrint=()=>{
    const trows=rows.map(r=>"<tr><td><strong>"+n(r.item)+"</strong></td><td>"+r.qty+" "+r.item.unit+"</td><td style='font-size:11px;color:#555'>"+r.occasions.map(o=>o.name+" ("+o.date+")").join(", ")+"</td></tr>").join("");
    printHTML(t("Temple Occasions — Purchase Planning","கோவில் சிறப்பு நாட்கள் — கொள்முதல்")+" ("+fromDate+" – "+toDate+")",
      "<table><thead><tr><th>"+t("Item","பொருள்")+"</th><th>"+t("Total Qty","மொத்த அளவு")+"</th><th>"+t("Occasions","சிறப்பு நாட்கள்")+"</th></tr></thead><tbody>"+trows+"</tbody></table>");
  };

  return(
    <div>
      <ReportBar onPrint={rows.length>0?doPrint:null} onExport={rows.length>0?doExport:null} lang={lang} setLang={setLang}>
        <div>
          <label style={css.lbl}>{t("From","இருந்து")}</label>
          <input type="date" style={{...css.inp,width:150}} value={fromDate} onChange={e=>{setFromDate(e.target.value);if(e.target.value>toDate)setToDate(e.target.value);}}/>
        </div>
        <div>
          <label style={css.lbl}>{t("To","வரை")}</label>
          <input type="date" style={{...css.inp,width:150}} value={toDate} onChange={e=>{setToDate(e.target.value);if(e.target.value<fromDate)setFromDate(e.target.value);}}/>
        </div>
        <div style={{fontSize:11,color:P.muted,paddingBottom:6}}>{matching.length} {t("order(s) in range","ஆர்டர்கள்")}</div>
      </ReportBar>
      {!rows.length?(
        <div style={{color:P.muted,textAlign:"center",padding:32}}>{t("No occasion orders in this date range.","இந்த வரம்பில் ஆர்டர் இல்லை.")}</div>
      ):(
        <div style={{...css.card,padding:0,overflow:"hidden"}}>
          <table style={css.table}>
            <thead><tr><th style={css.th}>{t("Item","பொருள்")}</th><th style={css.th}>{t("Total Qty","மொத்த அளவு")}</th><th style={css.th}>{t("Occasions","சிறப்பு நாட்கள்")}</th></tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={r.item.id} style={{background:i%2===0?P.white:P.highlight}}>
                  <td style={css.td}><strong>{n(r.item)}</strong></td>
                  <td style={css.td}><strong style={{color:P.saffron}}>{r.qty} {r.item.unit}</strong></td>
                  <td style={{...css.td,fontSize:11}}>{r.occasions.map((o,j)=><div key={j}>{o.name} ({o.date}): {o.qty} {r.item.unit}</div>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InvPage({ctx}){
  const {ingredients,inventory,setInventory,lang,setModal}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:x.nameTamil;
  const [tab,setTab]=useState("balance");
  const [q,setQ]=useState("");

  const getBal=iid=>{
    const p=inventory.purchases.filter(x=>x.iid===iid).reduce((s,x)=>s+x.qty,0);
    const iss=inventory.issues.filter(x=>x.iid===iid).reduce((s,x)=>s+x.qty,0);
    return{p,iss,bal:p-iss};
  };

  // Latest purchase price for an ingredient
  const latestCpu=iid=>{
    const ps=[...inventory.purchases.filter(x=>x.iid===iid)].sort((a,b)=>b.date.localeCompare(a.date));
    return ps.length?ps[0].cpu:null;
  };

  // Weighted average purchase price
  const avgCpu=iid=>{
    const ps=inventory.purchases.filter(x=>x.iid===iid);
    if(!ps.length)return null;
    const totalQty=ps.reduce((s,p)=>s+p.qty,0);
    return ps.reduce((s,p)=>s+p.cpu*p.qty,0)/totalQty;
  };

  const totalValue=ingredients.reduce((sum,ing)=>{
    const {bal}=getBal(ing.id);
    const avg=avgCpu(ing.id)||0;
    return sum+bal*avg;
  },0);

  const normValue=ingredients.reduce((sum,ing)=>{
    const {bal}=getBal(ing.id);
    return sum+bal*(ing.normCost||0);
  },0);

  const filtIngs=ingredients.filter(i=>n(i).toLowerCase().includes(q.toLowerCase()));

  // Cost alerts: purchases where cpu deviates >10% from normCost
  const costAlerts=inventory.purchases
    .filter(p=>{
      const ing=ingredients.find(x=>x.id===p.iid);
      if(!ing||!ing.normCost)return false;
      const dev=Math.abs(p.cpu-ing.normCost)/ing.normCost;
      return dev>0.10;
    })
    .map(p=>{
      const ing=ingredients.find(x=>x.id===p.iid);
      const dev=(p.cpu-ing.normCost)/ing.normCost*100;
      return{...p,ing,dev};
    })
    .sort((a,b)=>Math.abs(b.dev)-Math.abs(a.dev));

  const TABS=[
    {id:"balance", en:"Balance", ta:"இருப்பு"},
    {id:"purchases",en:"Purchases",ta:"கொள்முதல்"},
    {id:"issues",  en:"Issues",   ta:"வழங்கல்"},
    {id:"alerts",  en:`Cost Alerts${costAlerts.length>0?" ("+costAlerts.length+")":""}`,ta:`விலை எச்சரிக்கை${costAlerts.length>0?" ("+costAlerts.length+")":""}`},
  ];

  return(
    <div>
      {/* Tab bar */}
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
        {TABS.map(tb=>(
          <button key={tb.id} style={{
            ...css.btn(tab===tb.id?"primary":"ghost",true),
            ...(tb.id==="alerts"&&costAlerts.length>0&&tab!=="alerts"?{borderColor:P.danger,color:P.danger}:{})
          }} onClick={()=>setTab(tb.id)}>
            {t(tb.en,tb.ta)}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          {tab==="purchases"&&<button style={css.btn("success",true)} onClick={()=>setModal({type:"purchase"})}>+ {t("Record Purchase","கொள்முதல்")}</button>}
          {tab==="issues"&&<button style={css.btn("info",true)} onClick={()=>setModal({type:"postIssues",date:TODAY})}>📦 {t("Post from Order","ஆர்டரிலிருந்து")}</button>}
        </div>
      </div>

      {/* ── BALANCE ── */}
      {tab==="balance"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <div style={css.stat(P.success)}><div style={{fontSize:18}}>📦</div><div style={{fontSize:20,fontWeight:700,color:P.success}}>{ingredients.filter(i=>getBal(i.id).bal>0).length}</div><div style={{fontSize:11,color:P.muted}}>{t("In Stock","கையிருப்பு")}</div></div>
            <div style={css.stat(P.danger)}><div style={{fontSize:18}}>⚠️</div><div style={{fontSize:20,fontWeight:700,color:P.danger}}>{ingredients.filter(i=>getBal(i.id).bal<=0).length}</div><div style={{fontSize:11,color:P.muted}}>{t("Out of Stock","இல்லை")}</div></div>
            <div style={css.stat(P.gold)}><div style={{fontSize:18}}>₹</div><div style={{fontSize:18,fontWeight:700,color:P.gold}}>₹{totalValue.toFixed(0)}</div><div style={{fontSize:11,color:P.muted}}>{t("Actual Value","உண்மை மதிப்பு")}</div></div>
            <div style={css.stat(P.purple)}><div style={{fontSize:18}}>📐</div><div style={{fontSize:18,fontWeight:700,color:P.purple}}>₹{normValue.toFixed(0)}</div><div style={{fontSize:11,color:P.muted}}>{t("Normative Value","நிலையான மதிப்பு")}</div></div>
          </div>
          <input style={{...css.inp,maxWidth:260,marginBottom:10}} placeholder={t("Search...","தேடு...")} value={q} onChange={e=>setQ(e.target.value)}/>
          <div style={{...css.card,padding:0,overflow:"auto"}}>
            <table style={css.table}>
              <thead><tr>
                <th style={css.th}>{t("Ingredient","பொருள்")}</th>
                <th style={css.th}>{t("Cat","வகை")}</th>
                <th style={css.th}>{t("Balance","இருப்பு")}</th>
                <th style={css.th}>{t("Norm Cost","நிலையான விலை")}</th>
                <th style={css.th}>{t("Avg Buy Price","சராசரி விலை")}</th>
                <th style={css.th}>{t("Deviation","மாறுபாடு")}</th>
                <th style={css.th}>{t("Norm Value","நிலையான மதிப்பு")}</th>
                <th style={css.th}>{t("Status","நிலை")}</th>
              </tr></thead>
              <tbody>{filtIngs.map((ing,i)=>{
                const {bal}=getBal(ing.id);
                const avg=avgCpu(ing.id);
                const norm=ing.normCost;
                const dev=avg&&norm?(avg-norm)/norm*100:null;
                const st=bal<=0?"out":bal<5?"low":"ok";
                const devColor=dev===null?P.muted:Math.abs(dev)>10?P.danger:Math.abs(dev)>5?P.saffron:P.success;
                return(
                  <tr key={ing.id} style={{background:i%2===0?P.white:P.highlight}}>
                    <td style={css.td}><strong>{n(ing)}</strong></td>
                    <td style={css.td}><span style={css.badge(CATCOLOR[ing.category]||P.muted)}>{ing.category}</span></td>
                    <td style={css.td}><strong style={{color:bal>0?P.success:P.danger}}>{bal.toFixed(2)} {ing.unit}</strong></td>
                    <td style={css.td}>{norm?<span style={{color:P.purple,fontWeight:600}}>₹{norm}/{ing.unit}</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}>{avg?<span style={{fontWeight:600}}>₹{avg.toFixed(2)}/{ing.unit}</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}>{dev!==null?<span style={{...css.badge(devColor),fontWeight:700}}>{dev>0?"+":""}{dev.toFixed(1)}%</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}>{norm&&bal>0?<span style={{color:P.purple}}>₹{(bal*norm).toFixed(0)}</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}><span style={css.badge(st==="out"?P.danger:st==="low"?P.saffron:P.success)}>{st==="out"?t("Out","இல்லை"):st==="low"?t("Low","குறைவு"):"OK"}</span></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PURCHASES ── */}
      {tab==="purchases"&&(
        <div style={{...css.card,padding:0,overflow:"auto"}}>
          <table style={css.table}>
            <thead><tr>
              <th style={css.th}>{t("Date","தேதி")}</th>
              <th style={css.th}>{t("Ingredient","பொருள்")}</th>
              <th style={css.th}>{t("Qty","அளவு")}</th>
              <th style={css.th}>{t("Paid ₹/unit","செலுத்திய விலை")}</th>
              <th style={css.th}>{t("Norm ₹/unit","நிலையான விலை")}</th>
              <th style={css.th}>{t("Deviation","மாறுபாடு")}</th>
              <th style={css.th}>{t("Total Cost","மொத்த செலவு")}</th>
              <th style={css.th}>{t("Supplier","சப்ளையர்")}</th>
              <th style={css.th}></th>
            </tr></thead>
            <tbody>
              {inventory.purchases.length===0&&<tr><td colSpan={9} style={{...css.td,textAlign:"center",color:P.muted}}>{t("No purchases yet.","கொள்முதல் இல்லை.")}</td></tr>}
              {[...inventory.purchases].sort((a,b)=>b.date.localeCompare(a.date)).map((p,i)=>{
                const ing=ingredients.find(x=>x.id===p.iid);
                const norm=ing?.normCost;
                const dev=norm?(p.cpu-norm)/norm*100:null;
                const devColor=dev===null?P.muted:Math.abs(dev)>10?P.danger:Math.abs(dev)>5?P.saffron:P.success;
                return(
                  <tr key={p.id} style={{background:i%2===0?P.white:P.highlight}}>
                    <td style={css.td}>{p.date}</td>
                    <td style={css.td}>{ing?n(ing):"?"}</td>
                    <td style={css.td}>{p.qty} {p.unit}</td>
                    <td style={css.td}><strong>₹{p.cpu}</strong></td>
                    <td style={css.td}>{norm?<span style={{color:P.purple}}>₹{norm}</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}>{dev!==null?<span style={{...css.badge(devColor),fontWeight:700}}>{dev>0?"+":""}{dev.toFixed(1)}%</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}><strong>₹{(p.qty*p.cpu).toFixed(0)}</strong></td>
                    <td style={css.td}>{p.supplier}</td>
                    <td style={css.td}><button style={css.btn("danger",true)} onClick={()=>setInventory(pr=>({...pr,purchases:pr.purchases.filter(x=>x.id!==p.id)}))}>🗑</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ISSUES ── */}
      {tab==="issues"&&(
        <div style={{...css.card,padding:0,overflow:"auto"}}>
          <table style={css.table}>
            <thead><tr>
              <th style={css.th}>{t("Date","தேதி")}</th>
              <th style={css.th}>{t("Ingredient","பொருள்")}</th>
              <th style={css.th}>{t("Qty Issued","வழங்கிய அளவு")}</th>
              <th style={css.th}>{t("Norm Cost","நிலையான விலை")}</th>
              <th style={css.th}>{t("Issue Value","வழங்கல் மதிப்பு")}</th>
              <th style={css.th}>{t("Note","குறிப்பு")}</th>
              <th style={css.th}>{t("Adjusted","மாற்றம்")}</th>
              <th style={css.th}></th>
            </tr></thead>
            <tbody>
              {inventory.issues.length===0&&<tr><td colSpan={8} style={{...css.td,textAlign:"center",color:P.muted}}>{t("No issues. Post from Dish-wise Report or Orders.","வழங்கல் இல்லை.")}</td></tr>}
              {[...inventory.issues].sort((a,b)=>b.date.localeCompare(a.date)).map((iss,i)=>{
                const ing=ingredients.find(x=>x.id===iss.iid);
                const issueVal=(ing?.normCost||0)*iss.qty;
                return(
                  <tr key={iss.id} style={{background:i%2===0?P.white:P.highlight}}>
                    <td style={css.td}>{iss.date}</td>
                    <td style={css.td}>{ing?n(ing):"?"}</td>
                    <td style={css.td}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input type="number" step="0.01" style={{...css.inp,width:80,padding:"3px 6px",borderColor:iss.adjusted?"#F59E0B":"#DCC88A"}} value={iss.qty} onChange={e=>setInventory(p=>({...p,issues:p.issues.map(x=>x.id===iss.id?{...x,qty:+e.target.value,adjusted:true}:x)}))}/>
                        <span style={{fontSize:11,color:P.muted}}>{iss.unit}</span>
                      </div>
                    </td>
                    <td style={css.td}>{ing?.normCost?<span style={{color:P.purple}}>₹{ing.normCost}/{ing.unit}</span>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}>{issueVal>0?<strong style={{color:P.success}}>₹{issueVal.toFixed(2)}</strong>:<span style={{color:"#CCC"}}>—</span>}</td>
                    <td style={css.td}>{iss.note||"—"}</td>
                    <td style={css.td}>{iss.adjusted?<span style={css.badge(P.saffron)}>✏️ {t("Adj","மாற்றம்")}</span>:<span style={css.badge(P.success)}>{t("Auto","தானியங்கு")}</span>}</td>
                    <td style={css.td}><button style={css.btn("danger",true)} onClick={()=>setInventory(p=>({...p,issues:p.issues.filter(x=>x.id!==iss.id)}))}>🗑</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── COST ALERTS ── */}
      {tab==="alerts"&&(
        <div>
          <div style={{background:"#FFF3CD",border:"1px solid #F59E0B",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#7C4A00"}}>
            📐 <strong>{t("Normative Cost Alert","நிலையான விலை எச்சரிக்கை")}</strong> — {t("Purchases where the actual price paid deviates more than ±10% from the normative cost are flagged below. Review normative costs in Ingredients if market prices have permanently shifted.","நிலையான விலையிலிருந்து ±10% மேல் வேறுபட்ட கொள்முதல்கள் கீழே காட்டப்படுகின்றன.")}
          </div>
          {costAlerts.length===0?(
            <div style={{...css.card,textAlign:"center",padding:32,color:P.success}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontWeight:700,fontSize:14}}>{t("All purchases within ±10% of normative cost","அனைத்து கொள்முதல்களும் நிலையான விலைக்கு ±10% உள்ளே உள்ளன")}</div>
            </div>
          ):(
            <div style={{...css.card,padding:0,overflow:"auto"}}>
              <table style={css.table}>
                <thead><tr>
                  <th style={css.th}>{t("Date","தேதி")}</th>
                  <th style={css.th}>{t("Ingredient","பொருள்")}</th>
                  <th style={css.th}>{t("Qty","அளவு")}</th>
                  <th style={css.th}>{t("Paid ₹/unit","செலுத்திய விலை")}</th>
                  <th style={css.th}>{t("Norm ₹/unit","நிலையான விலை")}</th>
                  <th style={css.th}>{t("Deviation","மாறுபாடு")}</th>
                  <th style={css.th}>{t("Extra Spend","கூடுதல் செலவு")}</th>
                  <th style={css.th}>{t("Supplier","சப்ளையர்")}</th>
                </tr></thead>
                <tbody>
                  {costAlerts.map((p,i)=>{
                    const excess=(p.cpu-p.ing.normCost)*p.qty;
                    const isHigh=p.dev>0;
                    const devColor=Math.abs(p.dev)>20?P.danger:P.saffron;
                    return(
                      <tr key={p.id} style={{background:i%2===0?P.white:P.highlight}}>
                        <td style={css.td}>{p.date}</td>
                        <td style={css.td}><strong>{n(p.ing)}</strong></td>
                        <td style={css.td}>{p.qty} {p.unit}</td>
                        <td style={css.td}><strong style={{color:isHigh?P.danger:P.success}}>₹{p.cpu}</strong></td>
                        <td style={css.td}><span style={{color:P.purple,fontWeight:600}}>₹{p.ing.normCost}</span></td>
                        <td style={css.td}><span style={{...css.badge(devColor),fontSize:12,fontWeight:700}}>{p.dev>0?"+":""}{p.dev.toFixed(1)}%</span></td>
                        <td style={css.td}><strong style={{color:isHigh?P.danger:P.success}}>{isHigh?"▲":"▼"} ₹{Math.abs(excess).toFixed(0)}</strong><div style={{fontSize:10,color:P.muted}}>{isHigh?t("Overpaid","அதிகமாக செலுத்தப்பட்டது"):t("Saved vs norm","சேமிக்கப்பட்டது")}</div></td>
                        <td style={css.td}>{p.supplier||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary stats */}
          {costAlerts.length>0&&(()=>{
            const overpaid=costAlerts.filter(p=>p.dev>0).reduce((s,p)=>s+(p.cpu-p.ing.normCost)*p.qty,0);
            const saved=costAlerts.filter(p=>p.dev<0).reduce((s,p)=>s+(p.ing.normCost-p.cpu)*p.qty,0);
            return(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginTop:14}}>
                <div style={css.stat(P.danger)}><div style={{fontSize:18}}>📈</div><div style={{fontSize:18,fontWeight:700,color:P.danger}}>₹{overpaid.toFixed(0)}</div><div style={{fontSize:11,color:P.muted}}>{t("Total Overpaid vs Norm","நிலையானதை விட அதிகம்")}</div></div>
                <div style={css.stat(P.success)}><div style={{fontSize:18}}>📉</div><div style={{fontSize:18,fontWeight:700,color:P.success}}>₹{saved.toFixed(0)}</div><div style={{fontSize:11,color:P.muted}}>{t("Total Saved vs Norm","நிலையானதை விட சேமிப்பு")}</div></div>
                <div style={css.stat(P.saffron)}><div style={{fontSize:18}}>🔍</div><div style={{fontSize:18,fontWeight:700,color:P.saffron}}>{costAlerts.length}</div><div style={{fontSize:11,color:P.muted}}>{t("Flagged Purchases","குறிக்கப்பட்ட கொள்முதல்கள்")}</div></div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function PurchForm({ctx,onClose}){
  const {ingredients,inventory,setInventory,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const n=(x)=>lang==="en"?x.name:x.nameTamil;
  const [f,setF]=useState({iid:"",date:TODAY,qty:"",unit:"kg",cpu:"",supplier:"",note:""});

  const selIng=f.iid?ingredients.find(x=>x.id===+f.iid):null;
  const norm=selIng?.normCost||null;
  const cpu=+f.cpu||0;
  const dev=norm&&cpu?(cpu-norm)/norm*100:null;
  const devColor=dev===null?P.muted:Math.abs(dev)>10?P.danger:Math.abs(dev)>5?P.saffron:P.success;

  // Recent purchases for selected ingredient
  const recentPurchases=selIng
    ?[...inventory.purchases.filter(x=>x.iid===selIng.id)].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3)
    :[];

  const save=()=>{
    if(!f.iid||!f.qty||!f.cpu)return;
    setInventory(p=>({...p,purchases:[...p.purchases,{...f,id:Date.now(),iid:+f.iid,qty:+f.qty,cpu:+f.cpu,unit:f.unit||selIng?.unit||"kg"}]}));
    onClose();
  };

  return(
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown,marginBottom:14}}>
        {t("Record Purchase","கொள்முதல் சேர்")}
      </div>
      <div style={css.g2}>
        <div>
          <label style={css.lbl}>{t("Ingredient","பொருள்")}</label>
          <select style={{...css.sel,width:"100%"}} value={f.iid} onChange={e=>{
            const ing=ingredients.find(x=>x.id===+e.target.value);
            setF({...f,iid:e.target.value,unit:ing?.unit||"kg"});
          }}>
            <option value="">{t("Select...","தேர்வு...")}</option>
            {ingredients.map(i=><option key={i.id} value={i.id}>{n(i)} ({i.unit})</option>)}
          </select>
          {/* Normative cost hint */}
          {norm&&<div style={{marginTop:5,fontSize:11,color:P.purple,fontWeight:600}}>
            📐 {t("Normative cost","நிலையான விலை")}: ₹{norm}/{selIng.unit}
          </div>}
          {/* Recent purchases */}
          {recentPurchases.length>0&&(
            <div style={{marginTop:5,fontSize:11,color:P.muted}}>
              {t("Recent","சமீபத்திய")}: {recentPurchases.map(p=>`₹${p.cpu} (${p.date})`).join(" · ")}
            </div>
          )}
        </div>
        <div>
          <label style={css.lbl}>{t("Date","தேதி")}</label>
          <input type="date" style={css.inp} value={f.date} onChange={e=>setF({...f,date:e.target.value})}/>
        </div>
        <div>
          <label style={css.lbl}>{t("Quantity","அளவு")}</label>
          <div style={{display:"flex",gap:6}}>
            <input type="number" style={css.inp} value={f.qty} onChange={e=>setF({...f,qty:e.target.value})}/>
            <select style={css.sel} value={f.unit} onChange={e=>setF({...f,unit:e.target.value})}>
              {["kg","g","L","ml","nos"].map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={css.lbl}>{t("Cost / Unit (₹)","விலை/அலகு")}</label>
          <input type="number" style={{...css.inp,borderColor:dev!==null&&Math.abs(dev)>10?P.danger:dev!==null&&Math.abs(dev)>5?P.saffron:"#DCC88A"}}
            value={f.cpu} onChange={e=>setF({...f,cpu:e.target.value})}/>
          {/* Live deviation indicator */}
          {dev!==null&&cpu>0&&(
            <div style={{marginTop:5,display:"flex",alignItems:"center",gap:6}}>
              <span style={{...css.badge(devColor),fontSize:12,fontWeight:700}}>
                {dev>0?"▲ ":"▼ "}{Math.abs(dev).toFixed(1)}% {dev>0?t("above norm","நிலையானதை விட அதிகம்"):t("below norm","நிலையானதை விட குறைவு")}
              </span>
              {Math.abs(dev)>10&&<span style={{fontSize:11,color:P.danger}}>⚠️ {t("Outside ±10% threshold","±10% வரம்பை மீறியது")}</span>}
            </div>
          )}
          {dev!==null&&cpu>0&&+f.qty>0&&(
            <div style={{marginTop:4,fontSize:11,color:P.muted}}>
              {t("Total cost","மொத்த செலவு")}: <strong>₹{(cpu*(+f.qty)).toFixed(0)}</strong>
              {norm&&<span style={{marginLeft:8,color:P.purple}}>({t("at norm","நிலையானதில்")}: ₹{(norm*(+f.qty)).toFixed(0)})</span>}
            </div>
          )}
        </div>
        <div>
          <label style={css.lbl}>{t("Supplier","சப்ளையர்")}</label>
          <input style={css.inp} value={f.supplier} onChange={e=>setF({...f,supplier:e.target.value})}/>
        </div>
        <div>
          <label style={css.lbl}>{t("Note","குறிப்பு")}</label>
          <input style={css.inp} value={f.note} onChange={e=>setF({...f,note:e.target.value})}/>
        </div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
        <button style={css.btn("ghost")} onClick={onClose}>{t("Cancel","ரத்து")}</button>
        <button style={css.btn()} onClick={save}>💾 {t("Save","சேமி")}</button>
      </div>
    </div>
  );
}
export default App;
