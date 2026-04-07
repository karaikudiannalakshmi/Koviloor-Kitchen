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
import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";

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
    padding:sm?"4px 10px":"7px 14px",borderRadius:7,border:"none",cursor:"pointer",
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
const CATCOLOR={grocery:P.gold,vegetable:"#2E7D32",spice:P.saffron,other:P.purple,cut:"#0D7377"};

// ── Recipe Type Color Palette (cycles for user-added types) ──────────────────
const TYPE_PALETTE=[
  "#C0392B","#E67E22","#F39C12","#27AE60","#16A085","#2980B9","#8E44AD",
  "#D35400","#1ABC9C","#2ECC71","#3498DB","#9B59B6","#E91E63","#00BCD4",
  "#FF5722","#607D8B","#795548","#4CAF50","#FF9800","#03A9F4",
];
const RTYPE_SEED=[
  {id:"sambar",        en:"Sambar",          ta:"சாம்பார்",       color:P.saffron},
  {id:"kuzhambu",      en:"Kuzhambu",        ta:"குழம்பு",         color:"#B45309"},
  {id:"rasam",         en:"Rasam",           ta:"ரசம்",             color:"#92400E"},
  {id:"kootu",         en:"Kootu",           ta:"கூட்டு",           color:"#065F46"},
  {id:"vellai_poriyal",en:"Vellai Poriyal",  ta:"வெள்ளை பொரியல்", color:"#2E7D32"},
  {id:"kara_poriyal",  en:"Kara Poriyal",    ta:"கார பொரியல்",      color:"#C0392B"},
  {id:"pachadi",       en:"Pachadi",         ta:"பச்சடி",           color:"#1A6B8A"},
  {id:"mandi",         en:"Mandi / Kolambu", ta:"மண்டி / கொழம்பு", color:"#6B3FA0"},
  {id:"payasam",       en:"Payasam",         ta:"பாயசம்",           color:P.gold},
  {id:"piece_sweet",   en:"Piece Sweet",     ta:"பீஸ் இனிப்பு",    color:"#DB2777"},
  {id:"bulk_sweet",    en:"Bulk Sweet",      ta:"மொத்த இனிப்பு",   color:"#BE185D"},
  {id:"rice",          en:"Rice / Sadam",    ta:"சாதம்",            color:P.deepBrown},
  {id:"tiffin",        en:"Tiffin",          ta:"டிஃபின்",          color:"#0EA5E9"},
  {id:"chutney",       en:"Chutney",         ta:"சட்னி",            color:"#2E7D32"},
  {id:"salad",         en:"Salad / Raita",   ta:"சாலட் / பச்சடி",  color:"#0D9488"},
  {id:"gravy",         en:"Gravy / Curry",   ta:"கிரேவி",           color:"#7C3AED"},
  {id:"sub",           en:"Sub-Recipe/Base", ta:"துணை சமையல்",      color:P.purple},
  {id:"other",         en:"Other",           ta:"மற்றவை",           color:P.muted},
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

const TODAY=new Date().toISOString().slice(0,10);

// ── Print utility ──────────────────────────────────────────────────────────────
function printHTML(title, htmlContent) {
  const css=`
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#2c1a08;margin:20px;}
    h2{font-size:15px;color:#5C2A0A;border-bottom:2px solid #E8821A;padding-bottom:6px;margin-bottom:10px;}
    h3{font-size:13px;color:#8B4513;margin:14px 0 5px;}
    h4{font-size:12px;color:#5C2A0A;margin:10px 0 3px;}
    table{width:100%;border-collapse:collapse;margin-bottom:14px;}
    th{background:#1C1410;color:#F5DEB3;padding:7px 10px;text-align:left;font-size:11px;}
    td{padding:7px 10px;border-bottom:1px solid #f0d890;}
    tr:nth-child(even) td{background:#fffbe8;}
    .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
    @media print{.no-print{display:none;}}
  `;
  const date=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  const fullHtml='<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+title+'</title><style>'+css+'</style></head><body>'
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

const ING0=[
  // ── Grocery ────────────────────────────────────────────────────────
  {id:1, name:"Raw Rice",         nameTamil:"பச்சை அரிசி",       category:"grocery",  unit:"kg",  normCost:45},
  {id:2, name:"Urad Dal",         nameTamil:"உளுத்தம் பருப்பு",  category:"grocery",  unit:"kg",  normCost:120},
  {id:3, name:"Toor Dal",         nameTamil:"துவரம் பருப்பு",    category:"grocery",  unit:"kg",  normCost:110},
  {id:4, name:"Chana Whole",      nameTamil:"கொண்டைக்கடலை",     category:"grocery",  unit:"kg",  normCost:90},
  {id:5, name:"Moong Dal",        nameTamil:"பாசிப் பருப்பு",    category:"grocery",  unit:"kg",  normCost:100},
  {id:6, name:"Broken Rice",      nameTamil:"பொடி அரிசி",        category:"grocery",  unit:"kg",  normCost:32},
  {id:7, name:"Oil",              nameTamil:"எண்ணெய்",           category:"grocery",  unit:"L",   normCost:120},
  {id:8, name:"Ghee",             nameTamil:"நெய்",               category:"grocery",  unit:"g",   normCost:0.5},
  {id:9, name:"Jaggery",          nameTamil:"வெல்லம்",           category:"grocery",  unit:"g",   normCost:0.06},
  // ── Raw Vegetables (with cutYield = kg cut per kg raw) ─────────────
  {id:10,name:"Onion",            nameTamil:"வெங்காயம்",          category:"vegetable",unit:"kg",  normCost:40,  cutYield:0.85, cutUnit:"kg"},
  {id:11,name:"Tomato",           nameTamil:"தக்காளி",           category:"vegetable",unit:"kg",  normCost:30,  cutYield:0.90, cutUnit:"kg"},
  {id:12,name:"Drumstick",        nameTamil:"முருங்கைக்காய்",    category:"vegetable",unit:"kg",  normCost:60,  cutYield:0.70, cutUnit:"kg"},
  {id:13,name:"Coconut",          nameTamil:"தேங்காய்",          category:"vegetable",unit:"nos", normCost:25,  cutYield:0.25, cutUnit:"kg"},
  {id:14,name:"Green Chili",      nameTamil:"பச்சை மிளகாய்",     category:"vegetable",unit:"g",   normCost:0.08,cutYield:0.90, cutUnit:"g"},
  {id:15,name:"Ginger",           nameTamil:"இஞ்சி",             category:"vegetable",unit:"g",   normCost:0.12,cutYield:0.85, cutUnit:"g"},
  {id:16,name:"Garlic",           nameTamil:"பூண்டு",             category:"vegetable",unit:"g",   normCost:0.20,cutYield:0.90, cutUnit:"g"},
  {id:17,name:"Curry Leaves",     nameTamil:"கறிவேப்பிலை",       category:"vegetable",unit:"g",   normCost:0.04,cutYield:0.80, cutUnit:"g"},
  // ── Spices ─────────────────────────────────────────────────────────
  {id:18,name:"Salt",             nameTamil:"உப்பு",              category:"spice",    unit:"g",   normCost:0.018, scalingFactor:0.75,scalingBenchmark:200},
  {id:19,name:"Red Chili Powder", nameTamil:"மிளகாய் தூள்",      category:"spice",    unit:"g",   normCost:0.25,  scalingFactor:0.70,scalingBenchmark:150},
  {id:20,name:"Coriander Powder", nameTamil:"தனியா தூள்",        category:"spice",    unit:"g",   normCost:0.15,  scalingFactor:0.75,scalingBenchmark:150},
  {id:21,name:"Tamarind",         nameTamil:"புளி",               category:"spice",    unit:"g",   normCost:0.12,  scalingFactor:0.80,scalingBenchmark:200},
  {id:22,name:"Mustard Seeds",    nameTamil:"கடுகு",              category:"spice",    unit:"g",   normCost:0.06,  scalingFactor:0.85,scalingBenchmark:100},
  {id:23,name:"Turmeric",         nameTamil:"மஞ்சள்",            category:"spice",    unit:"g",   normCost:0.20,  scalingFactor:0.80,scalingBenchmark:80},
  // ── Cut Vegetables (zero cost — derived from raw; used in recipes) ──
  {id:101,name:"Onion (cut)",     nameTamil:"வெங்காயம் (நறுக்கியது)", category:"cut", unit:"kg",  normCost:0, rawId:10},
  {id:102,name:"Tomato (cut)",    nameTamil:"தக்காளி (நறுக்கியது)",  category:"cut", unit:"kg",  normCost:0, rawId:11},
  {id:103,name:"Drumstick (cut)", nameTamil:"முருங்கைக்காய் (நறுக்கியது)",category:"cut",unit:"kg",normCost:0,rawId:12},
  {id:104,name:"Coconut (grated)",nameTamil:"தேங்காய் (துருவியது)",  category:"cut", unit:"kg",  normCost:0, rawId:13},
  {id:105,name:"Green Chili (cut)",nameTamil:"பச்சை மிளகாய் (நறுக்கியது)",category:"cut",unit:"g",normCost:0,rawId:14},
  {id:106,name:"Ginger (paste)",  nameTamil:"இஞ்சி (விழுது)",        category:"cut", unit:"g",   normCost:0, rawId:15},
  {id:107,name:"Garlic (paste)",  nameTamil:"பூண்டு (விழுது)",        category:"cut", unit:"g",   normCost:0, rawId:16},
];

// subLinks: [{subId, qty, unit}] — qty of sub-recipe needed per base yield of this recipe
// prepSteps: [{type, desc, duration, durationUnit, daysBefore}]
// recipeType: one of RECIPE_TYPES ids
const REC0=[
  {id:1,name:"Idli Batter",nameTamil:"இட்லி மாவு",recipeType:"sub",isSubRecipe:true,yield:10,yieldUnit:"kg",
   prepSteps:[
     {type:"soak",desc:"Soak rice & urad dal",duration:8,durationUnit:"hours",daysBefore:1},
     {type:"grind",desc:"Grind to smooth batter",duration:30,durationUnit:"minutes",daysBefore:1},
     {type:"ferment",desc:"Ferment batter",duration:10,durationUnit:"hours",daysBefore:1},
   ],
   ingredients:[{iid:1,qty:3,unit:"kg"},{iid:2,qty:1,unit:"kg"},{iid:18,qty:60,unit:"g"}],subLinks:[]},
  {id:2,name:"Idli",nameTamil:"இட்லி",recipeType:"tiffin",isSubRecipe:false,yield:100,yieldUnit:"nos",
   prepSteps:[
     {type:"steam",desc:"Steam in idli moulds",duration:12,durationUnit:"minutes",daysBefore:0},
   ],
   ingredients:[{iid:18,qty:10,unit:"g"}],subLinks:[{subId:1,qty:10,unit:"kg"}]},
  {id:3,name:"Sambar",nameTamil:"சாம்பார்",recipeType:"sambar",isSubRecipe:false,yield:10,yieldUnit:"kg",
   prepSteps:[
     {type:"pressure",desc:"Pressure cook toor dal",duration:15,durationUnit:"minutes",daysBefore:0},
     {type:"boil",desc:"Boil vegetables with tamarind",duration:20,durationUnit:"minutes",daysBefore:0},
   ],
   ingredients:[{iid:3,qty:1.5,unit:"kg"},{iid:102,qty:2,unit:"kg"},{iid:101,qty:0.5,unit:"kg"},{iid:12,qty:1,unit:"kg"},{iid:18,qty:80,unit:"g"},{iid:19,qty:50,unit:"g"},{iid:20,qty:40,unit:"g"},{iid:21,qty:100,unit:"g"},{iid:22,qty:20,unit:"g"},{iid:7,qty:0.1,unit:"L"}],subLinks:[]},
  {id:4,name:"Pongal",nameTamil:"பொங்கல்",recipeType:"tiffin",isSubRecipe:false,yield:10,yieldUnit:"kg",
   prepSteps:[
     {type:"pressure",desc:"Pressure cook rice & moong dal together",duration:20,durationUnit:"minutes",daysBefore:0},
   ],
   ingredients:[{iid:6,qty:3,unit:"kg"},{iid:5,qty:1,unit:"kg"},{iid:18,qty:60,unit:"g"},{iid:8,qty:200,unit:"g"},{iid:22,qty:15,unit:"g"},{iid:14,qty:50,unit:"g"},{iid:15,qty:50,unit:"g"}],subLinks:[]},
  {id:5,name:"Chana Masala",nameTamil:"சனா மசாலா",recipeType:"gravy",isSubRecipe:false,yield:10,yieldUnit:"kg",
   prepSteps:[
     {type:"soak",desc:"Soak chana overnight",duration:10,durationUnit:"hours",daysBefore:1},
     {type:"pressure",desc:"Pressure cook chana",duration:25,durationUnit:"minutes",daysBefore:0},
   ],
   ingredients:[{iid:4,qty:3,unit:"kg"},{iid:101,qty:2,unit:"kg"},{iid:102,qty:2,unit:"kg"},{iid:18,qty:80,unit:"g"},{iid:19,qty:60,unit:"g"},{iid:20,qty:50,unit:"g"},{iid:7,qty:0.2,unit:"L"}],subLinks:[]},
  {id:6,name:"Rice",nameTamil:"சாதம்",recipeType:"rice",isSubRecipe:false,yield:10,yieldUnit:"kg",
   prepSteps:[
     {type:"boil",desc:"Cook rice with water 1:2",duration:25,durationUnit:"minutes",daysBefore:0},
   ],
   ingredients:[{iid:1,qty:4,unit:"kg"}],subLinks:[]},
  {id:7,name:"Coconut Chutney",nameTamil:"தேங்காய் சட்னி",recipeType:"chutney",isSubRecipe:false,yield:3,yieldUnit:"kg",
   prepSteps:[
     {type:"grind",desc:"Grind coconut with green chili",duration:10,durationUnit:"minutes",daysBefore:0},
   ],
   ingredients:[{iid:104,qty:1.25,unit:"kg"},{iid:105,qty:30,unit:"g"},{iid:18,qty:20,unit:"g"},{iid:22,qty:10,unit:"g"},{iid:7,qty:0.05,unit:"L"}],subLinks:[]},
];

const LOC0=[
  {id:1,name:"Main Hall",nameTamil:"முக்கிய மண்டபம்"},
  {id:2,name:"Old Age Home",nameTamil:"முதியோர் இல்லம்"},
  {id:3,name:"School",nameTamil:"பள்ளி"},
];

// effectiveQty: scales entry.qty if pax override set. Returns qty to use in all calculations.
function effectiveQty(entry, order){
  if(!entry.pax||!order?.paxScale)return entry.qty;
  const key=entry.locId+"_"+entry.session;
  const cur=order.paxScale[key];
  if(!cur||cur===entry.pax)return entry.qty;
  return entry.qty*(cur/entry.pax);
}

const ORD0=[
  {id:1,date:TODAY,name:"Today's Order",isTemplate:false,
   paxScale:{"1_Breakfast":200,"1_Lunch":500,"2_Breakfast":80,"2_Lunch":80,"3_Lunch":120},
   entries:[
    {locId:1,session:"Breakfast",recId:2,qty:200,yu:"nos",pax:200},
    {locId:1,session:"Breakfast",recId:7,qty:2,yu:"kg",pax:200},
    {locId:1,session:"Lunch",recId:6,qty:15,yu:"kg",pax:500},
    {locId:1,session:"Lunch",recId:3,qty:8,yu:"kg",pax:500},
    {locId:2,session:"Breakfast",recId:4,qty:5,yu:"kg",pax:80},
    {locId:2,session:"Lunch",recId:6,qty:8,yu:"kg",pax:80},
    {locId:2,session:"Lunch",recId:3,qty:4,yu:"kg",pax:80},
    {locId:3,session:"Lunch",recId:6,qty:5,yu:"kg",pax:120},
    {locId:3,session:"Lunch",recId:3,qty:3,yu:"kg",pax:120},
  ]},
  {id:2,date:"",name:"Standard Template",isTemplate:true,paxScale:{},entries:[
    {locId:1,session:"Breakfast",recId:2,qty:200,yu:"nos",pax:200},
    {locId:1,session:"Lunch",recId:6,qty:15,yu:"kg",pax:500},
    {locId:1,session:"Dinner",recId:5,qty:10,yu:"kg",pax:500},
  ]},
];

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
function expandRecipeIngs(rec, mainMult, recipes, ingredients) {
  const result = [];
  // 1. Direct ingredients
  (rec.ingredients||[]).forEach(ing => {
    const d = ingredients.find(x => x.id === ing.iid); if (!d) return;
    const scaled = applyScaling(ing.qty, mainMult, d.scalingFactor, d.scalingBenchmark);
    result.push({ d, qty: scaled, unit: ing.unit });
  });
  // 2. Sub-recipe links — each link says "I need `link.qty` units of subRecipe per base yield of THIS recipe"
  (rec.subLinks||[]).forEach(link => {
    const sub = recipes.find(r => r.id === link.subId); if (!sub) return;
    // sub multiplier: (link.qty * mainMult) / sub.yield
    const subMult = (link.qty * mainMult) / (sub.yield || 1);
    // recursively expand sub-recipe (sub-recipes can themselves have subLinks)
    const subIngs = expandRecipeIngs(sub, subMult, recipes, ingredients);
    subIngs.forEach(si => result.push(si));
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
function computeTotals(entries, recipes, ingredients, order) {
  const rows = [];
  entries.forEach(e => {
    const rec = recipes.find(r => r.id === e.recId); if (!rec) return;
    const ord = e._order || order;
    const qty = effectiveQty(e, ord);
    const mult = qty / (rec.yield || 1);
    const expanded = expandRecipeIngs(rec, mult, recipes, ingredients);
    expanded.forEach(row => {
      rows.push({ ...row, recId: e.recId, recName: rec.name, recNameT: rec.nameTamil, locId: e.locId, session: e.session });
    });
  });
  return rows;
}

// ════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════
export default 
function App(){
  const [page,setPage]=useState("ingredients");
  const [lang,setLang]=useState("en");
  const [ingredients,setIngredients]=useState(ING0);
  const [recipes,setRecipes]=useState(REC0);
  const [locations,setLocations]=useState(LOC0);
  const [orders,setOrders]=useState(ORD0);
  const [inventory,setInventory]=useState(INV0);
  const [recipeTypes,setRecipeTypes]=useState(RTYPE_SEED);
  const [modal,setModal]=useState(null);
  const ctx={lang,ingredients,setIngredients,recipes,setRecipes,locations,setLocations,orders,setOrders,inventory,setInventory,recipeTypes,setRecipeTypes,setModal};
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
      {id:"rep_col",en:"Location Columnar",ta:"இட நெடுவரிசை"},
      {id:"rep_cost",en:"Cost Analysis",ta:"செலவு பகுப்பாய்வு"},
    ]},
    {id:"inventory",icon:"📦",en:"Inventory",ta:"சரக்கு மேலாண்மை"},
  ];
  const flat=NAV.flatMap(n=>n.children?[n,...n.children]:[n]);
  const cur=flat.find(p=>p.id===page)||NAV[0];

  return (
    <div style={css.app}>
      <nav style={css.nav}>
        <div style={css.navTop}>
          <div style={{fontSize:26,marginBottom:4}}>🍛</div>
          <div style={css.navTitle}>Koviloor Kitchen</div>
          <div style={css.navSub}>கோவிலூர் அன்னதானம்</div>
        </div>
        <div style={{padding:"10px 0"}}>
          {NAV.map(n=>(
            <div key={n.id}>
              <div style={css.navItem(!n.children&&page===n.id)} onClick={()=>{if(!n.children)setPage(n.id)}}>
                <span>{n.icon}</span><span>{t(n.en,n.ta)}</span>
              </div>
              {n.children?.map(c=>(
                <div key={c.id} style={css.navItem(page===c.id,true)} onClick={()=>setPage(c.id)}>
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
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:11,color:P.muted}}>🌐</span>
            <select style={{...css.sel,fontSize:11,padding:"4px 8px"}} value={lang} onChange={e=>setLang(e.target.value)}>
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>
        </div>
        <div style={css.content}>
          {page==="ingredients"&&<IngsPage ctx={ctx}/>}
          {page==="recipes"&&<RecsPage ctx={ctx}/>}
          {page==="orders"&&<OrdersPage ctx={ctx}/>}
          {page==="rep_dish"&&<RepDish ctx={ctx}/>}
          {page==="rep_ing"&&<RepIng ctx={ctx}/>}
          {page==="rep_shop"&&<RepShop ctx={ctx}/>}
          {page==="rep_del"&&<RepDel ctx={ctx}/>}
          {page==="rep_col"&&<RepCol ctx={ctx}/>}
          {page==="rep_cost"&&<RepCost ctx={ctx}/>}
          {page==="inventory"&&<InvPage ctx={ctx}/>}
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
  const {ingredients,setIngredients,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [cat,setCat]=useState("all");
  const [editId,setEditId]=useState(null);
  const [delErr,setDelErr]=useState(null);
  const [ef,setEf]=useState({});
  const [nr,setNr]=useState({name:"",nameTamil:"",category:"grocery",unit:"kg",normCost:"",scalingFactor:"",scalingBenchmark:""});
  const fRef=useRef();
  const [translating,setTranslating]=useState(false);
  const [transProgress,setTransProgress]=useState("");

  const translateToTamil=async()=>{
    const needTranslation=ingredients.filter(x=>!x.nameTamil||!x.nameTamil.trim());
    if(!needTranslation.length){alert("All ingredients already have Tamil names.");return;}
    if(!confirm(`Translate ${needTranslation.length} ingredient names to Tamil using AI? This may take a minute.`))return;
    setTranslating(true);
    const BATCH=40;
    const results={};
    for(let i=0;i<needTranslation.length;i+=BATCH){
      const batch=needTranslation.slice(i,i+BATCH);
      setTransProgress(`Translating ${i+1}–${Math.min(i+BATCH,needTranslation.length)} of ${needTranslation.length}...`);
      try{
        const prompt=`You are translating kitchen ingredient names from English to Tamil for a temple/free food kitchen in Tamil Nadu.
Translate each ingredient name below to its Tamil name as used in Tamil cooking.
Use common everyday Tamil terms (not formal/classical Tamil).
If it is a brand name or has no Tamil equivalent, keep the English name.
Return ONLY a valid JSON object mapping each English name to its Tamil translation. No explanation, no markdown.

Ingredients:
${batch.map(x=>x.name).join('
')}`;
        const res=await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            model:"claude-sonnet-4-20250514",
            max_tokens:1000,
            messages:[{role:"user",content:prompt}]
          })
        });
        const data=await res.json();
        const text=data.content?.[0]?.text||"{}";
        const clean=text.replace(/```json|```/g,"").trim();
        const parsed=JSON.parse(clean);
        Object.assign(results,parsed);
      }catch(err){console.error("Translation batch error:",err);}
    }
    // Apply translations
    setIngredients(prev=>prev.map(ing=>{
      if(ing.nameTamil&&ing.nameTamil.trim())return ing;
      const tamil=results[ing.name];
      return tamil?{...ing,nameTamil:tamil}:ing;
    }));
    setTranslating(false);
    setTransProgress("");
    const count=Object.keys(results).length;
    alert(`Done! Translated ${count} ingredients.`);
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
      {Name:"Rice",Tamil:"அரிசி",Category:"grocery",Unit:"kg",NormCost:45,ScalingFactor:"",ScalingBenchmark:""},
      {Name:"Salt",Tamil:"உப்பு",Category:"spice",Unit:"g",NormCost:0.018,ScalingFactor:0.75,ScalingBenchmark:200},
      {Name:"Onion",Tamil:"வெங்காயம்",Category:"vegetable",Unit:"kg",NormCost:40,ScalingFactor:"",ScalingBenchmark:""},
    ]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Ingredients");
    XLSX.writeFile(wb,"ingredients_template.xlsx");
  };

  const visible=cat==="all"?ingredients:ingredients.filter(i=>i.category===cat);

  const saveEdit=()=>{
    setIngredients(p=>p.map(i=>i.id===editId?{...ef,normCost:ef.normCost?+ef.normCost:undefined,cutYield:ef.cutYield?+ef.cutYield:undefined,scalingFactor:ef.scalingFactor?+ef.scalingFactor:undefined,scalingBenchmark:ef.scalingBenchmark?+ef.scalingBenchmark:undefined}:i));
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
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button style={css.btn("ghost",true)} onClick={dlTemplate}>📥 {t("Download Template","டெம்ப்ளேட்")}</button>
          <button style={css.btn("success",true)} onClick={()=>fRef.current.click()}>📤 {t("Import Excel","Excel இறக்கு")}</button>
          <input ref={fRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={importXlsx}/>
          <button style={{...css.btn("ghost",true),borderColor:P.purple,color:translating?P.muted:P.purple}}
            onClick={translateToTamil} disabled={translating}>
            {translating?"⏳ "+transProgress:"🔤 "+t("Translate Tamil","தமிழில் மொழிபெயர்")}
          </button>
        </div>
      </div>

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
                    :<><button style={css.btn("ghost",true)} onClick={()=>{setEditId(ing.id);setEf({...ing});}}>✏️</button><button style={css.btn("danger",true)} onClick={()=>setIngredients(p=>p.filter(x=>x.id!==ing.id))}>🗑</button></>}
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
              <td style={css.td}><button style={css.btn("primary",true)} onClick={addNew}>+ {t("Add","சேர்")}</button></td>
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

// ════════════════════════════════════════════════════════════════════
// RECIPES
// ════════════════════════════════════════════════════════════════════
function RecsPage({ctx}){
  const {recipes,setRecipes,ingredients,recipeTypes,lang,setModal}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [showSub,setShowSub]=useState(false);
  const [q,setQ]=useState("");

  const [typeF,setTypeF]=useState("all");

  const vis=recipes
    .filter(r=>showSub||!r.isSubRecipe)
    .filter(r=>typeF==="all"||r.recipeType===typeF)
    .filter(r=>{
      const qq=q.toLowerCase();
      return !qq||r.name.toLowerCase().includes(qq)||r.nameTamil.includes(q);
    });

  const usedTypes=[...new Set(recipes.map(r=>r.recipeType).filter(Boolean))];

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
        <input style={{...css.inp,maxWidth:220}} placeholder={t("Search recipes...","தேடு...")} value={q} onChange={e=>setQ(e.target.value)}/>
        <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
          <input type="checkbox" checked={showSub} onChange={e=>setShowSub(e.target.checked)}/>
          {t("Include Sub-Recipes","துணை காட்டு")}
        </label>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button style={css.btn("ghost",true)} onClick={()=>setModal({type:"recipeTypes"})}>⚙️ {t("Manage Types","வகை நிர்வகி")}</button>
          <button style={css.btn()} onClick={()=>setModal({type:"recipe"})}>+ {t("Add Recipe","சேர்")}</button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        <button style={css.btn(typeF==="all"?"primary":"ghost",true)} onClick={()=>setTypeF("all")}>{t("All Types","அனைத்தும்")}</button>
        {usedTypes.map(tid=>{const tp=recipeTypes.find(x=>x.id===tid);return tp?<button key={tid} style={{...css.btn("ghost",true),borderColor:tp.color||P.muted,color:tp.color||P.muted,fontWeight:typeF===tid?700:400}} onClick={()=>setTypeF(typeF===tid?"all":tid)}>{lang==="en"?tp.en:tp.ta}</button>:null;})}
      </div>

      <div style={{...css.card,padding:0,overflow:"hidden"}}>
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
            {vis.length===0&&<tr><td colSpan={8} style={{...css.td,textAlign:"center",color:P.muted,padding:20}}>{t("No recipes found.","சமையல் இல்லை.")}</td></tr>}
            {vis.map((r,i)=>(
              <tr key={r.id} style={{background:i%2===0?P.white:P.highlight,cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#FDE8C4"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?P.white:P.highlight}>
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
                    <button style={css.btn("danger",true)} title="Delete" onClick={()=>setRecipes(p=>p.filter(x=>x.id!==r.id))}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:11,color:P.muted,marginTop:4}}>{vis.length} {t("recipe(s) shown","சமையல்கள் காட்டப்படுகின்றன")} — {t("click name to view / edit details","பெயரை சொடுக்கி விவரம் காண்க")}</div>
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
        <tbody>{(f.ingredients||[]).map((ing,i)=>{const d=ingredients.find(x=>x.id===ing.iid);return(<tr key={i}><td style={css.td}>{d?(lang==="en"?d.name:d.nameTamil):ing.iid}</td><td style={css.td}>{ing.qty} {ing.unit}</td><td style={css.td}><button style={css.btn("danger",true)} onClick={()=>setF(x=>({...x,ingredients:x.ingredients.filter((_,j)=>j!==i)}))}>✕</button></td></tr>);})}</tbody>
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
  const real=orders.filter(o=>!o.isTemplate);
  const tpls=orders.filter(o=>o.isTemplate);
  const [dateQ,setDateQ]=useState("");
  const [nameQ,setNameQ]=useState("");

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

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <button style={css.btn()} onClick={()=>setModal({type:"order"})}>+ {t("New Order","புதிய ஆர்டர்")}</button>
        <button style={css.btn("ghost")} onClick={()=>setModal({type:"addLoc"})}>📍 {t("Add Location","இடம் சேர்")}</button>
        <input type="date" style={{...css.inp,width:150}} placeholder="Filter by date" value={dateQ} onChange={e=>setDateQ(e.target.value)}/>
        <input style={{...css.inp,maxWidth:200}} placeholder={t("Search order name...","பெயர் தேடு...")} value={nameQ} onChange={e=>setNameQ(e.target.value)}/>
        {(dateQ||nameQ)&&<button style={css.btn("ghost",true)} onClick={()=>{setDateQ("");setNameQ("");}}>✕ Clear</button>}
      </div>

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
  const {lang,setLocations}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const [f,setF]=useState({name:"",nameTamil:""});
  return(
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown,marginBottom:14}}>{t("Add Location","இடம் சேர்")}</div>
      <div style={css.g2}>
        <div><label style={css.lbl}>{t("Name (EN)","பெயர்")}</label><input style={css.inp} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></div>
        <div><label style={css.lbl}>{t("Name (Tamil)","தமிழ்")}</label><input style={{...css.inp,fontFamily:"'Noto Sans Tamil',sans-serif"}} value={f.nameTamil} onChange={e=>setF({...f,nameTamil:e.target.value})}/></div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
        <button style={css.btn("ghost")} onClick={onClose}>{t("Cancel","ரத்து")}</button>
        <button style={css.btn()} onClick={()=>{if(!f.name)return;setLocations(p=>[...p,{...f,id:Date.now()}]);onClose();}}>💾 {t("Save","சேமி")}</button>
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
  const [ne,setNe]=useState({locId:"",session:"Breakfast",recId:"",qty:""});
  const [recSearch,setRecSearch]=useState("");
  const [saveErr,setSaveErr]=useState("");
  const [entryErr,setEntryErr]=useState("");

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
    if(!ne.locId){setEntryErr(t("Select a location","இடம் தேர்வு செய்யவும்"));return;}
    if(!ne.recId){setEntryErr(t("Select a recipe","சமையல் தேர்வு செய்யவும்"));return;}
    if(!ne.qty||+ne.qty<=0){setEntryErr(t("Enter a valid quantity","அளவு கொடுக்கவும்"));return;}
    setEntryErr("");
    const rec=recipes.find(r=>r.id===+ne.recId);
    const curPax=f.pax&&+f.pax>0?+f.pax:null;
    // Lock baseQty and basePax at the moment of adding
    const entry={
      locId:+ne.locId,session:ne.session,recId:+ne.recId,
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
    const toSave={...f,pax:f.pax?+f.pax:undefined};
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

      <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,cursor:"pointer",marginBottom:12}}>
        <input type="checkbox" checked={f.isTemplate} onChange={e=>setF({...f,isTemplate:e.target.checked,date:e.target.checked?"":f.date})}/>
        {t("Save as Template (no date)","மாதிரியாக சேமி")}
      </label>

      {/* ── Add Entry Row ── */}
      <div style={{...css.sHead}}>{t("Order Entries","பதிவுகள்")}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",padding:10,background:P.highlight,borderRadius:8,marginBottom:6}}>
        <select style={css.sel} value={ne.locId} onChange={e=>setNe({...ne,locId:e.target.value})}>
          <option value="">{t("Location","இடம்")}</option>
          {locations.map(l=><option key={l.id} value={l.id}>{lang==="en"?l.name:l.nameTamil}</option>)}
        </select>
        <select style={css.sel} value={ne.session} onChange={e=>setNe({...ne,session:e.target.value})}>{SESSIONS.map(s=><option key={s}>{s}</option>)}</select>
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
  const t=(en,ta)=>rLang==="en"?en:ta;
  const n=(x)=>rLang==="en"?x.name:x.nameTamil;
  const [dt,setDt]=useState(TODAY);

  const entries=orders.filter(o=>!o.isTemplate&&o.date===dt).flatMap(o=>o.entries.map(e=>({...e,_order:o})));

  // Build session → recipe → ingredients
  const sessData=SESSIONS.map(sess=>{
    const sessEntries=entries.filter(e=>e.session===sess);
    const byRec={};
    sessEntries.forEach(e=>{
      const rec=recipes.find(r=>r.id===e.recId); if(!rec)return;
      if(!byRec[e.recId])byRec[e.recId]={rec,totalQty:0,totalMult:0};
      byRec[e.recId].totalMult+=e.qty/(rec.yield||1);
      byRec[e.recId].totalQty+=e.qty;
    });
    const recs=Object.values(byRec).map(item=>({
      ...item,
      ings:mergeIngs(expandRecipeIngs(item.rec,item.totalMult,recipes,ingredients))
    }));
    return {session:sess,recs};
  }).filter(sd=>sd.recs.length>0);

  const hasData=sessData.length>0;

  const printSession=(sd)=>{
    const recBlocks=sd.recs.map(({rec,totalQty,ings})=>{
      const ingRows=ings.map(r=>"<tr><td><strong>"+n(r.d)+"</strong></td><td>"+r.d.category+"</td><td><strong>"+r.qty.toFixed(2)+" "+r.unit+"</strong></td></tr>").join("");
      return "<h3 style='color:#5C2A0A;margin:14px 0 4px'>"+n(rec)+" <span style='font-size:12px;font-weight:400;color:#9B7355'>"+totalQty.toFixed(1)+" "+rec.yieldUnit+"</span></h3>"
        +"<table><thead><tr><th>"+t("Ingredient","பொருள்")+"</th><th>"+t("Category","வகை")+"</th><th>"+t("Qty","அளவு")+"</th></tr></thead>"
        +"<tbody>"+ingRows+"</tbody></table>";
    }).join("");
    printHTML(sd.session+" — "+t("Dish-wise Ingredients","சமையல் வாரியாக பொருட்கள்")+" ("+dt+")",
      "<h2 style='border:none;margin:0 0 4px'>"+sd.session+"</h2><p style='color:#9B7355;margin:0 0 12px;font-size:12px'>"+t("Date","தேதி")+": "+dt+" &nbsp;|&nbsp; "+sd.recs.length+" "+t("dish(es)","சமையல்")+"</p>"+recBlocks);
  };

  const exportSession=(sd)=>{
    // Build rows with recipe as bold heading row, ingredients below, blank row between
    const rows=[];
    sd.recs.forEach(({rec,totalQty,ings},ri)=>{
      // Recipe heading row
      rows.push({
        "Recipe / Ingredient":"▶ "+n(rec)+" ("+totalQty.toFixed(1)+" "+rec.yieldUnit+")",
        Category:"",Quantity:"",Unit:""
      });
      // Ingredient rows
      ings.forEach(r=>rows.push({
        "Recipe / Ingredient":"    "+n(r.d),
        Category:r.d.category,
        Quantity:+r.qty.toFixed(2),
        Unit:r.unit,
      }));
      // Blank separator
      if(ri<sd.recs.length-1)rows.push({"Recipe / Ingredient":"",Category:"",Quantity:"",Unit:""});
    });
    exportXlsxSheets("dish_ingredients_"+sd.session+"_"+dt+".xlsx",[{name:sd.session.slice(0,31),data:rows}]);
  };

  return(
    <div>
      <ReportBar onPrint={null} onExport={null} lang={rLang} setLang={setRLang}>
        <div><label style={css.lbl}>{t("Date","தேதி")}</label><input type="date" style={{...css.inp,width:160}} value={dt} onChange={e=>setDt(e.target.value)}/></div>
        {entries.length>0&&<button style={css.btn("info",true)} onClick={()=>setModal({type:"postIssues",date:dt})}>📦 {t("Post Issues","சரக்கு போடு")}</button>}
      </ReportBar>
      {!hasData&&<div style={{color:P.muted,textAlign:"center",padding:24}}>{t("No orders for this date.","இந்த தேதியில் ஆர்டர் இல்லை.")}</div>}
      {sessData.map(sd=>(
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
          {/* Dishes in this session */}
          {sd.recs.map(({rec,totalQty,ings})=>(
            <div key={rec.id} style={{marginBottom:14}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:700,color:P.deepBrown,
                borderBottom:"1px solid #EDD9A3",paddingBottom:5,marginBottom:6}}>
                {n(rec)}
                <span style={{marginLeft:10,fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:400,color:P.muted}}>
                  {totalQty.toFixed(1)} {rec.yieldUnit}
                </span>
              </div>
              <table style={css.table}>
                <thead><tr>
                  <th style={css.th}>{t("Ingredient","பொருள்")}</th>
                  <th style={css.th}>{t("Category","வகை")}</th>
                  <th style={css.th}>{t("Quantity","அளவு")}</th>
                </tr></thead>
                <tbody>{ings.map((row,i)=>(
                  <tr key={row.d.id} style={{background:i%2===0?P.white:P.highlight}}>
                    <td style={css.td}><strong>{n(row.d)}</strong></td>
                    <td style={css.td}><span style={css.badge(CATCOLOR[row.d.category]||P.muted)}>{row.d.category}</span></td>
                    <td style={css.td}><strong style={{color:P.saffron}}>{row.qty.toFixed(2)} {row.unit}</strong></td>
                  </tr>
                ))}</tbody>
              </table>
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
  const n=(x)=>rLang==="en"?x.name:x.nameTamil;
  const [dt,setDt]=useState(TODAY);

  const entries=orders.filter(o=>!o.isTemplate&&o.date===dt).flatMap(o=>o.entries.map(e=>({...e,_order:o})));

  // Build session → ingredient → dishes
  const sessData=SESSIONS.map(sess=>{
    const sessEntries=entries.filter(e=>e.session===sess);
    const rows=computeTotals(sessEntries,recipes,ingredients);
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

  const hasData=sessData.length>0;

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
      {!hasData&&<div style={{color:P.muted,textAlign:"center",padding:24}}>{t("No orders for this date.","இந்த தேதியில் ஆர்டர் இல்லை.")}</div>}
      {sessData.map(sd=>(
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
  const n=(x)=>rLang==="en"?x.name:x.nameTamil;
  const [dates,setDates]=useState([TODAY]);

  const addDate=()=>{if(dates.length<7)setDates(d=>[...d,TODAY]);};
  const removeDate=i=>setDates(d=>d.filter((_,j)=>j!==i));
  const changeDate=(i,v)=>setDates(d=>d.map((x,j)=>j===i?v:x));
  const sortedDates=[...new Set(dates)].sort();

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
  const buildData=(sessFilter)=>{
    const byDate={};
    sortedDates.forEach(dt=>{
      byDate[dt]={};
      const ents=orders.filter(o=>!o.isTemplate&&o.date===dt)
        .flatMap(o=>o.entries.filter(e=>sessFilter==="All"||e.session===sessFilter).map(e=>({...e,_order:o})));
      computeTotals(ents,recipes,ingredients).forEach(r=>{
        const id=r.d.id;
        if(!byDate[dt][id])byDate[dt][id]={d:r.d,qty:0,unit:r.unit};
        byDate[dt][id].qty+=r.qty;
      });
    });
    const combined={};
    sortedDates.forEach(dt=>{
      Object.values(byDate[dt]).forEach(r=>{
        if(!combined[r.d.id])combined[r.d.id]={d:r.d,qty:0,unit:r.unit};
        combined[r.d.id].qty+=r.qty;
      });
    });
    const allIngIds=[...new Set(sortedDates.flatMap(dt=>Object.keys(byDate[dt]).map(Number)))];
    const allIngs=allIngIds
      .map(id=>ingredients.find(x=>x.id===id)).filter(Boolean)
      .sort((a,b)=>CATS.indexOf(a.category)-CATS.indexOf(b.category)||a.name.localeCompare(b.name));
    return {byDate,combined,allIngs};
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
  const {byDate,combined,allIngs}=useMemo(()=>buildData(activeTab),[activeTab,dates,orders,recipes,ingredients]);
  const hasData=allIngs.length>0;

  return(
    <div>
      <ReportBar onPrint={null} onExport={null} lang={rLang} setLang={setRLang}>
        <div>
          <label style={css.lbl}>{t("Dates (up to 7)","தேதிகள்")}</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {dates.map((d,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                <input type="date" style={{...css.inp,width:148}} value={d} onChange={e=>changeDate(i,e.target.value)}/>
                {dates.length>1&&<button style={css.btn("danger",true)} onClick={()=>removeDate(i)}>✕</button>}
              </div>
            ))}
            {dates.length<7&&<button style={css.btn("ghost",true)} onClick={addDate}>{"+ "+t("Add Date","தேதி சேர்")}</button>}
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
  const n=(x)=>rLang==="en"?x.name:x.nameTamil;
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
// REPORT: COLUMNAR (locations as columns)
// ════════════════════════════════════════════════════════════════════
function RepCol({ctx}){
  const {orders,recipes,locations,lang:gLang}=ctx;
  const [rLang,setRLang]=useState(gLang);
  const t=(en,ta)=>rLang==="en"?en:ta;
  const n=(x)=>rLang==="en"?x.name:x.nameTamil;
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
  const n=(x)=>rLang==="en"?x.name:x.nameTamil;
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
// INVENTORY
// ════════════════════════════════════════════════════════════════════
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

function PostIssues({ctx,date,onClose}){
  const {orders,recipes,ingredients,setInventory,lang}=ctx;
  const t=(en,ta)=>lang==="en"?en:ta;
  const entries=orders.filter(o=>!o.isTemplate&&o.date===date).flatMap(o=>o.entries.map(e=>({...e,_order:o})));
  const rows=computeTotals(entries,recipes,ingredients);
  const totals={};
  rows.forEach(r=>{if(!totals[r.d.id])totals[r.d.id]={d:r.d,qty:0,unit:r.unit};totals[r.d.id].qty+=r.qty;});
  const [edits,setEdits]=useState(Object.fromEntries(Object.values(totals).map(r=>[r.d.id,r.qty.toFixed(2)])));

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

  return(
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:P.deepBrown,marginBottom:6}}>{t("Post Issues to Inventory","சரக்கு வழங்கு")}</div>
      <div style={{fontSize:12,color:P.muted,marginBottom:14}}>{t("Edit quantities if any taste adjustment is needed before posting.","சுவைக்கேற்ப அளவை திருத்தவும்.")} <strong>{date}</strong></div>
      {Object.keys(totals).length===0&&<div style={{color:P.muted,textAlign:"center",padding:16}}>{t("No orders found for this date.","ஆர்டர் இல்லை.")}</div>}
      <table style={css.table}>
        <thead><tr>
          <th style={css.th}>{t("Ingredient","பொருள்")}</th>
          <th style={css.th}>{t("Calculated","கணித்தது")}</th>
          <th style={css.th}>{t("Qty to Issue","வழங்கும் அளவு")}</th>
          <th style={css.th}>{t("Norm Cost","நிலையான விலை")}</th>
          <th style={css.th}>{t("Issue Value","மதிப்பு")}</th>
        </tr></thead>
        <tbody>{Object.values(totals).map((r,i)=>{
          const issueVal=(r.d.normCost||0)*(+edits[r.d.id]||r.qty);
          return(
            <tr key={r.d.id} style={{background:i%2===0?P.white:P.highlight}}>
              <td style={css.td}><strong>{lang==="en"?r.d.name:r.d.nameTamil}</strong></td>
              <td style={css.td}>{r.qty.toFixed(2)} {r.unit}</td>
              <td style={css.td}>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <input type="number" step="0.01" style={{...css.inp,width:90,borderColor:+edits[r.d.id]!==+r.qty.toFixed(2)?"#F59E0B":"#DCC88A"}} value={edits[r.d.id]} onChange={e=>setEdits(x=>({...x,[r.d.id]:e.target.value}))}/>
                  <span style={{fontSize:11,color:P.muted}}>{r.unit}</span>
                  {+edits[r.d.id]!==+r.qty.toFixed(2)&&<span style={css.badge(P.saffron)}>✏️</span>}
                </div>
              </td>
              <td style={css.td}>{r.d.normCost?<span style={{color:P.purple}}>₹{r.d.normCost}/{r.d.unit}</span>:<span style={{color:"#CCC"}}>—</span>}</td>
              <td style={css.td}>{issueVal>0?<strong style={{color:P.success}}>₹{issueVal.toFixed(2)}</strong>:<span style={{color:"#CCC"}}>—</span>}</td>
            </tr>
          );
        })}</tbody>
      </table>
      {(()=>{
        const totalCost=Object.values(totals).reduce((s,r)=>s+(r.d.normCost||0)*(+edits[r.d.id]||r.qty),0);
        return totalCost>0?(
          <div style={{background:P.success+"18",border:`1px solid ${P.success}33`,borderRadius:7,padding:"8px 12px",marginTop:10,fontSize:13,fontWeight:600,color:P.success,textAlign:"right"}}>
            📐 {t("Total Normative Issue Value","மொத்த நிலையான வழங்கல் மதிப்பு")}: ₹{totalCost.toFixed(2)}
          </div>
        ):null;
      })()}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
        <button style={css.btn("ghost")} onClick={onClose}>{t("Cancel","ரத்து")}</button>
        <button style={css.btn("success")} onClick={post}>📦 {t("Post Issues","வழங்கு")}</button>
      </div>
    </div>
  );
}
