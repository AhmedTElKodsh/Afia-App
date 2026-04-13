import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(__dirname, '..', 'public', 'icons', 'afia-logo.png');
const targetDir = path.resolve(__dirname, '..', 'public', 'icons');

async function generateIcons() {
  try {
    console.log('Generating PWA icons from:', source);
    
    await sharp(source)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(targetDir, 'icon-192.png'));
    console.log('Created icon-192.png');

    await sharp(source)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile(path.join(targetDir, 'icon-512.png'));
    console.log('Created icon-512.png');

    console.log('PWA icons updated successfully.');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

generateIcons();
