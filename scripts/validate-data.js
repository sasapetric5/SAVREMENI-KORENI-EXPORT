const fs = require('fs');
const path = require('path');

const PRODUCTS_PATH = path.join(__dirname, '../data/products.json');
const MEDIA_PATH = path.join(__dirname, '../data/media.json');

const EXPECTED_PRODUCTS = 47;
const EXPECTED_MEDIA = 504;
const EXPECTED_SLOTS = 188;

let hasErrors = false;

function log(message, type = 'INFO') {
  const prefix = type === 'ERROR' ? '❌ ERROR:' : type === 'WARN' ? '⚠️ WARN:' : '✅';
  console.log(`${prefix} ${message}`);
  if (type === 'ERROR') hasErrors = true;
}

function validate() {
  console.log('\n🚀 POČETAK VALIDACIJE PODATAKA (ADMIN 2.0)\n');

  if (!fs.existsSync(PRODUCTS_PATH)) {
    log(`Fajl nije pronađen: ${PRODUCTS_PATH}`, 'ERROR');
  }
  if (!fs.existsSync(MEDIA_PATH)) {
    log(`Fajl nije pronađen: ${MEDIA_PATH}`, 'ERROR');
  }

  if (hasErrors) {
    log('VALIDACIJA FAILED: Nedostaju izvorni fajlovi.', 'ERROR');
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
  const media = JSON.parse(fs.readFileSync(MEDIA_PATH, 'utf8'));

  if (products.length !== EXPECTED_PRODUCTS) {
    log(`Proizvodi: Očekivano ${EXPECTED_PRODUCTS}, pronađeno ${products.length}`, 'ERROR');
  } else {
    log(`Proizvodi: ${products.length}/${EXPECTED_PRODUCTS} OK`);
  }

  if (media.length !== EXPECTED_MEDIA) {
    log(`Media: Očekivano ${EXPECTED_MEDIA}, pronađeno ${media.length}`, 'WARN');
  } else {
    log(`Media: ${media.length}/${EXPECTED_MEDIA} OK`);
  }

  let totalSlots = 0;
  const mainImages = new Set();
  const duplicateSlots = [];

  products.forEach(product => {
    const slots = ['MAIN', 'G0', 'G1', 'G2'];
    slots.forEach(slot => {
      totalSlots++;
      const imagePath = product.images?.[slot];
      
      if (!imagePath) {
        log(`Proizvod "${product.name}" nema dodeljen slot ${slot}`, 'ERROR');
      } else {
        if (slot === 'MAIN') {
          if (mainImages.has(imagePath)) {
            log(`DUPLI MAIN SLOT: "${imagePath}" se koristi za više proizvoda!`, 'ERROR');
          }
          mainImages.add(imagePath);
        }
        
        if (slot === 'G1' && imagePath.includes('wool_socks_interior_exterior.jpg')) {
           duplicateSlots.push(`${product.name} -> G1: ${imagePath}`);
        }
      }
    });
  });

  if (totalSlots !== EXPECTED_SLOTS) {
    log(`Slotovi: Očekivano ${EXPECTED_SLOTS}, provereno ${totalSlots}`, 'ERROR');
  } else {
    log(`Slotovi: ${totalSlots}/${EXPECTED_SLOTS} OK`);
  }

  if (duplicateSlots.length > 0) {
    log(`Pronađeni sumnjivi duplikati u G1 slotovima:`, 'WARN');
    duplicateSlots.forEach(d => log(`  - ${d}`, 'WARN'));
  }

  console.log('\n-----------------------------------');
  if (hasErrors) {
    log('VALIDACIJA FAILED. GitHub Actions će biti prekinut. NO PUBLIC DATA WAS CHANGED.', 'ERROR');
    process.exit(1);
  } else {
    log('VALIDACIJA PASSED. Svi kritični uslovi su ispunjeni.', 'INFO');
    process.exit(0);
  }
}

validate();
