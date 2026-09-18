import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, terminate } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import config from '../firebase-applet-config.json' with { type: 'json' };

async function extractFromFirestore() {
  console.log('Connecting to Firestore to extract persisted user assets...');
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'custom_products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 1. Extract Gallery Photos
    console.log('Querying collection "gallery_photos"...');
    const photosSnap = await getDocs(collection(db, 'gallery_photos'));
    console.log(`Found ${photosSnap.size} photos in Firestore.`);

    const processedPhotos: any[] = [];
    let savedImages = 0;

    for (const doc of photosSnap.docs) {
      const p = { id: doc.id, ...doc.data() } as any;

      if (p.imageUrl && p.imageUrl.startsWith('data:image/')) {
        try {
          const match = p.imageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (match) {
            let ext = match[1].toLowerCase();
            if (ext === 'jpeg') ext = 'jpg';
            const base64Data = match[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `gallery_${p.id.replace(/[^a-zA-Z0-9_-]/g, '')}.${ext}`;
            const filePath = path.join(uploadDir, fileName);

            fs.writeFileSync(filePath, buffer);
            p.imageUrl = `/custom_products/${fileName}`;
            savedImages++;
          }
        } catch (imgErr) {
          console.warn(`Failed to decode base64 for photo ${p.id}:`, imgErr);
        }
      }

      processedPhotos.push(p);
    }

    // Save JSON & permanent TS file
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dataDir, 'gallery_photos.json'), JSON.stringify(processedPhotos, null, 2), 'utf-8');

    const tsPhotosContent = `import { GalleryPhoto } from '../types';\n\n/**\n * Permanent gallery photos list synchronized from Firestore database.\n * Bundled directly for static deployment (Cloudflare Pages & GitHub).\n */\nexport const permanentGalleryPhotosData: GalleryPhoto[] = ${JSON.stringify(processedPhotos, null, 2)};\n`;
    fs.writeFileSync(path.join(process.cwd(), 'src', 'data', 'permanentGalleryPhotosData.ts'), tsPhotosContent, 'utf-8');

    console.log(`Successfully extracted ${processedPhotos.length} photos and saved ${savedImages} physical files to public/custom_products/!`);

    // 2. Also check custom_products collection
    const productsSnap = await getDocs(collection(db, 'custom_products'));
    console.log(`Found ${productsSnap.size} custom products in Firestore.`);
    if (productsSnap.size > 0) {
      const processedProducts: any[] = [];
      for (const doc of productsSnap.docs) {
        const prod = { id: doc.id, ...doc.data() } as any;
        if (prod.image && prod.image.startsWith('data:image/')) {
          try {
            const match = prod.image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
            if (match) {
              let ext = match[1].toLowerCase();
              if (ext === 'jpeg') ext = 'jpg';
              const base64Data = match[2];
              const buffer = Buffer.from(base64Data, 'base64');
              const fileName = `prod_${prod.id.replace(/[^a-zA-Z0-9_-]/g, '')}.${ext}`;
              const filePath = path.join(uploadDir, fileName);

              fs.writeFileSync(filePath, buffer);
              prod.image = `/custom_products/${fileName}`;
            }
          } catch (e) {
            console.warn(`Failed to decode product image for ${prod.id}:`, e);
          }
        }
        processedProducts.push(prod);
      }

      fs.writeFileSync(path.join(dataDir, 'custom_products.json'), JSON.stringify(processedProducts, null, 2), 'utf-8');
      const tsProductsContent = `import { Product } from '../types';\n\n/**\n * Permanent products list synchronized from Firestore database.\n * Bundled directly for static deployment (Cloudflare Pages & GitHub).\n */\nexport const permanentProductsData: Product[] = ${JSON.stringify(processedProducts, null, 2)};\n`;
      fs.writeFileSync(path.join(process.cwd(), 'src', 'data', 'permanentProductsData.ts'), tsProductsContent, 'utf-8');
      console.log(`Successfully extracted ${processedProducts.length} products to permanent files!`);
    }

  } catch (error) {
    console.error('Extraction error:', error);
  } finally {
    try {
      await terminate(db);
    } catch {}
    process.exit(0);
  }
}

extractFromFirestore();
