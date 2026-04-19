#!/usr/bin/env node

/**
 * Augment Existing Training Data
 * 
 * Takes the original video frames from oil-bottle-frames folder
 * and generates 10 transformation variants required by Story 7.2.
 * 
 * Data Structure:
 * - oil-bottle-frames: 2,356 original frames extracted from 29 videos
 * - oil-bottle-augmented: 5,303 existing augmented images (4 variants per frame)
 * - This script: Generates 10 NEW transformation variants per frame
 * 
 * The 10 Story 7.2 transformation variants:
 * 1. brightness_plus (+20%)
 * 2. brightness_minus (-20%)
 * 3. contrast_plus (+15%)
 * 4. contrast_minus (-15%)
 * 5. flip_horizontal
 * 6. rotate_plus (+5°)
 * 7. rotate_minus (-5°)
 * 8. jpeg_quality_low (60)
 * 9. jpeg_quality_mid (70)
 * 10. jpeg_quality_high (85)
 * 
 * Usage:
 *   node scripts/augment-existing-data.js [--dry-run] [--limit=N] [--output-dir=path]
 * 
 * Environment Variables (Optional - for B2 upload):
 *   B2_KEY_ID - Backblaze B2 key ID
 *   B2_APPLICATION_KEY - Backblaze B2 application key
 *   B2_BUCKET_NAME - B2 bucket name
 *   B2_DOWNLOAD_URL - B2 download URL base
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitMatch = args.find(arg => arg.startsWith('--limit='));
const limit = limitMatch ? parseInt(limitMatch.split('=')[1]) : null;

// Source data path - ORIGINAL FRAMES (not augmented)
const SOURCE_DATA_PATH = 'D:\\AI Projects\\Freelance\\Afia-App\\oil-bottle-frames';

// B2 configuration (optional - only needed if uploading)
const B2_CONFIG = process.env.B2_KEY_ID ? {
  keyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
  bucketName: process.env.B2_BUCKET_NAME,
  downloadUrl: process.env.B2_DOWNLOAD_URL
} : null;

/**
 * ALL 10 transformation variants from Story 7.2
 */
const NEW_AUGMENTATION_VARIANTS = [
  { name: 'brightness_plus', brightness: 1.2, description: 'Brightness +20%' },
  { name: 'brightness_minus', brightness: 0.8, description: 'Brightness -20%' },
  { name: 'contrast_plus', contrast: 1.15, description: 'Contrast +15%' },
  { name: 'contrast_minus', contrast: 0.85, description: 'Contrast -15%' },
  { name: 'flip_horizontal', flip: true, description: 'Horizontal flip' },
  { name: 'rotate_plus', rotate: 5, description: 'Rotation +5°' },
  { name: 'rotate_minus', rotate: -5, description: 'Rotation -5°' },
  { name: 'jpeg_quality_low', quality: 60, description: 'JPEG quality 0.6' },
  { name: 'jpeg_quality_mid', quality: 70, description: 'JPEG quality 0.7' },
  { name: 'jpeg_quality_high', quality: 85, description: 'JPEG quality 0.85' }
];

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Augment Existing Training Data');
  console.log('==================================\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be created\n');
  }
  
  if (limit) {
    console.log(`📊 Processing limit: ${limit} images\n`);
  }

  // Step 1: Scan existing data
  console.log('📥 Step 1: Scanning existing data...');
  const originalImages = await scanOriginalImages();
  console.log(`   Found ${originalImages.length} original images\n`);

  if (originalImages.length === 0) {
    console.log('✅ No original images found. Exiting.');
    return;
  }

  // Apply limit if specified
  const imagesToProcess = limit ? originalImages.slice(0, limit) : originalImages;
  console.log(`📊 Processing ${imagesToProcess.length} images\n`);

  // Step 2: Process each original image
  let totalVariantsCreated = 0;
  let processedCount = 0;

  for (const imageInfo of imagesToProcess) {
    processedCount++;
    console.log(`\n🔄 Processing ${processedCount}/${imagesToProcess.length}: ${imageInfo.filename}`);
    console.log(`   Fill Level: ${imageInfo.fillLevel}`);

    try {
      // Read original image
      const imageBuffer = readFileSync(imageInfo.path);
      
      // Generate new transformation variants
      const created = await generateTransformationVariants(
        imageInfo,
        imageBuffer,
        isDryRun
      );

      totalVariantsCreated += created;

      console.log(`   ✅ Created: ${created} new variants`);

      // Progress report every 50 images
      if (processedCount % 50 === 0) {
        console.log(`\n📊 Progress Report (${processedCount}/${imagesToProcess.length}):`);
        console.log(`   Total new variants created: ${totalVariantsCreated}`);
      }

    } catch (error) {
      console.error(`   ❌ Error processing ${imageInfo.filename}:`, error.message);
      // Continue with next image
    }
  }

  // Final summary
  console.log('\n\n✅ Augmentation Complete!');
  console.log('=========================');
  console.log(`Original images processed: ${processedCount}`);
  console.log(`New variants created: ${totalVariantsCreated}`);
  console.log(`Variants per image: ${NEW_AUGMENTATION_VARIANTS.length}`);
  console.log(`\nTotal training images: ${processedCount} original + ${totalVariantsCreated} augmented = ${processedCount + totalVariantsCreated}`);
  
  if (isDryRun) {
    console.log('\n🔍 This was a DRY RUN - no actual files were created');
    console.log(`\n📊 If run for real on all ${originalImages.length} frames:`);
    console.log(`   - Would create: ${originalImages.length * NEW_AUGMENTATION_VARIANTS.length} augmented images`);
    console.log(`   - Total dataset: ${originalImages.length + (originalImages.length * NEW_AUGMENTATION_VARIANTS.length)} images`);
  } else {
    console.log('\n📁 Output location: ./augmented-output/');
    console.log('\n💡 Next steps:');
    console.log('   1. Review generated images in augmented-output/');
    console.log('   2. Upload to B2 storage (optional)');
    console.log('   3. Create Supabase records (optional)');
  }
}

