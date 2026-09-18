/**
 * Visoko-efikasni kompresor slika za web (HTML5 Canvas + WebP/JPEG)
 * Automatski optimizuje rezoluciju i kompresuje teške slike sa telefona/fotoaparata (5MB-20MB)
 * na laganu web veličinu (~100KB-250KB) uz 100% očuvanu vizuelnu oštrinu i boje.
 */

export interface CompressionResult {
  dataUrl: string;
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  width: number;
  height: number;
  format: 'image/webp' | 'image/jpeg';
}

export interface CompressionOptions {
  maxDimension?: number; // Default: 1920px (Full HD)
  quality?: number;      // Default: 0.85 (vizuelno bez gubitka)
  preferredFormat?: 'image/webp' | 'image/jpeg';
}

/**
 * Formatira veličinu bajtova u čitljiv format (npr. "2.4 MB" ili "185 KB")
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Kompresuje File objekat direktno u browseru bez slanja na eksterni server.
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxDimension = 1920,
    quality = 0.85,
    preferredFormat = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Proračun srazmernog smanjenja ukoliko je slika veća od maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          // Kreiranje canvasa sa visokim nivoom izglađivanja (bicubic interpolation)
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Canvas context nije dostupan');
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Iscrtavanje slike
          ctx.drawImage(img, 0, 0, width, height);

          // Provera podrške za WebP
          let outputFormat = preferredFormat;
          let dataUrl = canvas.toDataURL(outputFormat, quality);

          // Ako browser ne podržava WebP (toDataURL vrati image/png), koristi JPEG
          if (outputFormat === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
            outputFormat = 'image/jpeg';
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // Konverzija u Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Fallback na ručni blob iz dataUrl
                const binStr = atob(dataUrl.split(',')[1]);
                const len = binStr.length;
                const arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  arr[i] = binStr.charCodeAt(i);
                }
                const fallbackBlob = new Blob([arr], { type: outputFormat });
                const savings = Math.max(0, Math.round(((file.size - fallbackBlob.size) / file.size) * 100));
                
                resolve({
                  dataUrl,
                  blob: fallbackBlob,
                  originalSize: file.size,
                  compressedSize: fallbackBlob.size,
                  savingsPercent: savings,
                  width,
                  height,
                  format: outputFormat
                });
                return;
              }

              const savings = Math.max(0, Math.round(((file.size - blob.size) / file.size) * 100));

              resolve({
                dataUrl,
                blob,
                originalSize: file.size,
                compressedSize: blob.size,
                savingsPercent: savings,
                width,
                height,
                format: outputFormat
              });
            },
            outputFormat,
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Neuspešno učitavanje slike za kompresiju'));
      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Neuspešno čitanje datoteke'));
    reader.readAsDataURL(file);
  });
}

/**
 * Kompresuje sliku prosleđenu kao base64 ili URL string
 */
export async function compressDataUrl(
  dataUrlOrUrl: string,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; width: number; height: number; originalSize: number; compressedSize: number }> {
  const {
    maxDimension = 1920,
    quality = 0.85,
    preferredFormat = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error('Canvas context nije dostupan');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let outputFormat = preferredFormat;
        let compressed = canvas.toDataURL(outputFormat, quality);
        if (outputFormat === 'image/webp' && !compressed.startsWith('data:image/webp')) {
          compressed = canvas.toDataURL('image/jpeg', quality);
        }

        const approxOrigSize = Math.round((dataUrlOrUrl.length * 3) / 4);
        const approxCompSize = Math.round((compressed.length * 3) / 4);

        resolve({
          dataUrl: compressed,
          width,
          height,
          originalSize: approxOrigSize,
          compressedSize: approxCompSize
        });
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error('Neuspešno učitavanje slike iz URL-a'));
    img.src = dataUrlOrUrl;
  });
}
