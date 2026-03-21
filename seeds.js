// ── Seed data ────────────────────────────────────────────────────────────────
// Used to initialise Firestore on first run

const P_SEED = {
  saffron:"#E8821A",gold:"#C9960C",purple:"#6B3FA0",muted:"#9B7355",
  deepBrown:"#5C2A0A",success:"#1A7A40"
};

const RTYPE_SEED=[
  {id:"sambar",        en:"Sambar",          ta:"சாம்பார்",       color:P_SEED.saffron},
  {id:"kuzhambu",      en:"Kuzhambu",        ta:"குழம்பு",         color:"#B45309"},
  {id:"rasam",         en:"Rasam",           ta:"ரசம்",             color:"#92400E"},
  {id:"kootu",         en:"Kootu",           ta:"கூட்டு",           color:"#065F46"},
  {id:"vellai_poriyal",en:"Vellai Poriyal",  ta:"வெள்ளை பொரியல்", color:"#2E7D32"},
  {id:"kara_poriyal",  en:"Kara Poriyal",    ta:"கார பொரியல்",      color:"#C0392B"},
  {id:"pachadi",       en:"Pachadi",         ta:"பச்சடி",           color:"#1A6B8A"},
  {id:"mandi",         en:"Mandi / Kolambu", ta:"மண்டி / கொழம்பு", color:"#6B3FA0"},
  {id:"payasam",       en:"Payasam",         ta:"பாயசம்",           color:P_SEED.gold},
  {id:"piece_sweet",   en:"Piece Sweet",     ta:"பீஸ் இனிப்பு",    color:"#DB2777"},
  {id:"bulk_sweet",    en:"Bulk Sweet",      ta:"மொத்த இனிப்பு",   color:"#BE185D"},
  {id:"rice",          en:"Rice / Sadam",    ta:"சாதம்",            color:P_SEED.deepBrown},
  {id:"tiffin",        en:"Tiffin",          ta:"டிஃபின்",          color:"#0EA5E9"},
  {id:"chutney",       en:"Chutney",         ta:"சட்னி",            color:"#2E7D32"},
  {id:"salad",         en:"Salad / Raita",   ta:"சாலட் / பச்சடி",  color:"#0D9488"},
  {id:"gravy",         en:"Gravy / Curry",   ta:"கிரேவி",           color:"#7C3AED"},
  {id:"sub",           en:"Sub-Recipe/Base", ta:"துணை சமையல்",      color:P_SEED.purple},
  {id:"other",         en:"Other",           ta:"மற்றவை",           color:P_SEED.muted},
];


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


export const INV0 = { purchases: [], issues: [] };
export { RTYPE_SEED, ING0, REC0, LOC0 };