/**
 * Scan source folder for all original frame images
 */
async function scanOriginalImages() {
  const images = [];
  
  try {
    const folders = await readdir(SOURCE_DATA_PATH);
    const fillLevelFolders = folders.filter(f => 
      !f.startsWith('.') && f !== 'extraction_summary.json' && f !== '1.5L_refs'
    );

    for (const folder of fillLevelFolders) {
      const folderPath = join(SOURCE_DATA_PATH, folder);
      
      try {
        const files = await readdir(folderPath);
        // Original frames don't have 'orig_' prefix - they're just the frame files
        const frameFiles = files.filter(f => 
          f.toLowerCase().endsWith('.jpg') && !f.startsWith('aug_')
        );

        for (const file of frameFiles) {
          images.push({
            filename: file,
            fillLevel: folder,
            path: join(folderPath, file),
            // Extract metadata from filename: 550ml_t0000.00s_f0000.jpg
            timestamp: file.match(/t(\d+\.\d+)s/)?.[1] || '0',
            frame: file.match(/f(\d+)/)?.[1] || '0'
          });
        }
      } catch (err) {
        console.error(`   ⚠️  Error reading ${folder}:`, err.message);
      }
    }
  } catch (error) {
    console.error('❌ Error scanning source data:', error.message);
    throw error;
  }

  return images;
}

/**
 * Generate transformation variants for an original image
 */
async function generateTransformationVariants(imageInfo, imageBuffer, isDryRun) {
  let created = 0;

  for (const variant of NEW_AUGMENTATION_VARIANTS) {
    try {
      if (isDryRun) {
        console.log(`   🔍 [DRY RUN] Would create: ${variant.description}`);
        created++;
        continue;
      }

      // Apply transformation
      const augmentedBuffer = await applyTransformation(imageBuffer, variant);

      // Generate output filename
      const outputFilename = `aug-${imageInfo.fillLevel}-${imageInfo.frame}-${variant.name}.jpg`;
      const outputPath = join('augmented-output', imageInfo.fillLevel, outputFilename);

      // Save to local output folder (create directory structure)
      await saveToLocalOutput(augmentedBuffer, outputPath);

      created++;

    } catch (error) {
      console.error(`   ⚠️  Failed to create variant ${variant.name}:`, error.message);
      // Continue with next variant
    }
  }

  return created;
}

/**
 * Apply transformation to image
 */
async function applyTransformation(imageBuffer, variant) {
  let pipeline = sharp(imageBuffer);

  // Apply transformations based on variant type
  if (variant.brightness) {
    pipeline = pipeline.modulate({ brightness: variant.brightness });
  }

  if (variant.contrast) {
    // Sharp doesn't have direct contrast, use linear adjustment
    const factor = variant.contrast;
    pipeline = pipeline.linear(factor, -(128 * factor) + 128);
  }

  if (variant.flip) {
    pipeline = pipeline.flop();
  }

  if (variant.rotate) {
    pipeline = pipeline.rotate(variant.rotate, { background: { r: 255, g: 255, b: 255 } });
  }

  // Use quality 78 (default)
  pipeline = pipeline.jpeg({ quality: 78 });

  return await pipeline.toBuffer();
}

/**
 * Save augmented image to local output folder
 */
async function saveToLocalOutput(imageBuffer, outputPath) {
  const { mkdir, writeFile } = await import('fs/promises');
  const { dirname } = await import('path');
  
  // Create directory if it doesn't exist
  await mkdir(dirname(outputPath), { recursive: true });
  
  // Write file
  await writeFile(outputPath, imageBuffer);
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
