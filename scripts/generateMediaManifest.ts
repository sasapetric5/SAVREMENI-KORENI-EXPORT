import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const roots = ['public/custom_products', 'public/images'];

const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']);

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (imageExt.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

const files = roots
  .flatMap(root => walk(path.join(projectRoot, root)))
  .map(file => '/' + path.relative(path.join(projectRoot, 'public'), file).split(path.sep).join('/'))
  .sort((a, b) => a.localeCompare(b, 'sr-Latn'));

const assets = files.map((imageUrl, index) => {
  const fileName = imageUrl.split('/').pop() || imageUrl;
  const base = fileName.replace(/\.[^.]+$/, '');
  return {
    id: 'repo:' + imageUrl,
    imageUrl,
    fileName,
    title: base,
    source: 'REPOSITORY'
  };
});

const output = `// AUTO-GENERATED at build time from deployed public image files.\n// Do not edit manually.\nexport type RepositoryMediaAsset = { id: string; imageUrl: string; fileName: string; title: string; source: 'REPOSITORY' };\nexport const repositoryMediaAssets: RepositoryMediaAsset[] = ${JSON.stringify(assets, null, 2)};\n`;

const target = path.join(projectRoot, 'src/data/repositoryMediaAssets.generated.ts');
fs.writeFileSync(target, output, 'utf8');
console.log(`Media manifest generated: ${assets.length} image files -> ${path.relative(projectRoot, target)}`);
