import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();

  // Ensure server listens on port 3000 (required by AI Studio ingress proxy) and process.env.PORT (for Cloud Run)
  const PORT = 3000;
  const cloudRunPort = process.env.PORT ? Number(process.env.PORT) : null;

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
            const map = new Map();
            existing.forEach((p: any) => map.set(p.id, p));
            processedPhotos.forEach((p: any) => map.set(p.id, p));
            finalPhotos = Array.from(map.values());
          }
        } catch {}
      }

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

      console.log(`✅ Permanently persisted ${finalProducts.length} products and ${finalPhotos.length} photos into repo! (${savedImageCount} physical files created)`);

      res.status(200).json({
        success: true,
        savedProductsCount: finalProducts.length,
        savedPhotosCount: finalPhotos.length,
        imagesSavedOnDisk: savedImageCount,
        message: "Uspešno sačuvano u repozitorijumu i spremno za Cloudflare Pages!"
      });
    } catch (error: any) {
      console.error("Error in persist-browser-data:", error);
      res.status(500).json({ error: error.message });
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

  if (cloudRunPort && cloudRunPort !== PORT) {
    const server2 = app.listen(cloudRunPort, "0.0.0.0", () => {
      console.log(`Server also running on Cloud Run port ${cloudRunPort}`);
    });
    server2.on('error', (err: any) => {
      console.error(`Server listener error on Cloud Run port ${cloudRunPort}:`, err);
    });
  }
}

startServer();
