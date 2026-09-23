/**
 * SEO, AEO i GEO Optimizovani Generator Sadržaja (Blog Članci & Ciljane Landing Stranice)
 * Specijalizovan za tradicionalnu etno radionicu "Savremeni Koreni"
 * 
 * Karakteristike:
 * 1. Ljudski stil pisanja (Human-Crafted, Anti-AI Detector / Nedetektabilno)
 * 2. AEO (Answer Engine Optimization) - definisani direktni odgovori i strukturirani FAQ
 * 3. GEO (Geografsko i lokalno pozicioniranje) - Homolje, Pešter, Zlatibor, Pirot, Šumadija, Srbija & Dijaspora
 * 4. Kompletno generisanje ciljanih Landing Stranica (H1, podnaslovi, prednosti, sekcije sa citatima, FAQ)
 * 5. Podrška za direktan unos i testiranje Google Gemini API ključa uz izbor modela:
 *    - gemini-2.5-flash (ultra-brz i efikasan)
 *    - gemini-2.5-pro (za najsloženije, dubinske tekstualne zadatke)
 * 6. Radi 100% klijentski na Cloudflare Pages bez ikakvog servera ili workera!
 */

import { SeoLandingPageData } from '../data/seoLandingPagesData';

export interface GeneratedBlogPostResult {
  titleSr: string;
  titleEn: string;
  slug: string;
  excerptSr: string;
  excerptEn: string;
  contentSr: string;
  contentEn: string;
  metaTitle: string;
  metaDescription: string;
  targetKeywords: string[];
  geoRegions: string[];
  aeoDirectAnswer: string;
  faqList: Array<{ question: string; answer: string }>;
  readingTime: string;
  categoryLabel: string;
}

export interface BlogGeneratorParams {
  topic: string;
  keyword?: string;
  tone?: 'artisan' | 'history' | 'buyers_guide' | 'heritage_diaspora';
  writingStyle?: 'artisan' | 'premium' | 'editorial' | 'informational' | 'educational' | 'storytelling' | 'sales' | 'traditional';
  wordCount?: 300 | 500 | 750 | 1000 | 1500 | 2000 | 2500 | 3000 | 3500 | 4000;
  seoEnabled?: boolean;
  aeoEnabled?: boolean;
  geoEnabled?: boolean;
  geoRegion?: 'all' | 'homolje' | 'zlatibor' | 'pirot' | 'pester' | 'sumadija';
  geminiApiKey?: string;
  geminiModel?: 'gemini-2.5-flash' | 'gemini-2.5-pro';
}

export interface LandingPageGeneratorParams {
  topic: string;
  keyword?: string;
  targetAudience?: 'general' | 'folklore' | 'diaspora' | 'slava_gifts' | 'collectors';
  writingStyle?: 'artisan' | 'premium' | 'editorial' | 'informational' | 'educational' | 'storytelling' | 'sales' | 'traditional';
  wordCount?: 500 | 750 | 1000 | 1500 | 2000 | 2500 | 3000 | 3500 | 4000;
  seoEnabled?: boolean;
  aeoEnabled?: boolean;
  geoEnabled?: boolean;
  geoRegion?: 'all' | 'homolje' | 'zlatibor' | 'pirot' | 'pester' | 'sumadija';
  productCategory?: 'subare' | 'nosnje' | 'carape' | 'pokloni' | 'torbice' | 'nakit' | 'kosulje' | 'dom-pokloni';
  geminiApiKey?: string;
  geminiModel?: 'gemini-2.5-flash' | 'gemini-2.5-pro';
}

export type GeneratedLandingPageResult = SeoLandingPageData;

/**
 * Validacija i testiranje Gemini API ključa
 */
export async function testGeminiApiKey(
  apiKey: string, 
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro' = 'gemini-2.5-flash'
): Promise<{ success: boolean; message: string }> {
  if (!apiKey || apiKey.trim().length < 10) {
    return { success: false, message: 'Unesite validan Gemini API ključ.' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Pozdrav majstore, potvrdi da je API ključ funkcionalan u 3 reči.' }] }],
        generationConfig: { maxOutputTokens: 20 }
      })
    });

    if (resp.ok) {
      return { success: true, message: `✅ Ključ je aktivan i povezan sa modelom ${model}!` };
    } else {
      const err = await resp.json().catch(() => ({}));
      return { success: false, message: `Greška: ${err.error?.message || `Status ${resp.status}`}` };
    }
  } catch (err: any) {
    return { success: false, message: `Mrežna greška pri testiranju: ${err.message || 'Nepoznata greška'}` };
  }
}

/**
 * Pomoćna funkcija za kreiranje SEO slug-a
 */
export function cleanSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[šđčćž]/g, (c) => ({ 'š': 's', 'đ': 'dj', 'č': 'c', 'ć': 'c', 'ž': 'z' }[c] || c))
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** People-first / Human Editorial kontrola. Ne procenjuje da li je tekst AI; proverava merljive osobine teksta. */
export interface HumanEditorialCheck { key: string; label: string; ok: boolean; detail: string; }

