import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";

async function startServer() {
  const app = express();

  // Ensure server listens on port 3000 (required by AI Studio ingress proxy)
  const PORT = 3000;

  // Liveness, readiness, and startup health checks for Cloud Run, Kubernetes, and monitoring probes
  app.get(["/api/health", "/health", "/healthz", "/livez", "/readyz"], (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Google Search Console & Webmaster verification file endpoints (e.g. google[hash].html)
  app.get("/google:hash.html", (req, res) => {
    const hash = req.params.hash;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`google-site-verification: google${hash}.html`);
  });

  // Ensure data directory exists for server-persisted custom products
  const dataDir = path.join(process.cwd(), 'data');
  const customProductsFile = path.join(dataDir, 'custom_products.json');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const loadServerCustomProducts = (): any[] => {
    try {
      if (fs.existsSync(customProductsFile)) {
        const raw = fs.readFileSync(customProductsFile, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Could not read custom products file:", e);
    }
    return [];
  };

  // Dynamic real-time sitemap.xml endpoint for Googlebot and search engines
  app.get("/sitemap.xml", (req, res) => {
    try {
      const distSitemap = path.join(process.cwd(), 'dist', 'sitemap.xml');
      const pubSitemap = path.join(process.cwd(), 'public', 'sitemap.xml');
      if (fs.existsSync(distSitemap)) {
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=3600");
        return res.sendFile(distSitemap);
      }
      if (fs.existsSync(pubSitemap)) {
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=3600");
        return res.sendFile(pubSitemap);
      }
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://savremenikoreni.com/</loc></url></urlset>');
    } catch (err) {
      console.error("Sitemap error:", err);
      res.status(500).send("Error serving sitemap");
    }
  });

  // Google Merchant Center RSS 2.0 XML Feed endpoint for Google Shopping Free Listings
  const handleMerchantFeed = (req: express.Request, res: express.Response) => {
    try {
      const distFeed = path.join(process.cwd(), 'dist', 'merchant-feed.xml');
      const pubFeed = path.join(process.cwd(), 'public', 'merchant-feed.xml');
      if (fs.existsSync(distFeed)) {
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=3600");
        return res.sendFile(distFeed);
      }
      if (fs.existsSync(pubFeed)) {
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=3600");
        return res.sendFile(pubFeed);
      }
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Savremeni Koreni</title></channel></rss>');
    } catch (err) {
      console.error("Merchant feed error:", err);
      res.status(500).send("Error serving Google Merchant feed");
    }
  };

  app.get("/products-feed.xml", handleMerchantFeed);
  app.get("/merchant-feed.xml", handleMerchantFeed);
  app.get("/google-merchant-feed.xml", handleMerchantFeed);

  // API to trigger on-demand dynamic sitemap regeneration when products/posts change
  app.post("/api/sitemap/regenerate", express.json({ limit: '10mb' }), (req, res) => {
    try {
      if (req.body && Array.isArray(req.body.customProducts)) {
        fs.writeFileSync(customProductsFile, JSON.stringify(req.body.customProducts, null, 2), 'utf8');
      }
      res.status(200).json({ success: true, message: "Custom products updated for sitemap" });
    } catch (err: any) {
      console.error("Regenerate sitemap API error:", err);
      res.status(500).json({ error: err.message || "Failed to regenerate sitemap" });
    }
  });

  // Endpoints to manage server-side custom products and automatically keep sitemap in sync
  app.get("/api/products/custom", (req, res) => {
    const products = loadServerCustomProducts();
    res.json(products);
  });

  app.post("/api/products/custom", express.json({ limit: '10mb' }), (req, res) => {
    try {
      const product = req.body;
      if (!product || !product.id) {
        return res.status(400).json({ error: "Missing product data or id" });
      }

      const current = loadServerCustomProducts();
      const existingIdx = current.findIndex((p: any) => p.id === product.id);
      if (existingIdx >= 0) {
        current[existingIdx] = product;
      } else {
        current.unshift(product);
      }

      fs.writeFileSync(customProductsFile, JSON.stringify(current, null, 2), 'utf8');
      res.status(200).json({ success: true, product });
    } catch (err: any) {
      console.error("Save custom product error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/products/custom/:id", (req, res) => {
    try {
      const id = req.params.id;
      const current = loadServerCustomProducts();
      const filtered = current.filter((p: any) => p.id !== id);
      fs.writeFileSync(customProductsFile, JSON.stringify(filtered, null, 2), 'utf8');
      res.status(200).json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Check persistence status
  app.get("/api/persistence-status", (req, res) => {
    try {
      const prodPath = path.join(process.cwd(), 'src/data/permanentProductsData.ts');
      const photoPath = path.join(process.cwd(), 'src/data/permanentGalleryPhotosData.ts');
      const uploadDirPath = path.join(process.cwd(), 'public/custom_products');
      
      let productsCount = 0;
      let productImagesCount = 0;
      let photosCount = 0;
      let physicalUploadsCount = 0;

      if (fs.existsSync(customProductsFile)) {
        try {
          const raw = JSON.parse(fs.readFileSync(customProductsFile, 'utf8'));
          if (Array.isArray(raw)) {
            productsCount = raw.length;
            raw.forEach((p: any) => {
              if (p.image) productImagesCount++;
              if (Array.isArray(p.images)) productImagesCount += p.images.length;
            });
          }
        } catch {}
      }

      const galleryJsonPath = path.join(dataDir, 'gallery_photos.json');
      if (fs.existsSync(galleryJsonPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(galleryJsonPath, 'utf8'));
          if (Array.isArray(raw)) photosCount = raw.length;
        } catch {}
      }

      if (fs.existsSync(uploadDirPath)) {
        physicalUploadsCount = fs.readdirSync(uploadDirPath).filter(f => !f.startsWith('.')).length;
      }

      const totalSiteImagesCount = productImagesCount + photosCount;

      res.json({
        hasPermanentProducts: productsCount > 0,
        productsCount,
        productImagesCount,
        photosCount,
        totalSiteImagesCount,
        physicalUploadsCount
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Permanently write browser data (products & photos) directly into project source code and public/ folder
  app.post("/api/persist-browser-data", express.json({ limit: '250mb' }), (req, res) => {
    try {
      const { products = [], photos = [] } = req.body;
      const publicUploadDir = path.join(process.cwd(), 'public/custom_products');
      const distUploadDir = path.join(process.cwd(), 'dist/custom_products');

      if (!fs.existsSync(publicUploadDir)) {
        fs.mkdirSync(publicUploadDir, { recursive: true });
      }
      if (fs.existsSync(path.join(process.cwd(), 'dist')) && !fs.existsSync(distUploadDir)) {
        fs.mkdirSync(distUploadDir, { recursive: true });
      }

      let savedImageCount = 0;

      const saveBase64Image = (dataUri: string, prefix: string): string => {
        if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) {
          return dataUri;
        }
        try {
          const match = dataUri.match(/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
          if (!match) return dataUri;
          let ext = match[1].toLowerCase();
          if (ext === 'jpeg') ext = 'jpg';
          if (ext.includes('svg')) ext = 'svg';
          if (!['webp', 'jpg', 'png', 'svg', 'gif'].includes(ext)) ext = 'webp';

          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const safePrefix = prefix.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 60);
          const fileName = `${safePrefix}.${ext}`;
          
          const targetPublic = path.join(publicUploadDir, fileName);
          fs.writeFileSync(targetPublic, buffer);

          if (fs.existsSync(distUploadDir)) {
            const targetDist = path.join(distUploadDir, fileName);
            fs.writeFileSync(targetDist, buffer);
          }

          savedImageCount++;
          return `/custom_products/${fileName}`;
        } catch (err) {
          console.error("Failed to decode and save base64 image:", err);
          return dataUri;
        }
      };

      // Process products and convert base64 images to static physical files
      const processedProducts = products.map((prod: any) => {
        const copy = { ...prod };
        if (copy.image) {
          copy.image = saveBase64Image(copy.image, `prod_${copy.id}`);
        }
        if (Array.isArray(copy.images)) {
          copy.images = copy.images.map((img: string, idx: number) => saveBase64Image(img, `prod_${copy.id}_g${idx}`));
        }
        return copy;
      });

      // Process gallery photos and convert base64 images to static physical files
      const processedPhotos = photos.map((photo: any) => {
        const copy = { ...photo };
        if (copy.imageUrl) {
          copy.imageUrl = saveBase64Image(copy.imageUrl, `photo_${copy.id}`);
        }
        return copy;
      });

      // Merge with existing data so we never overwrite or lose previously persisted assets
      let finalProducts = [...processedProducts];
      if (fs.existsSync(customProductsFile)) {
        try {
          const existing = JSON.parse(fs.readFileSync(customProductsFile, 'utf8'));
          if (Array.isArray(existing)) {
            const map = new Map();
            existing.forEach((p: any) => map.set(p.id, p));
            processedProducts.forEach((p: any) => map.set(p.id, p));
            finalProducts = Array.from(map.values());
          }
        } catch {}
      }

      let finalPhotos = [...processedPhotos];
      const galleryJsonFile = path.join(dataDir, 'gallery_photos.json');
      if (fs.existsSync(galleryJsonFile)) {
        try {
          const existing = JSON.parse(fs.readFileSync(galleryJsonFile, 'utf8'));
          if (Array.isArray(existing)) {
            const mapByHash = new Map();
            const getHash = (item: any) => {
              if (!item || !item.imageUrl) return item?.id || Math.random().toString();
              const m = item.imageUrl.match(/1789\d+-[a-z0-9]+/);
              return m ? m[0] : item.imageUrl;
            };

            // If photos array was explicitly passed from browser IndexedDB, use client state as source of truth for active items
            if (photos && Array.isArray(photos) && photos.length > 0) {
              processedPhotos.forEach((p: any) => mapByHash.set(getHash(p), p));
            } else {
              existing.forEach((p: any) => mapByHash.set(getHash(p), p));
              processedPhotos.forEach((p: any) => mapByHash.set(getHash(p), p));
            }
            finalPhotos = Array.from(mapByHash.values());
          }
        } catch {}
      }

      // Filter out product images from standalone gallery_photos.json to avoid double counting
      finalPhotos = finalPhotos.filter((p: any) => p && p.imageUrl && !p.imageUrl.includes('/custom_products/prod_custom-'));

      // 1. Write JSON files in data/
      fs.writeFileSync(customProductsFile, JSON.stringify(finalProducts, null, 2), 'utf8');
      fs.writeFileSync(galleryJsonFile, JSON.stringify(finalPhotos, null, 2), 'utf8');

      // 2. Write permanent TypeScript data files so Vite & Cloudflare Pages bundle them statically
      const permanentProductsTs = path.join(process.cwd(), 'src/data/permanentProductsData.ts');
      const permanentPhotosTs = path.join(process.cwd(), 'src/data/permanentGalleryPhotosData.ts');

      const tsProductsContent = `import { Product } from '../types';\n\n/**\n * Permanent products list synchronized from user database.\n * Bundled directly for static deployment (Cloudflare Pages & GitHub).\n */\nexport const permanentProductsData: Product[] = ${JSON.stringify(finalProducts, null, 2)};\n`;
      fs.writeFileSync(permanentProductsTs, tsProductsContent, 'utf8');

      const tsPhotosContent = `import { GalleryPhoto } from '../types';\n\n/**\n * Permanent gallery photos list synchronized from user database.\n * Bundled directly for static deployment (Cloudflare Pages & GitHub).\n */\nexport const permanentGalleryPhotosData: GalleryPhoto[] = ${JSON.stringify(finalPhotos, null, 2)};\n`;
      fs.writeFileSync(permanentPhotosTs, tsPhotosContent, 'utf8');

      // 3. Automated Orphan File Cleanup in public/custom_products/
      let deletedOrphansCount = 0;
      try {
        const activeFiles = new Set<string>();
        finalProducts.forEach((p: any) => {
          if (p.image && p.image.startsWith('/custom_products/')) {
            activeFiles.add(p.image.replace('/custom_products/', ''));
          }
          if (Array.isArray(p.images)) {
            p.images.forEach((img: string) => {
              if (img && img.startsWith('/custom_products/')) {
                activeFiles.add(img.replace('/custom_products/', ''));
              }
            });
          }
        });

        finalPhotos.forEach((p: any) => {
          if (p.imageUrl && p.imageUrl.startsWith('/custom_products/')) {
            activeFiles.add(p.imageUrl.replace('/custom_products/', ''));
          }
        });

        const diskFiles = fs.readdirSync(uploadDir);
        diskFiles.forEach((f: string) => {
          if (!activeFiles.has(f)) {
            try {
              fs.unlinkSync(path.join(uploadDir, f));
              deletedOrphansCount++;
            } catch {}
          }
        });
      } catch (err) {
        console.warn("Orphan cleanup warning:", err);
      }

      console.log(`✅ Permanently persisted ${finalProducts.length} products and ${finalPhotos.length} photos into repo! (${savedImageCount} physical files created, ${deletedOrphansCount} orphans deleted)`);

      res.status(200).json({
        success: true,
        savedProductsCount: finalProducts.length,
        savedPhotosCount: finalPhotos.length,
        imagesSavedOnDisk: savedImageCount,
        deletedOrphansCount,
        message: "Uspešno sačuvano u repozitorijumu i spremno za Cloudflare Pages!"
      });
    } catch (error: any) {
      console.error("Error in persist-browser-data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // SEO + AEO + GEO Blog Generator endpoint using Google Gemini (with Anti-AI detector rules)
  app.post("/api/generate-blog", express.json(), async (req, res) => {
    try {
      const { topic, keyword, tone, geoRegion } = req.body || {};
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ error: "Missing required field: topic" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "GEMINI_API_KEY is not configured on the server" });
      }

      const prompt = `
Ti si stari, iskusni srpski majstor-zanatlija i osnivač etno radionice "Savremeni Koreni" (Srbija).
Tvoj zadatak je da napišeš VRHUNSKI SEO, AEO i GEO blog članak na temu: "${topic}".
Fokusna ključna reč: "${keyword || topic}".
Ciljani geografski region: "${geoRegion || 'Srbija i dijaspora'}".

STRIKTNA PRAVILA ZA STIL PISANJA (ANTI-AI DETECTOR / STOPROCENTNO LJUDSKI TON):
1. Nikada, ni pod kojim uslovima nemoj koristiti generičke AI kliše fraze poput:
   - "U današnjem modernom svetu...", "U savremenom dobu...", "Kao što svi znamo..."
   - "Zaključak je...", "Možemo zaključiti...", "U ovom članku ćemo istražiti..."
   - "Fascinantno putovanje...", "Predstavlja svedočanstvo...", "Igra ključnu ulogu..."
   - "Uronimo u...", "Bez daljeg odlaganja..."
2. Koristi izuzetno živopisan, opipljiv zanatski jezik:
   - Miris vune i kože, zatezanje potke na razboju, voskirani laneni konac, autohtona ovca pramenka, oputa, srma, Pešterska visoravan, Homolje, Pirot, Zlatibor.
3. Burstiness i perplexity: Kombinuj kratke, autoritativne rečenice sa dužim, opisnim mislima. Piši prirodno, kao čovek koji decenijama lično šije, kroji i razgovara sa kupcima u radionici.
4. AEO (Answer Engine Optimization):
   - Na samom vrhu mora postojati jasan "AEO Direct Answer" (45-55 reči) koji daje konkretnu definiciju i činjenicu pogodnu za Google AI Overviews i Perplexity citiranje.
   - Uključi 3 do 4 FAQ pitanja sa jasnim, praktičnim odgovorima (mere, nega, održavanje).
5. GEO (Geografska optimizacija):
   - Citiraj mikro-lokacije (Pešter, Homolje, Pirot, Zlatibor, Šumadija, dijaspora: Beč, Minhen, Čikago, Cirih).

VRATI REZULTAT ISKLJUČIVO U ČISTOM JSON FORMATU (bez markdown backtick oznaka oko JSON-a) sa sledećom strukturom:
{
  "titleSr": "Naslov na srpskom jeziku (privlačan, do 65 karaktera)",
  "titleEn": "Title in English",
  "slug": "url-slug-bez-dijakritika-na-latinici",
  "excerptSr": "Uvodni sažetak na srpskom (130-150 karaktera)",
  "excerptEn": "Excerpt in English",
  "aeoDirectAnswer": "Konkretan direktan odgovor na pitanje/temu od 45-55 reči",
  "contentSr": "Kompletan tekst članka u Markdown formatu sa H2 i H3 podnaslovima, AEO odgovorom na vrhu i FAQ sekcijom",
  "contentEn": "Full article in English with Markdown headings and FAQ",
  "metaTitle": "SEO Meta naslov | Savremeni Koreni",
  "metaDescription": "Meta opis do 155 karaktera za Google prikaz",
  "targetKeywords": ["ključna reč 1", "ključna reč 2", "ključna reč 3"],
  "faqList": [
    {"question": "Pitanje 1", "answer": "Odgovor 1"},
    {"question": "Pitanje 2", "answer": "Odgovor 2"}
  ]
}
`;

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
      const geminiResp = await fetch(apiUrl, {
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

      if (!geminiResp.ok) {
        throw new Error(`Gemini API returned status ${geminiResp.status}`);
      }

      const geminiData: any = await geminiResp.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());

      const cleanSlug = (text: string) => text
        .toLowerCase()
        .replace(/[šđčćž]/g, (c: string) => ({ 'š': 's', 'đ': 'dj', 'č': 'c', 'ć': 'c', 'ž': 'z' }[c] || c))
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      res.status(200).json({
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
      });
    } catch (err: any) {
      console.error("Gemini server error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // SEO + AEO + GEO Landing Page Generator endpoint using Google Gemini (with Anti-AI detector rules)
  app.post("/api/generate-landing", express.json(), async (req, res) => {
    try {
      const { topic, keyword, targetAudience, geoRegion, productCategory, model } = req.body || {};
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ error: "Missing required field: topic" });
      }

      const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const selectedModel = model === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

      const prompt = `
Ti si vodeći stručnjak za SEO, AEO (Answer Engine Optimization) i GEO lokalnu optimizaciju za autentičnu srpsku etno radionicu "Savremeni Koreni" (Srbija).
Tvoj zadatak je da kreiraš KOMPLETNU CILJANU STRANICU (SEO Landing Page) na temu: "${topic}".
Fokusna ključna reč: "${keyword || topic}".
Ciljana publika: "${targetAudience || 'Kupci i dijaspora'}".
Geografski region: "${geoRegion || 'Srbija i dijaspora'}".
Kategorija proizvoda: "${productCategory || 'nosnje'}".

STRIKTNA PRAVILA ZA ANTI-AI DETEKTOR & VRHUNSKI LJUDSKI TON:
1. Nikada ne koristi generičke AI formulacije ("U svetu punom izazova...", "Igra presudnu ulogu...", "Zaključno...").
2. Govori iz pozicije istinskog majstora sa terena: miris prirodne vune, vosak, oputa, srma, ručni razboj, tradicija Homolja, Peštera, Pirota i Zlatibora.
3. Burstiness: miks kratkih energičnih rečenica i bogatih zanatskih opisa.
4. AEO & FAQ optimizacija za Google AI pregled i pretragu glasom.

VRATI REZULTAT ISKLJUČIVO U VAŽEĆEM JSON FORMATU (bez dodatnog teksta ili markdown omotača):
{
  "slug": "url-slug-bez-dijakritika",
  "titleSr": "Glavni H1 naslov na srpskom jeziku",
  "titleEn": "Main H1 title in English",
  "subtitleSr": "Bogat podnaslov na srpskom koji odmah odgovara na nameru posetioca (AEO uvod)",
  "subtitleEn": "Rich subtitle in English addressing visitor intent",
  "badgeSr": "Kratka značka na srpskom (npr. Zlatovez po meri)",
  "badgeEn": "Badge in English",
  "metaTitleSr": "SEO Meta Title za Google do 60 karaktera",
  "metaTitleEn": "SEO Meta Title in English",
  "metaDescriptionSr": "Meta opis do 155 karaktera",
  "metaDescriptionEn": "Meta description in English up to 155 chars",
  "targetKeywords": ["ključna reč 1", "ključna reč 2", "ključna reč 3"],
  "productCategoryFilter": "${productCategory || 'nosnje'}",
  "keyHighlights": [
    { "titleSr": "Prednost 1", "descSr": "Opis prednosti 1", "titleEn": "Highlight 1", "descEn": "Description 1" },
    { "titleSr": "Prednost 2", "descSr": "Opis prednosti 2", "titleEn": "Highlight 2", "descEn": "Description 2" },
    { "titleSr": "Prednost 3", "descSr": "Opis prednosti 3", "titleEn": "Highlight 3", "descEn": "Description 3" }
  ],
  "contentSections": [
    {
      "headingSr": "H2 Podnaslov 1",
      "headingEn": "H2 Subheading 1",
      "paragraphsSr": ["Prvi pasus na srpskom...", "Drugi pasus na srpskom..."],
      "paragraphsEn": ["First paragraph in English...", "Second paragraph in English..."],
      "quoteSr": "Autentični citat starog majstora iz radionice",
      "quoteEn": "Authentic quote from our master artisan"
    }
  ],
  "faqs": [
    {
      "questionSr": "Često pitanje 1 na srpskom?",
      "answerSr": "Direktan i koristan odgovor 1 sa merama ili savetima.",
      "questionEn": "FAQ question 1 in English?",
      "answerEn": "Helpful answer 1 in English."
    },
    {
      "questionSr": "Često pitanje 2 na srpskom?",
      "answerSr": "Direktan i koristan odgovor 2.",
      "questionEn": "FAQ question 2 in English?",
      "answerEn": "Helpful answer 2 in English."
    }
  ]
}
`;

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey.trim()}`;
      const geminiResp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.82,
            topP: 0.95,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!geminiResp.ok) {
        const errText = await geminiResp.text();
        console.error("Gemini API error for landing:", geminiResp.status, errText);
        return res.status(geminiResp.status).json({ error: `Gemini API error: ${errText}` });
      }

      const geminiData = await geminiResp.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      res.json({
        ...parsed,
        path: `/${parsed.slug}`,
        heroImage: '/images/savremeni_hero_banner_1789021835867.jpg',
        secondaryImage: '/images/homoljska_narodna_nosnja_1789032467664.jpg',
        targetProductIds: [],
        relatedBlogSlugs: []
      });
    } catch (err: any) {
      console.error("Gemini landing server error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Direct GitHub API integration endpoints for automated repository sync & deployment
  app.post("/api/github/test", express.json(), async (req, res) => {
    try {
      const { token, repo: inputRepo } = req.body || {};
      if (!token || typeof token !== 'string' || !token.trim()) {
        return res.status(400).json({ error: "Unesite GitHub Personal Access Token (PAT)" });
      }

      const cleanToken = token.trim();
      const userResp = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "User-Agent": "SavremeniKoreniApp",
          "Accept": "application/vnd.github.v3+json"
        }
      });

      if (!userResp.ok) {
        const errTxt = await userResp.text();
        return res.status(401).json({ error: `Nevažeći GitHub Token (HTTP ${userResp.status}): Proverite vaš PAT ključ.` });
      }

      const userData = await userResp.json();
      const username = userData.login;

      let targetRepo = (inputRepo || "SAVREMENI-KORENI-EXPORT").trim();
      if (!targetRepo.includes("/")) {
        targetRepo = `${username}/${targetRepo}`;
      }

      const repoResp = await fetch(`https://api.github.com/repos/${targetRepo}`, {
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "User-Agent": "SavremeniKoreniApp",
          "Accept": "application/vnd.github.v3+json"
        }
      });

      if (!repoResp.ok) {
        return res.status(404).json({ 
          error: `Repozitorijum '${targetRepo}' nije pronađen ili nemate pristup. Proverite tačan naziv repozitorijuma na GitHub-u.` 
        });
      }

      const repoData = await repoResp.json();
      const defaultBranch = repoData.default_branch || "main";
      const canPush = Boolean(repoData.permissions?.push || repoData.permissions?.admin);

      res.json({
        success: true,
        username,
        fullRepo: repoData.full_name,
        defaultBranch,
        permissions: repoData.permissions,
        canPush,
        message: `Uspešno povezano sa repozitorijumom ${repoData.full_name} na grani '${defaultBranch}'!`
      });
    } catch (err: any) {
      console.error("GitHub test error:", err);
      res.status(500).json({ error: err.message || "Greška pri povezivanju sa GitHub-om" });
    }
  });

  app.post("/api/github/push", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { token, repo: inputRepo, branch: inputBranch, commitMessage } = req.body || {};
      if (!token || typeof token !== 'string' || !token.trim()) {
        return res.status(400).json({ error: "Unesite GitHub Personal Access Token (PAT)" });
      }

      const cleanToken = token.trim();
      const userResp = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "User-Agent": "SavremeniKoreniApp",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (!userResp.ok) {
        return res.status(401).json({ error: "Nevažeći GitHub Token." });
      }
      const userData = await userResp.json();
      const username = userData.login;

      let targetRepo = (inputRepo || "SAVREMENI-KORENI-EXPORT").trim();
      if (!targetRepo.includes("/")) {
        targetRepo = `${username}/${targetRepo}`;
      }

      const repoResp = await fetch(`https://api.github.com/repos/${targetRepo}`, {
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "User-Agent": "SavremeniKoreniApp",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (!repoResp.ok) {
        return res.status(404).json({ error: `Repozitorijum '${targetRepo}' nije pronađen.` });
      }
      const repoData = await repoResp.json();
      const targetBranch = inputBranch || repoData.default_branch || "main";

      const refResp = await fetch(`https://api.github.com/repos/${targetRepo}/git/refs/heads/${targetBranch}`, {
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "User-Agent": "SavremeniKoreniApp",
          "Accept": "application/vnd.github.v3+json"
        }
      });

      if (!refResp.ok) {
        return res.status(404).json({ error: `Grana '${targetBranch}' nije pronađena na repozitorijumu '${targetRepo}'.` });
      }

      const refData = await refResp.json();
      const latestCommitSha = refData.object.sha;

      const commitResp = await fetch(`https://api.github.com/repos/${targetRepo}/git/commits/${latestCommitSha}`, {
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "User-Agent": "SavremeniKoreniApp",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      const commitData = await commitResp.json();
      const baseTreeSha = commitData.tree.sha;

      // 1. Fetch remote tree recursively to get existing SHAs
      const existingGitShas = new Map<string, string>();
      try {
        const treeResp = await fetch(`https://api.github.com/repos/${targetRepo}/git/trees/${baseTreeSha}?recursive=1`, {
          headers: {
            "Authorization": `Bearer ${cleanToken}`,
            "User-Agent": "SavremeniKoreniApp",
            "Accept": "application/vnd.github.v3+json"
          }
        });
        if (treeResp.ok) {
          const remoteTreeData = await treeResp.json();
          if (Array.isArray(remoteTreeData.tree)) {
            remoteTreeData.tree.forEach((item: any) => {
              if (item.type === 'blob') {
                existingGitShas.set(item.path, item.sha);
              }
            });
          }
        }
      } catch (err) {
        console.warn("[GitHub Push] Could not fetch recursive tree for SHA comparison:", err);
      }

      // 2. Scan workspace files
      const filesToSync: { path: string; fullDiskPath: string }[] = [];
      const ignoreDirs = new Set(['node_modules', 'dist', '.git', '.tmp']);
      const ignoreFiles = new Set(['package-lock.json', 'bun.lock', '.DS_Store']);

      const scanDirectory = (dir: string, relPrefix: string = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
          if (entry.isDirectory()) {
            if (!ignoreDirs.has(entry.name)) {
              scanDirectory(path.join(dir, entry.name), relPrefix ? `${relPrefix}/${entry.name}` : entry.name);
            }
          } else if (entry.isFile()) {
            if (!ignoreFiles.has(entry.name)) {
              const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
              filesToSync.push({ path: relPath, fullDiskPath: path.join(dir, entry.name) });
            }
          }
        }
      };

      scanDirectory(process.cwd());

      if (filesToSync.length === 0) {
        return res.status(400).json({ error: "Nema pronađenih fajlova za sinhronizaciju sa GitHub-om." });
      }

      console.log(`[GitHub Push] Scanning ${filesToSync.length} total project files against ${existingGitShas.size} GitHub remote SHAs...`);

      const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
      const filesNeedingBlob: { file: { path: string; fullDiskPath: string }; localSha: string }[] = [];

      for (const file of filesToSync) {
        try {
          const fileBuffer = fs.readFileSync(file.fullDiskPath);
          const header = Buffer.from(`blob ${fileBuffer.length}\0`);
          const localSha = crypto.createHash('sha1').update(Buffer.concat([header, fileBuffer])).digest('hex');

          if (existingGitShas.has(file.path) && existingGitShas.get(file.path) === localSha) {
            treeItems.push({
              path: file.path,
              mode: '100644',
              type: 'blob',
              sha: localSha
            });
          } else {
            filesNeedingBlob.push({ file, localSha });
          }
        } catch (fileErr) {
          console.warn(`[GitHub Push] Preskačem fajl ${file.path}:`, fileErr);
        }
      }

      console.log(`[GitHub Push] ${treeItems.length} files already match GitHub tree. Creating blobs for ${filesNeedingBlob.length} new or modified files...`);

      const BATCH_SIZE = 15;
      for (let i = 0; i < filesNeedingBlob.length; i += BATCH_SIZE) {
        const batch = filesNeedingBlob.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async ({ file }) => {
          const isBinary = /\.(jpg|jpeg|png|webp|gif|zip|ico|ttf|woff|woff2|eot)$/i.test(file.path);
          const fileBuffer = fs.readFileSync(file.fullDiskPath);
          const fileContent = isBinary ? fileBuffer.toString('base64') : fileBuffer.toString('utf8');

          const blobResp = await fetch(`https://api.github.com/repos/${targetRepo}/git/blobs`, {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${cleanToken}`,
              "User-Agent": "SavremeniKoreniApp",
              "Content-Type": "application/json",
              "Accept": "application/vnd.github.v3+json"
            },
            body: JSON.stringify({
              content: fileContent,
              encoding: isBinary ? 'base64' : 'utf-8'
            })
          });

          if (!blobResp.ok) {
            const errBody = await blobResp.text();
            if (blobResp.status === 403 || errBody.includes("Resource not accessible")) {
              throw new Error(`GitHub Token nema dozvolu za pisanje u repozitorijum. Uredite PAT token na GitHub-u i omogućite 'Contents: Read and write' (ili 'repo' scope za Classic PAT).`);
            }
            throw new Error(`Neuspelo kreiranje GitHub blob-a za ${file.path}: ${errBody}`);
          }

          const blobData = await blobResp.json();
          treeItems.push({
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha
          });
        }));
      }

      console.log(`[GitHub Push] Creating Git Tree with ${treeItems.length} total items...`);

      const createTreeResp = await fetch(`https://api.github.com/repos/${targetRepo}/git/trees`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "User-Agent": "SavremeniKoreniApp",
          "Content-Type": "application/json",
          "Accept": "application/vnd.github.v3+json"
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems
        })
      });

      if (!createTreeResp.ok) {
        const errTxt = await createTreeResp.text();
        return res.status(500).json({ error: `Neuspelo kreiranje Git Tree-a: ${errTxt}` });
      }

      const newTreeData = await createTreeResp.json();
      const newTreeSha = newTreeData.sha;

      const msg = commitMessage || `Automatska sinhronizacija iz Savremeni Koreni Admin Panela (${new Date().toLocaleDateString('sr-RS')} ${new Date().toLocaleTimeString('sr-RS')})`;
      const createCommitResp = await fetch(`https://api.github.com/repos/${targetRepo}/git/commits`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "User-Agent": "SavremeniKoreniApp",
          "Content-Type": "application/json",
          "Accept": "application/vnd.github.v3+json"
        },
        body: JSON.stringify({
          message: msg,
          tree: newTreeSha,
          parents: [latestCommitSha],
          author: {
            name: username,
            email: `${username}@users.noreply.github.com`,
            date: new Date().toISOString()
          }
        })
      });

      if (!createCommitResp.ok) {
        const errTxt = await createCommitResp.text();
        return res.status(500).json({ error: `Neuspelo kreiranje Git Commit-a: ${errTxt}` });
      }

      const newCommitData = await createCommitResp.json();
      const newCommitSha = newCommitData.sha;
      const commitUrl = newCommitData.html_url;

      const updateRefResp = await fetch(`https://api.github.com/repos/${targetRepo}/git/refs/heads/${targetBranch}`, {
        method: 'PATCH',
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "User-Agent": "SavremeniKoreniApp",
          "Content-Type": "application/json",
          "Accept": "application/vnd.github.v3+json"
        },
        body: JSON.stringify({
          sha: newCommitSha,
          force: false
        })
      });

      if (!updateRefResp.ok) {
        const errTxt = await updateRefResp.text();
        return res.status(500).json({ error: `Neuspelo ažuriranje grane '${targetBranch}': ${errTxt}` });
      }

      console.log(`[GitHub Push] Successfully pushed commit ${newCommitSha} to ${targetRepo} (${targetBranch}) with ${filesToSync.length} files.`);

      res.json({
        success: true,
        commitSha: newCommitSha,
        commitUrl,
        filesCount: filesToSync.length,
        newBlobsCount: filesNeedingBlob.length,
        targetRepo,
        targetBranch,
        message: `Uspešno sinhronizovan ceo projekat sa GitHub repozitorijumom ${targetRepo}! (${filesNeedingBlob.length} novih/izmenjenih fajlova)`
      });
    } catch (err: any) {
      console.error("GitHub push error:", err);
      res.status(500).json({ error: err.message || "Greška pri slanju na GitHub" });
    }
  });

  // Ensure upload directory exists in public/custom_products or dist/custom_products
  const publicUploadDir = path.join(process.cwd(), 'public/custom_products');
  const distUploadDir = path.join(process.cwd(), 'dist/custom_products');
  const uploadDir = fs.existsSync(publicUploadDir) ? publicUploadDir : distUploadDir;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Fallback workshop craft images in case a custom image is missing
  const fallbackImages = [
    path.join(process.cwd(), 'public/images/etno_unikatna_torba_1789105500674.jpg'),
    path.join(process.cwd(), 'public/images/srpska_subara_moderna_1789021862584.jpg'),
    path.join(process.cwd(), 'public/images/vunene_carape_vez_1789021876638.jpg'),
    path.join(process.cwd(), 'public/images/vezena_kosulja_1789021895745.jpg'),
    path.join(process.cwd(), 'public/images/heklani_nakit_1789021909183.jpg'),
    path.join(process.cwd(), 'public/images/makrame_predja_repromaterijal_1789032495554.jpg'),
    path.join(process.cwd(), 'public/images/vlaska_bela_subara_1789032431671.jpg'),
    path.join(process.cwd(), 'public/images/vezene_carape_folklor_1789032450227.jpg')
  ];

  // Statically serve custom products from both possible locations with caching
  const staticImageOptions = {
    maxAge: '7d',
    immutable: true,
    setHeaders: (res: express.Response) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  };
  app.use('/custom_products', express.static(publicUploadDir, staticImageOptions));
  if (fs.existsSync(distUploadDir) && distUploadDir !== publicUploadDir) {
    app.use('/custom_products', express.static(distUploadDir, staticImageOptions));
  }

  // Return 404 for missing custom product images so browser does not fall back to HTML or repeat images
  app.get('/custom_products/:filename', (req, res) => {
    res.status(404).send('Image not found');
  });

  // Raw body parser for file uploads
  app.post("/api/upload", express.raw({ type: '*/*', limit: '50mb' }), (req, res) => {
    try {
      const fileNameHeader = req.headers['x-file-name'] as string;
      if (!fileNameHeader) {
        return res.status(400).json({ error: 'Missing x-file-name header' });
      }

      const fileName = decodeURIComponent(fileNameHeader);
      const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_'); // Sanitize filename
      
      const filePath = path.join(uploadDir, `${Date.now()}_${safeFileName}`);
      
      fs.writeFileSync(filePath, req.body);
      
      res.status(200).json({ success: true, path: `/custom_products/${path.basename(filePath)}` });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload' });
    }
  });


  // Get list of uploaded custom photos
  app.get("/api/custom-photos", (req, res) => {
    try {
      if (!fs.existsSync(uploadDir)) {
        return res.json([]);
      }
      const files = fs.readdirSync(uploadDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
      res.json(files.map((file, idx) => ({
        id: `upl-${idx + 1}`,
        fileName: file,
        url: `/custom_products/${file}`
      })));
    } catch (err) {
      console.error("List photos error:", err);
      res.status(500).json({ error: "Failed to list photos" });
    }
  });



  // API endpoint for safe project zip download with streaming and error handling
  app.get("/api/download-project", (req, res) => {
    const zipPath = path.join(process.cwd(), "public", "savremeni-koreni-full-project.zip");
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: "Zip file not found" });
    }
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="savremeni-koreni-full-project.zip"');
    const stat = fs.statSync(zipPath);
    res.setHeader("Content-Length", stat.size);
    const stream = fs.createReadStream(zipPath);
    stream.on("error", (err) => {
      console.error("Download stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Streaming error" });
      }
    });
    stream.pipe(res);
  });

  // Serve static assets from public folder directly (including zip archives)
  const publicPath = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  // Determine if running in production or development
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction = process.env.NODE_ENV === "production" || Boolean(process.argv[1]?.includes("server.cjs")) || (hasDist && process.env.NODE_ENV !== "development");

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    const publicPath = path.join(process.cwd(), 'public');
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
    }
    app.get('*all', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("<!DOCTYPE html><html><head><title>Savremeni Koreni</title></head><body>Loading Savremeni Koreni...</body></html>");
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });

  server.on('error', (err: any) => {
    console.error(`Server listener error on port ${PORT}:`, err);
  });
}

startServer();
