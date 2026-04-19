/**
 * Upload training images to Supabase Storage
 * Node.js script for reliable uploads
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load .env from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'training-images';

const SOURCE_DIRS = [
  'D:\\AI Projects\\Freelance\\Afia-App\\augmented-output',
  'D:\\AI Projects\\Freelance\\Afia-App\\oil-bottle-augmented'
];

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Calculate MD5 hash of file
 */
function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Collect all images from source directories
 */
function collectImages() {
  const imagesByLevel = {};
  const seenHashes = new Set();
  let totalSkipped = 0;

  console.log('\n📂 Collecting images...\n');

  for (const sourceDir of SOURCE_DIRS) {
    if (!fs.existsSync(sourceDir)) {
      console.log(`⚠ Warning: ${sourceDir} not found, skipping`);
      continue;
    }

    const sourceName = path.basename(sourceDir);
    console.log(`Scanning ${sourceName}...`);

    const levelDirs = fs.readdirSync(sourceDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());

    for (const levelDir of levelDirs) {
      const fillLevel = levelDir.name;
      const levelPath = path.join(sourceDir, fillLevel);

      if (!imagesByLevel[fillLevel]) {
        imagesByLevel[fillLevel] = [];
      }

      const images = fs.readdirSync(levelPath)
        .filter(file => file.toLowerCase().endsWith('.jpg'));

      let imageCount = 0;
      let duplicateCount = 0;

      for (const imgFile of images) {
        const imgPath = path.join(levelPath, imgFile);
        const stats = fs.statSync(imgPath);
        const fileSize = stats.size;

        // Skip files larger than 5MB
        if (fileSize > 5 * 1024 * 1024) {
          console.log(`  ⚠ Skipping ${imgFile} (too large: ${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);
          totalSkipped++;
          continue;
        }

        const fileHash = getFileHash(imgPath);

        // Skip duplicates
        if (seenHashes.has(fileHash)) {
          duplicateCount++;
          continue;
        }

        seenHashes.add(fileHash);
        imagesByLevel[fillLevel].push({
          path: imgPath,
          name: imgFile,
          hash: fileHash,
          size: fileSize,
          source: sourceName
        });
        imageCount++;
      }

      console.log(`  ${fillLevel}: ${imageCount} unique images (${duplicateCount} duplicates skipped)`);
    }
  }

  console.log(`\n⚠ Total files skipped (too large): ${totalSkipped}\n`);
  return imagesByLevel;
}

/**
 * Upload images to Supabase Storage
 */
async function uploadImages(imagesByLevel) {
  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  const fillLevels = Object.keys(imagesByLevel).sort();

  for (const fillLevel of fillLevels) {
    const images = imagesByLevel[fillLevel];
    console.log(`\n📤 Uploading ${fillLevel} (${images.length} images)...`);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const storagePath = `${fillLevel}/${img.name}`;

      try {
        // Check if file exists
        const { data: existingFile } = await supabase.storage
          .from(BUCKET_NAME)
          .list(fillLevel, {
            search: img.name
          });

        if (existingFile && existingFile.length > 0) {
          totalSkipped++;
          if ((i + 1) % 50 === 0) {
            console.log(`  Progress: ${i + 1}/${images.length} (skipped existing)`);
          }
          continue;
        }

        // Upload file
        const fileBuffer = fs.readFileSync(img.path);
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileBuffer, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (error) {
          console.log(`  ✗ Failed to upload ${img.name}: ${error.message}`);
          totalFailed++;
        } else {
          totalUploaded++;
          if ((i + 1) % 50 === 0) {
            console.log(`  Progress: ${i + 1}/${images.length}`);
          }
        }

      } catch (error) {
        console.log(`  ✗ Error uploading ${img.name}: ${error.message}`);
        totalFailed++;
      }
    }

    console.log(`  ✓ Completed ${fillLevel}`);
  }

  return { totalUploaded, totalSkipped, totalFailed };
}

/**
 * Save manifest file
 */
function saveManifest(imagesByLevel) {
  const manifest = {
    total_images: Object.values(imagesByLevel).reduce((sum, imgs) => sum + imgs.length, 0),
    total_size_mb: Object.values(imagesByLevel).reduce(
      (sum, imgs) => sum + imgs.reduce((s, img) => s + img.size, 0),
      0
    ) / (1024 * 1024),
    fill_levels: {}
  };

  for (const [level, images] of Object.entries(imagesByLevel)) {
    manifest.fill_levels[level] = {
      count: images.length,
      size_mb: images.reduce((sum, img) => sum + img.size, 0) / (1024 * 1024),
      files: images.map(img => ({
        name: img.name,
        path: img.path,
        source: img.source,
        size_bytes: img.size,
        hash: img.hash
      }))
    };
  }

  fs.writeFileSync('upload_manifest.json', JSON.stringify(manifest, null, 2));
  console.log('\n✓ Manifest saved to upload_manifest.json');
  return manifest;
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Afia App - Image Upload to Supabase');
  console.log('='.repeat(60));

  // Step 1: Collect images
  console.log('\n[1/3] Collecting images from source directories...');
  const imagesByLevel = collectImages();

  const totalImages = Object.values(imagesByLevel).reduce((sum, imgs) => sum + imgs.length, 0);
  const totalSizeMB = Object.values(imagesByLevel).reduce(
    (sum, imgs) => sum + imgs.reduce((s, img) => s + img.size, 0),
    0
  ) / (1024 * 1024);

  console.log(`\n✓ Found ${totalImages} unique images across ${Object.keys(imagesByLevel).length} fill levels`);
  console.log(`✓ Total size: ${totalSizeMB.toFixed(2)} MB`);

  // Step 2: Save manifest
  console.log('\n[2/3] Saving upload manifest...');
  saveManifest(imagesByLevel);

  // Step 3: Upload images
  console.log('\n[3/3] Uploading images to Supabase Storage...');
  const { totalUploaded, totalSkipped, totalFailed } = await uploadImages(imagesByLevel);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary');
  console.log('='.repeat(60));
  console.log(`✓ Uploaded: ${totalUploaded}`);
  console.log(`⊘ Skipped (already exists): ${totalSkipped}`);
  console.log(`✗ Failed: ${totalFailed}`);
  console.log(`📦 Total unique images: ${totalImages}`);
  console.log(`🗂️  Fill levels: ${Object.keys(imagesByLevel).length}`);
  console.log('='.repeat(60));

  if (totalFailed > 0) {
    console.log('\n⚠ Some uploads failed. Check the logs above for details.');
  } else {
    console.log('\n🎉 All images processed successfully!');
  }
}

// Run the script
main().catch(console.error);