export function validatePeopleFirstText(text: string): HumanEditorialCheck[] {
  const source = (text || '').replace(/[#*_>`]/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = source.toLocaleLowerCase('sr-Latn');
  const checks: HumanEditorialCheck[] = [];
  const banned = ['u današnjem modernom svetu','u savremenom dobu','kao što svi znamo','u ovom članku ćemo','bez daljeg odlaganja','fascinantno putovanje','možemo zaključiti','igra ključnu ulogu'];
  const found = banned.filter(p => lower.includes(p));
  checks.push({ key:'cliches', label:'Bez generičkih AI klišea', ok:found.length===0, detail:found.length ? 'Pronađeno: '+found.join(', ') : 'Nema poznatih klišea' });
  const sentences = source.split(/[.!?]+/).map(s=>s.trim()).filter(Boolean);
  const words = source.split(/\s+/).filter(Boolean);
  const uniqueRatio = words.length ? new Set(words.map(w=>w.toLocaleLowerCase('sr-Latn'))).size / words.length : 0;
  checks.push({ key:'variation', label:'Jezička raznovrsnost', ok:words.length<80 || uniqueRatio>=0.35, detail:'Odnos jedinstvenih reči: '+Math.round(uniqueRatio*100)+'%' });
  const repeatedSentence = sentences.length>8 && new Set(sentences.map(s=>s.toLocaleLowerCase('sr-Latn'))).size < sentences.length*0.9;
  checks.push({ key:'repetition', label:'Bez ponavljanja rečenica', ok:!repeatedSentence, detail:repeatedSentence ? 'Pronađena su ponavljanja' : 'Nema značajnih ponavljanja' });
  checks.push({ key:'substance', label:'Dovoljno konkretan sadržaj', ok:words.length>=120, detail:words.length>=120 ? 'Tekst ima dovoljno prostora za konkretne informacije' : 'Tekst je prekratak za pouzdanu procenu' });
  return checks;
}

export interface ContentSourceFact {
  label: string;
  value: string;
  source: 'product' | 'site' | 'user' | 'verified';
  required?: boolean;
}

export interface SuperCoolGeneratorOptions {
  sourceFacts?: ContentSourceFact[];
  forbidUnverifiedClaims?: boolean;
  requireEditorialReview?: boolean;
}

export function buildPeopleFirstBrief(
  topic: string,
  keyword?: string,
  sourceFacts: ContentSourceFact[] = []
): string {
  const verified = sourceFacts
    .filter(f => f.value.trim())
    .map(f => `- ${f.label}: ${f.value} [${f.source}]`)
    .join('\n');
  return [
    'CONTENT BRIEF — PEOPLE-FIRST / SUPER COOL',
    `Tema: ${topic}`,
    `Primarna ključna reč: ${keyword || 'nije zadato'}`,
    verified ? 'Proverene činjenice koje smeš koristiti:\n' + verified : 'Nema dodatih proverених činjenica.',
    'Pravilo: ne izmišljaj poreklo, materijale, mere, postupke, iskustva kupaca, rokove, sertifikate ili druge činjenice koje nisu potvrđene.',
    'Tekst treba da bude koristan čoveku i razumljiv pretraživačima i generativnim sistemima; SEO/AEO/GEO služe sadržaju, ne obrnuto.'
  ].join('\n');
}

export function validateSourceFacts(
  text: string,
  sourceFacts: ContentSourceFact[] = [],
  forbidUnverifiedClaims = true
): ContentValidationItem {
  if (!forbidUnverifiedClaims || sourceFacts.length === 0) {
    return { key: 'facts', label: 'Činjenična osnova', ok: true, detail: sourceFacts.length ? `${sourceFacts.length} činjenica prosleđeno generatoru` : 'Nema obaveznih činjenica za proveru' };
  }
  const body = text.toLocaleLowerCase('sr-Latn');
  const missing = sourceFacts.filter(f => f.required && f.value.trim() && !body.includes(f.value.toLocaleLowerCase('sr-Latn')));
  return {
    key: 'facts',
    label: 'Činjenična osnova',
    ok: missing.length === 0,
    detail: missing.length ? 'Obavezne činjenice nisu pronađene u tekstu: ' + missing.map(f => f.label).join(', ') : 'Obavezne prosleđene činjenice su zastupljene'
  };
}

export interface ContentValidationItem { key: string; label: string; ok: boolean; detail: string; }
export interface ContentValidationResult { ok: boolean; score: number; items: ContentValidationItem[]; }

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

/** Deterministička validacija rezultata pre prihvatanja u Admin 2.0. */
export function validateGeneratedBlogResult(
  result: GeneratedBlogPostResult,
  options: Pick<BlogGeneratorParams, 'keyword' | 'wordCount' | 'seoEnabled' | 'aeoEnabled' | 'geoEnabled'>
): ContentValidationResult {
  const body = result.contentSr || '';
  const words = countWords(body);
  const target = options.wordCount || 1000;
  const tolerance = target * 0.10;
  const keyword = (options.keyword || '').trim().toLocaleLowerCase('sr-Latn');
  const haystack = (result.titleSr + ' ' + result.excerptSr + ' ' + body).toLocaleLowerCase('sr-Latn');
  const items: ContentValidationItem[] = [];
  const add = (key: string, label: string, ok: boolean, detail: string) => items.push({ key, label, ok, detail });
  add('title', 'Naslov', Boolean(result.titleSr?.trim()), result.titleSr ? 'Prisutan' : 'Nedostaje');
  add('slug', 'Slug', Boolean(result.slug?.trim()) && !/\s/.test(result.slug), result.slug || 'Nedostaje ili sadrži razmake');
  add('length', 'Dužina sadržaja', words >= target - tolerance && words <= target + tolerance, `${words} reči / cilj ${target} ±10%`);
  add('keyword', 'Primarna ključna reč', !keyword || haystack.includes(keyword), keyword ? (haystack.includes(keyword) ? 'Pronađena u sadržaju' : 'Nije pronađena') : 'Nije zadato');
  add('excerpt', 'Excerpt', Boolean(result.excerptSr?.trim()), result.excerptSr ? 'Prisutan' : 'Nedostaje');
  if (options.seoEnabled !== false) {
    add('meta-title', 'SEO Meta title', Boolean(result.metaTitle?.trim()) && result.metaTitle.length <= 65, `${result.metaTitle?.length || 0}/65 karaktera`);
    add('meta-description', 'SEO Meta description', Boolean(result.metaDescription?.trim()) && result.metaDescription.length <= 170, `${result.metaDescription?.length || 0}/170 karaktera`);
  }
  if (options.aeoEnabled !== false) {
    add('aeo-answer', 'AEO direktan odgovor', Boolean(result.aeoDirectAnswer?.trim()), result.aeoDirectAnswer ? 'Prisutan' : 'Nedostaje');
    add('faq', 'AEO FAQ', Array.isArray(result.faqList) && result.faqList.length > 0, `${Array.isArray(result.faqList) ? result.faqList.length : 0} pitanja`);
  }
  if (options.geoEnabled !== false) add('geo', 'GEO podaci', Array.isArray(result.targetKeywords) && result.targetKeywords.length > 0, `${result.targetKeywords?.length || 0} ciljanih pojmova`);
  const passed = items.filter(i => i.ok).length;
  return { ok: items.length > 0 && passed === items.length, score: Math.round((passed / Math.max(items.length, 1)) * 100), items };
}

// -------------------------------------------------------------------
// BLOG PRESETI (100% Ljudski zanatski stil)
// -------------------------------------------------------------------
const PRESET_BLOG_TEMPLATES: Record<string, {
  keywords: string[];
  sr: {
    title: string;
    excerpt: string;
    aeoAnswer: string;
    h2_1: string;
    body_1: string;
    h2_2: string;
    body_2: string;
    h2_3: string;
    body_3: string;
    faq: Array<{ q: string; a: string }>;
  };
  en: {
    title: string;
    excerpt: string;
    aeoAnswer: string;
    h2_1: string;
    body_1: string;
    h2_2: string;
    body_2: string;
    h2_3: string;
    body_3: string;
    faq: Array<{ q: string; a: string }>;
  };
}> = {
  "subare": {
    keywords: ["srpska šubara", "šubara od prirodnog jagnjećeg krzna", "kako održavati šubaru", "peštersko krzno", "etno šubare"],
    sr: {
      title: "Prava Srpska Šubara od Jagnjećeg Krzna: Kako Prepoznati Autentičnost i Čuvati Je Decenijama",
      excerpt: "Nije svaka šubara ista. Razlika između industrijske sintetike i prave pešterske šubare leži u gustini runa, prirodnom mirisu vune i majstorskom kroju koji ne popušta ni na mrazu od minus dvadeset.",
      aeoAnswer: "Prava tradicionalna srpska šubara izrađuje se isključivo od 100% prirodnog jagnjećeg ili ovčijeg krzna autohtonih rasa sa Peštera i Homolja. Prepoznaje se po gustoj poddlaci, prirodnoj elastičnosti i unutrašnjoj postavi od pamučnog satena. Održava se provetravanjem na suvom mrazu i češljanjem retkim češljem, a nikada pranjem u vodi.",
      h2_1: "Dodir pod prstima koji se ne zaboravlja",
      body_1: "U radionici 'Savremeni Koreni' svaki komad krzna prolazi kroz ruke pre nego što makaze uopšte dodirnu kožu. Dobro jagnjeće krzno mora imati gustu, elastičnu poddlaku koja pruža termoregulaciju. Kada stavite ruku u pravo krzno, u roku od nekoliko sekundi osetićete prijatnu, tihu toplotu bez ikakvog znojenja. Sintetičke imitacije koje danas preplavljuju pijace zadržavaju vlagu i guše glavu, dok prirodna vuna diše.",
      h2_2: "Tajna majstorskog kroja: Zašto šubara stoji ponosno",
      body_2: "Postoji razlog zašto su naši stari nosili šubaru uspravno. Kroj mora pratiti liniju glave, a unutrašnji obod ne sme pritiskati čelo. Koristimo ručno sečene klinove krzna, spajane specijalnim voskiranim koncem koji ne puca pod naponom. Kada se jednom oblikuje prema vašoj glavi, šubara postaje lični pečat – komad odeće koji ne prati prolazne modne hirove već svedoči o karakteru.",
      h2_3: "Kako se čuva šubara kad prođu zimski mrazevi",
      body_3: "Jedno zlatno pravilo naših majstora glasi: zaboravite na plastične kese i vlažne podrume. Prirodno krzno voli vazduh. Nakon zime, šubaru dobro protresite, lagano iščetkajte metalnim češljem sa zaobljenim vrhovima u smeru rasta dlake, stavite unutra malo prirodnog suvog cveta lavande i odložite je u prozračnu platnenu vreću. Ako pokisnete, nikada je ne sušite na radijatoru – pustite je da se prirodno osuši na sobnoj temperaturi.",
      faq: [
        { q: "Kako da znam koja je moja veličina šubare?", a: "Krojačkim metrom izmerite obim glave preko čela i iznad ušiju u centimetrima (npr. 58 cm odgovara veličini 58). Šubara treba da prijanja udobno, bez prevelikog stezanja." },
        { q: "Sme li se šubara prati u veš mašini?", a: "Nikako. Pranje u mašini trajno uništava prirodnu kožu i dovodi do skupljanja i pucanja. Za čišćenje se koristi samo suvo četkanje ili profesionalno krznarsko čišćenje." },
        { q: "Da li šubare šaljete u dijasporu?", a: "Da, radionica Savremeni Koreni redovno i sigurno šalje autentične šubare kupcima širom Evrope, Amerike, Kanade i Australije uz praćenje pošiljke." }
      ]
    },
    en: {
      title: "Authentic Serbian Shepherd Hat (Šubara): Craftsmanship, Heritage, and Care",
      excerpt: "Genuine Serbian šubara made from natural lambskin represents centuries of heritage. Discover how true artisans select premium fur and how to care for this timeless winter piece.",
      aeoAnswer: "An authentic Serbian šubara is handcrafted strictly from 100% natural sheepskin and lamb fur sourced from high-altitude Balkan regions such as Pešter and Homolje. It features dense natural wool that offers superior thermal insulation down to -25°C, requiring only dry airing and gentle brushing for lifetime durability.",
      h2_1: "The Unmistakable Feel of Natural Balkan Wool",
      body_1: "At our 'Savremeni Koreni' workshop, each sheepskin is carefully hand-inspected before cutting. Unlike synthetic imitations that trap moisture and overheat, genuine wool creates a breathable microclimate. Within seconds of putting it on, your head feels gentle, natural warmth that withstands blizzard winds.",
      h2_2: "Masterful Tailoring for an Iconic Silhouette",
      body_2: "Traditional tailoring demands precision. Curved fur wedges are sewn together with waxed heritage thread to ensure structural elasticity. Designed to fit the head comfortably without excessive tightness, each hat carries an unmistakable dignified posture.",
      h2_3: "Lifelong Care and Seasonal Storage",
      body_3: "Natural fur thrives on airflow. Never store your šubara in plastic bags or damp spaces. After winter, gently brush the fleece with a wide-tooth comb, add natural lavender blossoms for moth prevention, and store it in a breathable cotton garment pouch.",
      faq: [
        { q: "How do I measure my head for a šubara?", a: "Wrap a soft measuring tape around your head just above the ears and across the forehead in centimeters (e.g. 58 cm is size 58)." },
        { q: "Can I wash a genuine fur hat in water?", a: "Never. Water washing stiffens and damages the leather backing. Use only dry brushing or specialized fur cleaning." },
        { q: "Do you ship worldwide to the diaspora?", a: "Yes, Savremeni Koreni ships worldwide across Europe, the US, Canada, and Australia with international tracking." }
      ]
    }
  },
  "jelek": {
    keywords: ["srpski jelek", "narodni jelek zlatovez", "ženski jelek nošnja", "muški jelek čoja", "zlatovez srma"],
    sr: {
      title: "Jelek sa Zlatovezom: Zašto je Ovaj Komad Duša Svake Srpske Narodne Nošnje",
      excerpt: "Od zlatne srme koja se ne lomi do fine tamne čoje, pravi jelek je umetničko delo koje se nekada prenosilo s kolena na koleno kao najvredniji devojački miraz.",
      aeoAnswer: "Srpski narodni jelek je tradicionalni prsluk izrađen od visokokvalitetne čoje, pliša ili sukna, ukrašen zlatovezom ili srmovezom. Ženski jeleci se odlikuju dubokim izrezom i floralnim motivima, dok su muški svedenijeg kroja sa gustim gajtanima. Predstavlja centralni i najsvečaniji deo srpske narodne nošnje.",
      h2_1: "Zlato utkano u istoriju i porodično pamćenje",
      body_1: "Kada u našoj radionici sednemo za ram za vez, prvo se bira srma. To ne sme biti jeftin sintetički konac koji posle dve godine izbledi i potamni. Koristimo metalizovanu nit koja zadržava svoj plemeniti sjaj decenijama. Svaki cvet, svaka lozica i svaki geometrijski preplet na prsima jeleka ima svoje duboko značenje – od plodnosti do zaštite doma.",
      h2_2: "Razlika između muzejskog primerka i nosivog remek-dela",
      body_2: "Naš cilj u 'Savremenim Korenima' nije samo reprodukcija arhivskih krojeva, već stvaranje nošnje u kojoj se čovek oseća dostojanstveno i slobodno. Bilo da se jelek oblači za krsnu slavu, venčanje, krštenje ili nastup folklornog ansambla, linija kroja mora savršeno pratiti držanje tela. Čoja mora biti meka pod rukom, ali dovoljno čvrsta da drži strukturu.",
      h2_3: "Kako uklopiti tradicionalni jelek u savremene svečanosti",
      body_3: "Sve češće nam se javljaju mladi koji žele da za svoje venčanje ponesu autentičan srpski jelek preko bele košulje. To je spoj koji ostavlja bez daha: tradicija koja nije zaključana u vitrini, već živi punim plućima. Pravi jelek se kupuje jednom i ostavlja deci u amanet.",
      faq: [
        { q: "Koliko vremena je potrebno za ručnu izradu jednog jeleka?", a: "U zavisnosti od složenosti zlatoveza i gustine srme, za izradu jednog unikatnog jeleka potrebno je između 15 i 40 radnih sati pažljivog ručnog rada." },
        { q: "Da li se jelek izrađuje po tačnim merama kupca?", a: "Da, svaki jelek u radionici Savremeni Koreni kroji se i šije po individualnim merama (obim grudi, struka i dužina leđa)." },
        { q: "Kako se održava jelek sa zlatnim vezom?", a: "Čuva se na širokom drvenom ofingeru u platnenoj navlaci. Nikada se ne pegla direktno preko srme, već isključivo sa naličja preko zaštitnog pamučnog platna ili parom sa distance." }
      ]
    },
    en: {
      title: "The Handcrafted Serbian Jelek: Gold Embroidery, History, and Living Heritage",
      excerpt: "Decorated with opulent gold thread (srma) and tailored from fine wool broadcloth, the Serbian jelek vest remains the crown jewel of authentic Balkan folk costumes.",
      aeoAnswer: "The Serbian jelek is a traditional sleeveless vest meticulously crafted from premium wool broadcloth or velvet, adorned with intricate gold and silver thread embroidery known as zlatovez. Historically gifted as heirloom bridal dowry, it remains an essential garment for weddings, patron saint slava celebrations, and cultural ceremonies.",
      h2_1: "Gold Thread that Withstands Generations",
      body_1: "In traditional embroidery, shortcuts are immediately visible. We employ authentic metallic threads that maintain their radiant luster over decades. Each botanical vine, solar rosette, and knot ornament stitched onto the chest carries ancestral symbolism of prosperity and nobility.",
      h2_2: "Tailored Dignity for Contemporary Celebrations",
      body_2: "At Savremeni Koreni, our tailoring honors historic patterns while ensuring effortless comfort. The vest must contour the body naturally without restricting movement. From church matrimonies to diaspora banquets, wearing a hand-embroidered jelek makes an unforgettable statement of identity.",
      h2_3: "Passing Heirlooms from Generation to Generation",
      body_3: "Unlike mass-manufactured fashion destined for landfills, a bespoke jelek is created as an enduring family heirloom. When properly stored on a cedar hanger away from moisture, its wool and embroidery endure beautifully for decades.",
      faq: [
        { q: "How long does it take to embroider a bespoke jelek?", a: "Between 20 to 45 hours of meticulous artisan labor depending on the density of the gold thread patterns." },
        { q: "Can jeleks be made to custom measurements?", a: "Yes, every custom jelek is tailored precisely according to your chest circumference, waist, and spine length." },
        { q: "How should gold-embroidered garments be cleaned?", a: "Professional dry cleaning only, and gentle steaming from the reverse side to protect delicate thread work." }
      ]
    }
  }
};

// -------------------------------------------------------------------
// LANDING PAGE PRESETI (Ciljane Stranice za Rangiranje)
// -------------------------------------------------------------------
const PRESET_LANDING_TEMPLATES: Record<string, SeoLandingPageData> = {
  "vunene-carape": {
    slug: "vunene-carape-zlatibor",
    path: "/vunene-carape-zlatibor",
    badgeSr: "100% Prirodna Domaća Vuna • Zlatiborsko Pletenje",
    badgeEn: "100% Pure Organic Wool • Zlatibor Hand-Knit Craft",
    titleSr: "Ručno Pletene Vunene Čarape sa Zlatibora i Homolja",
    titleEn: "Authentic Hand-Knit Woolen Socks from Zlatibor & Homolje",
    subtitleSr: "Tople, prirodne i neprobojne za hladnoću. Izrađene od čistog runa domaće ovce pramenke po starinskoj recepturi pletenja na 5 igala.",
    subtitleEn: "Warm, natural, and impenetrable to biting cold. Handcrafted from pure mountain wool following ancient 5-needle knitting traditions.",
    metaTitleSr: "Vunene Čarape Ručni Rad | Zlatiborske i Homoljske | Savremeni Koreni",
    metaTitleEn: "Authentic Hand-Knit Woolen Socks | Savremeni Koreni Serbia",
    metaDescriptionSr: "Kupite prave ručno pletene vunene čarape od 100% domaće ovčije vune. Tople, prozračne, dugotrajne. Muške i ženske veličine, brza isporuka i slanje u inostranstvo.",
    metaDescriptionEn: "Order authentic Serbian hand-knit wool socks. 100% pure natural mountain wool, thermal comfort down to -25°C, worldwide diaspora shipping.",
    targetKeywords: ["vunene čarape ručni rad", "zlatiborske čarape", "pletene čarape od domaće vune", "prirodna vuna zima"],
    heroImage: "/images/homoljska_narodna_nosnja_1789032467664.jpg",
    secondaryImage: "/custom_products/1789327918037_1000019845.webp",
    productCategoryFilter: "carape",
    targetProductIds: [],
    keyHighlights: [
      {
        titleSr: "Čista Pramenka Vuna",
        titleEn: "Pure Pramenka Mountain Wool",
        descSr: "Prirodno runo bogato lanolinom koje greje bez zadržavanja neprijatnih mirisa i vlage.",
        descEn: "Natural high-lanolin fleece offering breathable insulation without odor buildup."
      },
      {
        titleSr: "Pletenje na 5 Igala",
        titleEn: "Seamless 5-Needle Technique",
        descSr: "Elastičan šav bez grubih rubova koji ne žulja stopalo ni pri celodnevnom hodu.",
        descEn: "Continuous circular knit without rough seams that ensures blister-free comfort."
      },
      {
        titleSr: "Otpornost na Mrazeve",
        titleEn: "Sub-Zero Thermal Guard",
        descSr: "Idealne za zimske dane, planinski boravak, lovačke ekspedicije i toplinu doma.",
        descEn: "Engineered for harsh mountain blizzards, hunting journeys, and cozy fireplace evenings."
      }
    ],
    contentSections: [
      {
        headingSr: "Tajna pletilja sa obronaka planina",
        headingEn: "The Alpine Knitting Legacy",
        paragraphsSr: [
          "U našoj radionici 'Savremeni Koreni', čarape ne nastaju na industrijskim razbojima. Svaki par počinje odabranim klupkom ručno predene domaće vune sa Zlatibora i Homoljskih padina.",
          "Zahvaljujući prirodnoj debljini prediva i elastičnom pletenju, ove čarape formiraju vazdušne jastuke koji čuvaju telesnu temperaturu čak i kada temperatura padne duboko ispod nule."
        ],
        paragraphsEn: [
          "At Savremeni Koreni, our socks bypass industrial machines. Every pair originates from hand-spun yarn sourced across high Serbian ridges.",
          "The density of traditional wool loops traps natural body warmth while expelling moisture, creating an unmatched microclimate."
        ],
        quoteSr: "Prava vunena čarapa nije modni hir za jednu zimu, već topli porodični štit koji traje godinama.",
        quoteEn: "Genuine wool socks are not transient winter accessories, but a protective shield built to endure."
      }
    ],
    faqs: [
      {
        questionSr: "Da li se vunene čarape bockaju?",
        questionEn: "Does pure wool itch against sensitive skin?",
        answerSr: "Naša vuna prolazi kroz blago pranje i češljanje. Kada se nose nekoliko puta ili operu blagim sapunom, prirodna vlakna omekšaju i prijatno greju.",
        answerEn: "Our wool is rinsed and combed carefully. Natural fibers soften noticeably after initial wears and mild conditioning."
      },
      {
        questionSr: "Kako se peru i održavaju ručno pletene čarape?",
        questionEn: "How do I wash and maintain hand-knit socks?",
        answerSr: "Isključivo ručno u mlakoj vodi sa blagim deterdžentom za vunu ili tečnim sapunom. Suše se položeno na peškiru, nikada na direktnom radijatoru.",
        answerEn: "Wash gently by hand in lukewarm water with wool detergent. Air dry flat on a towel; never on hot radiators."
      },
      {
        questionSr: "Mogu li se nositi u cipelama ili opancima?",
        questionEn: "Can they be worn inside boots or traditional opanci?",
        answerSr: "Svakako. Za čizme i opanke preporučujemo standardne modele koji se prilagođavaju obliku obuće.",
        answerEn: "Yes, they mold naturally to the interior volume of mountain boots and traditional leather opanci."
      }
    ],
    relatedBlogSlugs: ["subare-od-jagnjeceg-krzna"]
  },
  "opanci-za-folklor": {
    slug: "opanci-za-folklor-srbija",
    path: "/opanci-za-folklor-srbija",
    badgeSr: "Prirodna Goveđa Koža • Ojačani Đon za Scenu",
    badgeEn: "Genuine Vegetable Leather • Reinforced Stage Outsoles",
    titleSr: "Tradicionalni Kožni Opanci sa Kljunom za Folklor i Svečanosti",
    titleEn: "Authentic Serbian Leather Opanci for Folklore & Celebrations",
    subtitleSr: "Vrhunska ručna izrada opanaka sa povijenim kljunom i prepletom od opute. Napravljeni da izdrže najzahtevnije koreografije folklornih ansambala.",
    subtitleEn: "Master-crafted traditional leather footwear featuring upturned peak and handwoven rawhide laces. Engineered to endure dynamic stage performances.",
    metaTitleSr: "Opanci za Folklor | Kožni Opanci sa Kljunom | Savremeni Koreni",
    metaTitleEn: "Serbian Folklore Opanci Leather Shoes | Savremeni Koreni",
    metaDescriptionSr: "Kupite autentične kožne opanke sa kljunom za folklor i kulturno-umetnička društva. Prirodna goveđa koža, ojačan đon, ručno pletena oputa. Isporuka širom sveta.",
    metaDescriptionEn: "Order authentic handwoven Serbian opanci shoes. Genuine cowhide, stage-tested reinforced soles, worldwide shipping for diaspora folklore ensembles.",
    targetKeywords: ["opanci za folklor", "srpski kožni opanci", "opanci sa kljunom", "narodna obuća srbija"],
    heroImage: "/images/savremeni_hero_banner_1789021835867.jpg",
    secondaryImage: "/custom_products/1789327918894_1000019847.webp",
    productCategoryFilter: "nosnje",
    targetProductIds: [],
    keyHighlights: [
      {
        titleSr: "Scenski Ojačani Đon",
        titleEn: "Stage-Reinforced Outsole",
        descSr: "Dodatni sloj otporan na habanje sprečava proklizavanje na bini i štiti stopalo.",
        descEn: "Heavy-duty abrasion-resistant tread preventing slips during rigorous stage dances."
      },
      {
        titleSr: "Ručno Sečena Oputa",
        titleEn: "Continuous Rawhide Weave",
        descSr: "Preplet od elastičnih traka kože ravnomerno raspoređuje zatezanje oko rista.",
        descEn: "Interlocking rawhide straps distribute tension evenly across the foot instep."
      },
      {
        titleSr: "Oblikovanje po Stopalu",
        titleEn: "Custom Anatomical Fit",
        descSr: "Nakon nekoliko nošenja koža omekša i preuzima anatomsku siluetu noge.",
        descEn: "Natural leather softens with body heat, conforming precisely to arch contours."
      }
    ],
    contentSections: [
      {
        headingSr: "Anatomija scenskog opanka",
        headingEn: "Stage-Grade Engineering",
        paragraphsSr: [
          "Folklorni igrači znaju koliki napor trpi obuća tokom brzih kola i skokova. Zato u radionici 'Savremeni Koreni' svaki par opanaka izrađujemo od posebno odabrane štavljene kože sa dvostrukim šavom.",
          "Kljun na vrhu nije samo istorijski simbol, već štiti prste igrača od udaraca na bini, dok bočne opute drže stopalo stabilnim bez urezivanja."
        ],
        paragraphsEn: [
          "Professional folklore dancers demand footwear that withstands intense choreography. Each pair features double-stitched reinforcements.",
          "The signature toe peak shields dancers against accidental impacts, while perimeter lacing maintains lateral stability."
        ],
        quoteSr: "Kada igra kolo, korak mora biti siguran a opanak lak poput pera.",
        quoteEn: "When the circle dance accelerates, every footstep must strike with precision and lightness."
      }
    ],
    faqs: [
      {
        questionSr: "Kako odabrati veličinu za folklor?",
        questionEn: "How do I choose the correct dance size?",
        answerSr: "Preporučujemo vaš standardni broj cipela. Ako igrate sa debljim vunenim čarapama, uzmite jedan broj veći.",
        answerEn: "Order standard EU shoe size. If dancing with heavy hand-knit wool socks, order one size larger."
      },
      {
        questionSr: "Da li radite opanke za čitave folklorne ansamble (KUD-ove)?",
        questionEn: "Do you supply complete dance troupes and cultural associations?",
        answerSr: "Da, redovno opremamo folklorna društva iz Srbije i dijaspore (Evropa, SAD, Kanada, Australija) uz količinski popust.",
        answerEn: "Yes, we regularly outfit folklore ensembles globally with expedited bundle orders and troupe pricing."
      }
    ],
    relatedBlogSlugs: ["subare-od-jagnjeceg-krzna", "jelek-sa-zlatovezom"]
  },
  "slavski-pokloni": {
    slug: "slavski-etno-pokloni-srbija",
    path: "/slavski-etno-pokloni-srbija",
    badgeSr: "Autentični Ručni Rad • Poklon sa Blagoslovom",
    badgeEn: "Authentic Handcraft • Blessed Slava Heirloom",
    titleSr: "Najlepši Slavski i Svadbeni Pokloni od Prirodnih Materijala",
    titleEn: "Authentic Serbian Slava & Wedding Gifts: Handcrafted Heirlooms",
    subtitleSr: "Darujte poklon koji nosi dušu i tradiciju. Ručno vezeni detalji, unikatni etno predmeti i autentični komadi za domaćina i porodicu.",
    subtitleEn: "Present a gift carrying ancestral warmth. Hand-embroidered accents, authentic folk textiles, and bespoke heritage pieces for patron saint celebrations.",
    metaTitleSr: "Slavski Pokloni Ručni Rad | Poklon za Krsnu Slavu | Savremeni Koreni",
    metaTitleEn: "Authentic Serbian Slava Gifts | Handcrafted Heirlooms | Savremeni Koreni",
    metaDescriptionSr: "Tražite idealan poklon za krsnu slavu ili svadbu? Pogledajte naš izbor ručno rađenih slavskih poklona: vezeni peškiri, prsluci, šubare i etno detalji. Slanje u dijasporu.",
    metaDescriptionEn: "Discover unique handcrafted gifts for Serbian patron saint slava celebrations. Handwoven textiles, embroidered vests, worldwide diaspora delivery.",
    targetKeywords: ["slavski pokloni", "poklon za krsnu slavu", "etno pokloni ručni rad", "poklon za domacina"],
    heroImage: "/images/luxury_black_gold_emblem.jpg",
    secondaryImage: "/custom_products/1789327918894_1000019847.webp",
    productCategoryFilter: "pokloni",
    targetProductIds: [],
    keyHighlights: [
      {
        titleSr: "Poklon koji Ostaje Generacijama",
        titleEn: "Enduring Family Heirloom",
        descSr: "Nije potrošna roba već trajno svedočanstvo poštovanja prema domaćinu i krsnoj slavi.",
        descEn: "Not disposable decor, but a permanent token of devotion to patron saint traditions."
      },
      {
        titleSr: "100% Prirodni Materijali",
        titleEn: "Pure Natural Ingredients",
        descSr: "Domaća vuna, štavljena koža, čisto platno i postojana metalna srma.",
        descEn: "Organic wool, vegetable leather, pure linen, and non-tarnishing gold thread."
      },
      {
        titleSr: "Dostava za Dijasporu",
        titleEn: "Worldwide Diaspora Gifting",
        descSr: "Mogućnost slanja direktno slavljeniku u Evropi ili preko okeana uz posvetu.",
        descEn: "Direct delivery to celebrants across Europe, USA, Canada, and Australia."
      }
    ],
    contentSections: [
      {
        headingSr: "Kako odabrati dar dostojan slavske trpeze",
        headingEn: "Gifting with Reverence and Meaning",
        paragraphsSr: [
          "Odlazak na slavu u srpskom narodu oduvek je bio čin dubokog poštovanja. Domaćinu se ne nosi bezličan dar sa trgovačkih polica, već predmet u koji je utkana pažnja i vreme.",
          "U radionici 'Savremeni Koreni' svaki slavski dar pakujemo sa posebnom pažnjom, svedočeći o bogatstvu naše narodne baštine."
        ],
        paragraphsEn: [
          "Attending a Slava celebration has always signified familial honor. Bringing a gift from Savremeni Koreni connects modern homes with ancestral roots.",
          "Each piece is packaged with artisan dignity, ready to grace family celebrations."
        ],
        quoteSr: "Bolje je poneti jedan dar izatkan ljubavlju, nego stotinu bezličnih stvari.",
        quoteEn: "Better a single gift stitched with ancestral love than a hundred mass-produced objects."
      }
    ],
    faqs: [
      {
        questionSr: "Može li se uz poklon dodati lična posveta domaćinu?",
        questionEn: "Can I include a personalized greeting for the host?",
        answerSr: "Da, uz svaku slavsku porudžbinu možemo priložiti ručno ispisanu čestitku sa vašim tekstom.",
        answerEn: "Yes, we gladly enclose a handwritten calligraphy card featuring your custom dedication."
      },
      {
        questionSr: "Koliko ranije pre slave treba poručiti?",
        questionEn: "How far in advance should I order before Slava?",
        answerSr: "Za Srbiju je dovoljno 2-3 radna dana, dok za inostranstvo preporučujemo 7-10 dana.",
        answerEn: "Domestic Serbia delivery takes 2-3 business days; international delivery takes 7-10 business days."
      }
    ],
    relatedBlogSlugs: ["jelek-sa-zlatovezom"]
  }
};

// -------------------------------------------------------------------
// GENERISANJE BLOG ČLANAKA (Glavna funkcija)
// -------------------------------------------------------------------
export async function generateSeoAeoGeoArticle(params: BlogGeneratorParams): Promise<GeneratedBlogPostResult> {
  const { topic, keyword, tone = 'artisan', geoRegion = 'all', geminiApiKey, geminiModel = 'gemini-2.5-flash' } = params;

  // 1. Ako postoji uneti Gemini API ključ, pozivamo Gemini sa Anti-AI instrukcijama
  if (geminiApiKey && geminiApiKey.trim().length > 10) {
    try {
      const aiResult = await generateBlogWithGemini(params);
      if (aiResult) return aiResult;
    } catch (err) {
      console.warn("Direct Gemini Blog failed, checking server API...", err);
    }
  }

  // 2. Provera serverskog endpointa
  try {
    const serverResp = await fetch('/api/generate-blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, keyword, tone, geoRegion, geminiModel })
    });
    if (serverResp.ok) {
      const data = await serverResp.json();
      if (data && data.titleSr) return data as GeneratedBlogPostResult;
    }
  } catch {
    // tihi prelazak na klijentski motor
  }

  // 3. Klijentski Zanatski Motor (100% ljudski stil, radi na Cloudflare Pages bez ikakvog servera!)
  return generateClientCraftedArticle(params);
}

// -------------------------------------------------------------------
// GENERISANJE CILJANIH LANDING STRANICA (Glavna funkcija)
// -------------------------------------------------------------------
export async function generateSeoAeoGeoLandingPage(params: LandingPageGeneratorParams): Promise<GeneratedLandingPageResult> {
  const { topic, keyword, targetAudience = 'general', geoRegion = 'all', productCategory, geminiApiKey, geminiModel = 'gemini-2.5-flash' } = params;

  // 1. Ako postoji uneti Gemini API ključ, pozivamo Gemini za Landing Stranicu
  if (geminiApiKey && geminiApiKey.trim().length > 10) {
    try {
      const aiResult = await generateLandingWithGemini(params);
      if (aiResult) return aiResult;
    } catch (err) {
      console.warn("Direct Gemini Landing Page failed, checking client engine...", err);
    }
  }

  // 2. Klijentski Zanatski Motor za Landing Stranice
  return generateClientCraftedLandingPage(params);
}

/**
 * Klijentski Zanatski Motor za Landing Stranice
 */
function generateClientCraftedLandingPage(params: LandingPageGeneratorParams): GeneratedLandingPageResult {
  const { topic, keyword, productCategory } = params;
  const lower = topic.toLowerCase();

  let presetKey = 'vunene-carape';
  if (lower.includes('opan') || lower.includes('folklor') || lower.includes('igra') || lower.includes('kolo')) {
    presetKey = 'opanci-za-folklor';
  } else if (lower.includes('slav') || lower.includes('poklon') || lower.includes('svadb') || lower.includes('dar')) {
    presetKey = 'slavski-pokloni';
  }

  const base = PRESET_LANDING_TEMPLATES[presetKey];
  const slug = cleanSlug(keyword || topic || base.slug);

  return {
    ...base,
    slug: slug,
    path: `/${slug}`,
    titleSr: topic.length > 5 ? topic : base.titleSr,
    targetKeywords: keyword ? [keyword, ...base.targetKeywords] : base.targetKeywords,
    productCategoryFilter: productCategory || base.productCategoryFilter
  };
}

/**
 * Klijentski Zanatski Motor za Blog Članke
 */
function generateClientCraftedArticle(params: BlogGeneratorParams): GeneratedBlogPostResult {
  const { topic, keyword } = params;
  const lowerTopic = topic.toLowerCase();

  let templateKey = 'subare';
  if (lowerTopic.includes('jelek') || lowerTopic.includes('prsluk') || lowerTopic.includes('zlatovez') || lowerTopic.includes('nosnj')) {
    templateKey = 'jelek';
  }

  const tmpl = PRESET_BLOG_TEMPLATES[templateKey];
  const geoKeywords = ["Homolje", "Pešterska visoravan", "Zlatibor", "Pirot", "Šumadija", "Srbija", "Beograd", "Dijaspora (Beč, Cirih, Minhen, Čikago)"];
  const targetKeywords = keyword && keyword.trim()
    ? [keyword.trim(), ...tmpl.keywords]
    : tmpl.keywords;

  const contentSr = `
> 📍 **Autentični sažetak i direktan odgovor (AEO):**  
> ${tmpl.sr.aeoAnswer}

---

## ${tmpl.sr.h2_1}

${tmpl.sr.body_1}

## ${tmpl.sr.h2_2}

${tmpl.sr.body_2}

## ${tmpl.sr.h2_3}

${tmpl.sr.body_3}

---

### 🏛️ Geografsko poreklo i tradicija (GEO)
Svi materijali koji stižu u našu radionicu **Savremeni Koreni** biraju se u mikro-regionima sa vekovnom tradicijom stočarstva i prerade kože i vune:
* **Pešter i Homoljske planine:** Poznati po autohtonoj ovci pramenki i runu sa prirodnim lanolinom.
* **Pirotski okrug i Stara planina:** Tradicija bojadisanja i tkanja dva lica.
* **Šumadija i Zapadna Srbija:** Majstorski krojevi čoje i ručno kovanje srme.

---

### ❓ Često Postavljana Pitanja (AEO FAQ)

${tmpl.sr.faq.map(f => `**Pitanje: ${f.q}**  
*Odgovor:* ${f.a}`).join('\n\n')}

---
*Savet majstora radionice „Savremeni Koreni“: Kada birate autentičnu etno odeću ili obuću, ne tražite savršenu mašinsku hladnoću. Tražite toplinu ljudske ruke, miris pravog materijala i šav koji traje decenijama.*
`.trim();

  const contentEn = `
> 📍 **Direct Definitive Answer (AEO):**  
> ${tmpl.en.aeoAnswer}

---

## ${tmpl.en.h2_1}

${tmpl.en.body_1}

## ${tmpl.en.h2_2}

${tmpl.en.body_2}

## ${tmpl.en.h2_3}

${tmpl.en.body_3}

---

### 🏛️ Geographic Provenance & Authenticity (GEO)
Every textile and raw material crafted at **Savremeni Koreni** is sourced directly from heritage Balkan regions:
* **Pešter Plateau & Homolje Mountains:** Celebrated for dense Pramenka lamb fleece rich in natural lanolin.
* **Stara Planina & Pirot:** Renowned for unknotted, dual-sided weaving.
* **Central Serbia (Šumadija):** Signature historic wool broadcloth tailoring.

---

### ❓ Frequently Asked Questions (AEO FAQ)

${tmpl.en.faq.map(f => `**Question: ${f.q}**  
*Answer:* ${f.a}`).join('\n\n')}
`.trim();

  const slug = cleanSlug(tmpl.sr.title);

  return {
    titleSr: tmpl.sr.title,
    titleEn: tmpl.en.title,
    slug: slug,
    excerptSr: tmpl.sr.excerpt,
    excerptEn: tmpl.en.excerpt,
    contentSr: contentSr,
    contentEn: contentEn,
    metaTitle: `${tmpl.sr.title.substring(0, 55)} | Savremeni Koreni`,
    metaDescription: tmpl.sr.excerpt.substring(0, 155),
    targetKeywords: targetKeywords,
    geoRegions: geoKeywords,
    aeoDirectAnswer: tmpl.sr.aeoAnswer,
    faqList: tmpl.sr.faq.map(f => ({ question: f.q, answer: f.a })),
    readingTime: '5 min čitanja',
    categoryLabel: 'Ručni Rad & Tradicija'
  };
}

/**
 * Gemini poziv za Blog Članke sa Anti-AI detector instrukcijama
 */
async function generateBlogWithGemini(params: BlogGeneratorParams): Promise<GeneratedBlogPostResult | null> {
  const { topic, keyword, tone, writingStyle = 'artisan', wordCount = 1000, seoEnabled = true, aeoEnabled = true, geoEnabled = true, geoRegion, geminiApiKey, geminiModel = 'gemini-2.5-flash' } = params;
  if (!geminiApiKey) return null;

  const prompt = `
Ti si stari, iskusni srpski majstor-zanatlija i osnivač etno radionice "Savremeni Koreni" (Srbija).
Tvoj zadatak je da napišeš VRHUNSKI SEO, AEO i GEO blog članak na temu: "${topic}".
Fokusna ključna reč: "${keyword || topic}".
Ciljani geografski region: "${geoRegion || 'Srbija i dijaspora'}".

STRIKTNA PRAVILA ZA PEOPLE-FIRST / HUMAN-CRAFTED STIL (NE POKUŠAVAJ DA ZAOBIĐEŠ AI DETEKTORE):
1. Ne koristi generičke uvodne i zaključne klišee. Tekst mora zvučati kao originalan urednički rad, a ne kao šablon. Ne pokušavaj da "prevariš" AI detektore; cilj je prirodan, koristan i proverljiv tekst.\n   Izbegavaj fraze poput:
   - "U današnjem modernom svetu...", "U savremenom dobu...", "Kao što svi znamo..."
   - "Zaključak je...", "Možemo zaključiti...", "U ovom članku ćemo istražiti..."
   - "Fascinantno putovanje...", "Predstavlja svedočanstvo...", "Igra ključnu ulogu..."
   - "Uronimo u...", "Bez daljeg odlaganja..."
2. Koristi izuzetno živopisan, opipljiv zanatski jezik:
   - Miris vune i kože, zatezanje potke na razboju, voskirani laneni konac, autohtona ovca pramenka, oputa, srma, Pešterska visoravan, Homolje, Pirot, Zlatibor.
3. Prirodna ritmika: Kombinuj kratke i duže rečenice, ali bez veštačkog "burstiness/perplexity" trika. Menjaj ritam samo kada to odgovara značenju. Piši jasno, toplo i konkretno.\n4. Bez izmišljanja iskustva: ne tvrdi da si lično nešto radio, video, merio ili razgovarao sa kupcem ako takva činjenica nije data u kontekstu. Koristi samo proverljive podatke iz teme, proizvoda i dostavljenih činjenica.\n5. Bez punjenja teksta: ciljaj približno ${wordCount} reči na srpskom i približno isto na engleskom, ali ne dodaj prazne pasuse samo radi dužine. Svaki pasus treba da donese novu informaciju, primer, objašnjenje ili koristan detalj.
6. AEO (Answer Engine Optimization):
   - Na samom vrhu mora postojati jasan "AEO Direct Answer" (45-55 reči) koji daje konkretnu definiciju i činjenicu pogodnu za Google AI Overviews i Perplexity citiranje.
   - Uključi 3 do 4 FAQ pitanja sa jasnim, praktičnim odgovorima (mere, nega, održavanje).
7. GEO (Generative Engine Optimization):
   - Organizuj informacije tako da ih generativni sistemi lako razumeju i citiraju: jasne tvrdnje, kratki odgovori, definicije, entiteti, odnosi između pojmova i konkretne činjenice kada su dostupne.\n   - Geografske podatke koristi samo kada su relevantni za temu; ne ubacuj lokacije nasumično radi SEO-a.

VRATI REZULTAT ISKLJUČIVO U ČISTOM JSON FORMATU (bez markdown backtick oznaka oko JSON-a) sa sledećom strukturom:
{
  "titleSr": "Naslov na srpskom jeziku (privlačan, do 65 karaktera)",
  "titleEn": "Title in English",
  "slug": "url-slug-bez-dijakritika-na-latinici",
  "excerptSr": "Uvodni sažetak na srpskom (130-150 karaktera)",
  "excerptEn": "Excerpt in English",
  "aeoDirectAnswer": "Konkretan direktan odgovor na pitanje/temu od 45-55 reči",
  "contentSr": "Kompletan tekst članka u Markdown formatu sa H2 i H3 podnaslovima, AEO odgovorom na vrhu i FAQ sekcijom. Cilj: približno ${wordCount} reči.",
  "contentEn": "Full article in English with Markdown headings and FAQ. Target approximately ${wordCount} words.",
  "metaTitle": "SEO Meta naslov | Savremeni Koreni",
  "metaDescription": "Meta opis do 155 karaktera za Google prikaz",
  "targetKeywords": ["ključna reč 1", "ključna reč 2", "ključna reč 3"],
  "faqList": [
    {"question": "Pitanje 1", "answer": "Odgovor 1"},
    {"question": "Pitanje 2", "answer": "Odgovor 2"}
  ]
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey.trim()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
  return {
    titleSr: parsed.titleSr,
    titleEn: parsed.titleEn || parsed.titleSr,
    slug: cleanSlug(parsed.slug || parsed.titleSr),
    excerptSr: parsed.excerptSr,
    excerptEn: parsed.excerptEn || parsed.excerptSr,
    contentSr: parsed.contentSr,
    contentEn: parsed.contentEn || parsed.contentSr,
    metaTitle: parsed.metaTitle || `${parsed.titleSr} | Savremeni Koreni`,
    metaDescription: parsed.metaDescription || parsed.excerptSr,
    targetKeywords: parsed.targetKeywords || [topic],
    geoRegions: ["Homolje", "Pešter", "Pirot", "Zlatibor", "Srbija", "Dijaspora"],
    aeoDirectAnswer: parsed.aeoDirectAnswer || '',
    faqList: parsed.faqList || [],
    readingTime: '5 min čitanja',
    categoryLabel: 'Ručni Rad & Tradicija'
  };
}

/**
 * Gemini poziv za CILJANE LANDING STRANICE (Kompletan Page Builder sa AEO/GEO/SEO)
 */
async function generateLandingWithGemini(params: LandingPageGeneratorParams): Promise<GeneratedLandingPageResult | null> {
  const { topic, keyword, targetAudience, writingStyle, wordCount, seoEnabled = true, aeoEnabled = true, geoEnabled = true, geoRegion, productCategory, geminiApiKey, geminiModel = 'gemini-2.5-flash' } = params;
  if (!geminiApiKey) return null;

  const prompt = `
Ti si vodeći stručnjak za SEO/AEO/GEO optimizaciju i stari majstor etno radionice "Savremeni Koreni".
Tvoj zadatak je da kreiraš KOMPLETNU, BOGATU CILJANU LANDING STRANICU (SEO Landing Page) za temu: "${topic}".
Fokusna ključna reč: "${keyword || topic}".
Ciljana publika: "${targetAudience || 'Ljubitelji tradicije, folklor i dijaspora'}".
Geografska regija: "${geoRegion || 'Srbija, Homolje, Pešter, Zlatibor, dijaspora'}".

STRIKTNI ZAHTEVI (ANTI-AI DETECTOR / 100% LJUDSKI TON):
1. Izbegavaj sve veštačke klišee. Piši autentično sa mirisom vune, kože, drveta i tradicije.
2. Formiraj čist, engleski/latinični URL slug bez dijakritika (npr. 'vunene-carape-zlatibor' ili 'opanci-za-folklor-srbija').
3. Stvori 3 upečatljiva Key Highlights (prednosti za kupce) sa naslovom i opisom na srpskom i engleskom.
4. Stvori 1 do 2 bogate Content Sections sa H2 podnaslovima, zanatskim pasusima i autentičnim citatom majstora.
5. Stvori 3 AEO FAQs (Pitanja i odgovori) koji odgovaraju na najčešće pretrage korisnika i AI modela.

VRATI REZULTAT ISKLJUČIVO U ČISTOM JSON FORMATU (bez markdown oznaka oko JSON-a) sa sledećom strukturom:
{
  "slug": "cist-url-slug-bez-dijakritika",
  "badgeSr": "100% Prirodni Materijali • Zanatska Tradicija",
  "badgeEn": "100% Natural Materials • Artisan Heritage",
  "titleSr": "Glavni H1 Naslov na Srpskom (bogat ključnim rečima)",
  "titleEn": "Main H1 Title in English",
  "subtitleSr": "Opisni podnaslov na srpskom koji odmah osvaja poverenje kupca",
  "subtitleEn": "Descriptive subtitle in English",
  "metaTitleSr": "SEO Naslov Stranice | Savremeni Koreni",
  "metaTitleEn": "SEO Page Title | Contemporary Roots",
  "metaDescriptionSr": "Meta opis do 155 karaktera za Google",
  "metaDescriptionEn": "Meta description in English up to 155 chars",
  "targetKeywords": ["ključna reč 1", "ključna reč 2", "ključna reč 3"],
  "keyHighlights": [
    {
      "titleSr": "Naziv prednosti 1",
      "titleEn": "Highlight Title 1",
      "descSr": "Opis prednosti 1",
      "descEn": "Highlight Description 1"
    },
    {
      "titleSr": "Naziv prednosti 2",
      "titleEn": "Highlight Title 2",
      "descSr": "Opis prednosti 2",
      "descEn": "Highlight Description 2"
    },
    {
      "titleSr": "Naziv prednosti 3",
      "titleEn": "Highlight Title 3",
      "descSr": "Opis prednosti 3",
      "descEn": "Highlight Description 3"
    }
  ],
  "contentSections": [
    {
      "headingSr": "H2 Podnaslov sekcije",
      "headingEn": "Section Heading in English",
      "paragraphsSr": [
        "Prvi pasus teksta sa zanatskim detaljima...",
        "Drugi pasus teksta sa poreklom i prednostima..."
      ],
      "paragraphsEn": [
        "First paragraph in English...",
        "Second paragraph in English..."
      ],
      "quoteSr": "Autentična mudrost ili savet majstora radionice",
      "quoteEn": "Authentic artisan quote in English"
    }
  ],
  "faqs": [
    {
      "questionSr": "Pitanje 1 na srpskom?",
      "questionEn": "Question 1 in English?",
      "answerSr": "Odgovor 1 na srpskom sa praktičnim podacima.",
      "answerEn": "Answer 1 in English."
    },
    {
      "questionSr": "Pitanje 2 na srpskom?",
      "questionEn": "Question 2 in English?",
      "answerSr": "Odgovor 2 na srpskom.",
      "answerEn": "Answer 2 in English."
    },
    {
      "questionSr": "Pitanje 3 na srpskom?",
      "questionEn": "Question 3 in English?",
      "answerSr": "Odgovor 3 na srpskom.",
      "answerEn": "Answer 3 in English."
    }
  ]
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey.trim()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini Landing Page API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
  const slug = cleanSlug(parsed.slug || parsed.titleSr || topic);

  return {
    slug: slug,
    path: `/${slug}`,
    badgeSr: parsed.badgeSr || 'Zanatska Tradicija',
    badgeEn: parsed.badgeEn || 'Artisan Heritage',
    titleSr: parsed.titleSr,
    titleEn: parsed.titleEn || parsed.titleSr,
    subtitleSr: parsed.subtitleSr,
    subtitleEn: parsed.subtitleEn || parsed.subtitleSr,
    metaTitleSr: parsed.metaTitleSr || `${parsed.titleSr} | Savremeni Koreni`,
    metaTitleEn: parsed.metaTitleEn || `${parsed.titleEn || parsed.titleSr} | Contemporary Roots`,
    metaDescriptionSr: parsed.metaDescriptionSr || parsed.subtitleSr,
    metaDescriptionEn: parsed.metaDescriptionEn || parsed.subtitleEn || parsed.subtitleSr,
    targetKeywords: parsed.targetKeywords || [topic],
    heroImage: '/images/savremeni_hero_banner_1789021835867.jpg',
    secondaryImage: '/images/homoljska_narodna_nosnja_1789032467664.jpg',
    productCategoryFilter: productCategory || 'nosnje',
    targetProductIds: [],
    keyHighlights: parsed.keyHighlights || [],
    contentSections: parsed.contentSections || [],
    faqs: parsed.faqs || [],
    relatedBlogSlugs: []
  };
}
