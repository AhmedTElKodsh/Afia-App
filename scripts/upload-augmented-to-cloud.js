#!/usr/bin/env node

/**
 * Upload Augmented Images to B2 and Create Supabase Records
 * 
 * Takes locally generated augmented images from augmented-output/ folder
 * and uploads them to B2 storage, then creates corresponding Supabase records.
 * 
 * Usage:
 *   node scripts/upload-augmented-to-cloud.js [--dry-run] [--limit=N]
 * 
 * Environment Variables Required:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key (admin access)
 *   B2_KEY_ID - Backblaze B2 key ID
 *   B2_APPLICATION_KEY - Backblaze B2 application key
 *   B2_BUCKET_NAME - B2 bucket name (or bucket ID)
 *   B2_DOWNLOAD_URL - B2 download URL base
 */

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitMatch = args.find(arg => arg.startsWith('--limit='));
const limit = limitMatch ? parseInt(limitMatch.split('=')[1]) : null;

// Validate environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'B2_KEY_ID',
  'B2_APPLICATION_KEY',
  'B2_BUCKET_NAME',
  'B2_DOWNLOAD_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease set these variables in your environment or .env file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// B2 configuration
const B2_CONFIG = {
  keyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
  bucketName: process.env.B2_BUCKET_NAME,
  downloadUrl: process.env.B2_DOWNLOAD_URL
};

// Local augmented output path
const AUGMENTED_OUTPUT_PATH = './augmented-output';

// SKU mapping (fill level to SKU)
const FILL_LEVEL_TO_SKU = {
  'empty': 'filippo-berio-1500ml',
  '55ml': 'filippo-berio-1500ml',
  '110ml': 'filippo-berio-1500ml',
  '165ml': 'filippo-berio-1500ml',
  '220ml': 'filippo-berio-1500ml',
  '275ml': 'filippo-berio-1500ml',
  '330ml': 'filippo-berio-1500ml',
  '385ml': 'filippo-berio-1500ml',
  '440ml': 'filippo-berio-1500ml',
  '495ml': 'filippo-berio-1500ml',
  '550ml': 'filippo-berio-1500ml',
  '605ml': 'filippo-berio-1500ml',
  '660ml': 'filippo-berio-1500ml',
  '715ml': 'filippo-berio-1500ml',
  '770ml': 'filippo-berio-1500ml',
  '825ml': 'filippo-berio-1500ml',
  '880ml': 'filippo-berio-1500ml',
  '935ml': 'filippo-berio-1500ml',
  '990ml': 'filippo-berio-1500ml',
  '1045ml': 'filippo-berio-1500ml',
  '1100ml': 'filippo-berio-1500ml',
  '1155ml': 'filippo-berio-1500ml',
  '1210ml': 'filippo-berio-1500ml',
  '1265ml': 'filippo-berio-1500ml',
  '1320ml': 'filippo-berio-1500ml',
  '1375ml': 'filippo-berio-1500ml',
  '1430ml': 'filippo-berio-1500ml',
  '1485ml': 'filippo-berio-1500ml',
  '1500ml': 'filippo-berio-1500ml'
};

/**
 * Main execution function
 */
async function main() {
  console.log('☁️  Upload Augmented Images to Cloud');
  console.log('====================================\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No uploads or database changes\n');
  }
  
  if (limit) {
    console.log(`📊 Processing limit: ${limit} images\n`);
  }

  // Step 1: Scan augmented output folder
  console.log('📥 Step 1: Scanning augmented images...');
  const augmentedImages = await scanAugmentedImages();
  console.log(`   Found ${augmentedImages.length} augmented images\n`);

  if (augmentedImages.length === 0) {
    console.log('✅ No augmented images found. Run augmentation first.');
    return;
  }

  // Apply limit if specified
  const imagesToProcess = limit ? augmentedImages.slice(0, limit) : augmentedImages;
  console.log(`📊 Processing ${imagesToProcess.length} images\n`);

  // Step 2: Get B2 authorization (once for all uploads)
  let b2Auth = null;
  if (!isDryRun) {
    console.log('🔐 Step 2: Authorizing with B2...');
    b2Auth = await authorizeB2();
    console.log('   ✅ B2 authorization successful\n');
  }

  // Step 3: Process each augmented image
  let uploadedCount = 0;
  let recordsCreated = 0;
  let skippedCount = 0;
  let processedCount = 0;

  for (const imageInfo of imagesToProcess) {
    processedCount++;
    console.log(`\n☁️  Processing ${processedCount}/${imagesToProcess.length}: ${imageInfo.filename}`);
    console.log(`   Fill Level: ${imageInfo.fillLevel}, Variant: ${imageInfo.variant}`);

    try {
      if (isDryRun) {
        console.log(`   🔍 [DRY RUN] Would upload to B2 and create Supabase record`);
        uploadedCount++;
        recordsCreated++;
        continue;
      }

      // Check if already exists in Supabase
      const exists = await checkIfExists(imageInfo);
      if (exists) {
        console.log(`   ⏭️  Already exists in database, skipping`);
        skippedCount++;
        continue;
      }

      // Read image file
      const imageBuffer = await readFile(imageInfo.path);

      // Upload to B2
      const b2Url = await uploadToB2(imageBuffer, imageInfo, b2Auth);
      console.log(`   ✅ Uploaded to B2`);
      uploadedCount++;

      // Create Supabase record
      await createSupabaseRecord(imageInfo, b2Url);
      console.log(`   ✅ Created Supabase record`);
      recordsCreated++;

      // Progress report every 50 images
      if (processedCount % 50 === 0) {
        console.log(`\n📊 Progress Report (${processedCount}/${imagesToProcess.length}):`);
        console.log(`   Uploaded: ${uploadedCount}`);
        console.log(`   Records created: ${recordsCreated}`);
        console.log(`   Skipped (duplicates): ${skippedCount}`);
      }

    } catch (error) {
      console.error(`   ❌ Error processing ${imageInfo.filename}:`, error.message);
      // Continue with next image
    }
  }

  // Final summary
  console.log('\n\n✅ Upload Complete!');
  console.log('===================');
  console.log(`Images processed: ${processedCount}`);
  console.log(`Uploaded to B2: ${uploadedCount}`);
  console.log(`Supabase records created: ${recordsCreated}`);
  console.log(`Skipped (duplicates): ${skippedCount}`);
  
  if (isDryRun) {
    console.log('\n🔍 This was a DRY RUN - no actual uploads or database changes');
  }
}

/**
 * Scan augmented output folder for all images
 */
async function scanAugmentedImages() {
  const images = [];
  
  try {
    const folders = await readdir(AUGMENTED_OUTPUT_PATH);
    const fillLevelFolders = folders.filter(f => !f.startsWith('.'));

    for (const folder of fillLevelFolders) {
      const folderPath = join(AUGMENTED_OUTPUT_PATH, folder);
      
      try {
        const files = await readdir(folderPath);
        const augFiles = files.filter(f => 
          f.startsWith('aug-') && f.toLowerCase().endsWith('.jpg')
        );

        for (const file of augFiles) {
          // Parse filename: aug-550ml-0025-brightness_plus.jpg
          const match = file.match(/^aug-(.+?)-(\d+)-(.+)\.jpg$/);
          if (match) {
            const [, fillLevel, frame, variant] = match;
            images.push({
              filename: file,
              fillLevel: fillLevel,
              frame: frame,
              variant: variant,
              path: join(folderPath, file)
            });
          }
        }
      } catch (err) {
        console.error(`   ⚠️  Error reading ${folder}:`, err.message);
      }
    }
  } catch (error) {
    console.error('❌ Error scanning augmented output:', error.message);
    throw error;
  }

  return images;
}

/**
 * Authorize with B2 API
 */
async function authorizeB2() {
  const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${B2_CONFIG.keyId}:${B2_CONFIG.applicationKey}`).toString('base64')}`
    }
  });

  if (!authResponse.ok) {
    throw new Error(`Failed to authorize B2 account: ${authResponse.status}`);
  }

  const authData = await authResponse.json();
  
  // Get upload URL for the bucket
  const uploadUrlResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      'Authorization': authData.authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bucketId: B2_CONFIG.bucketName })
  });

  if (!uploadUrlResponse.ok) {
    throw new Error(`Failed to get B2 upload URL: ${uploadUrlResponse.status}`);
  }

  const uploadData = await uploadUrlResponse.json();

  return {
    authorizationToken: authData.authorizationToken,
    apiUrl: authData.apiUrl,
    uploadUrl: uploadData.uploadUrl,
    uploadToken: uploadData.authorizationToken
  };
}

/**
 * Upload image to B2 storage
 */
async function uploadToB2(imageBuffer, imageInfo, b2Auth) {
  const fileName = `images/training/${imageInfo.filename}`;

  const uploadResponse = await fetch(b2Auth.uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': b2Auth.uploadToken,
      'X-Bz-File-Name': fileName,
      'Content-Type': 'image/jpeg',
      'X-Bz-Content-Sha1': createHash('sha1').update(imageBuffer).digest('hex')
    },
    body: imageBuffer
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload to B2: ${uploadResponse.status} - ${errorText}`);
  }

  return `${B2_CONFIG.downloadUrl}/${fileName}`;
}

/**
 * Check if augmented image already exists in Supabase
 */
async function checkIfExists(imageInfo) {
  const { data, error } = await supabase
    .from('training_samples')
    .select('id')
    .eq('source_type', 'augmented')
    .eq('metadata->>augmentation_type', imageInfo.variant)
    .eq('metadata->>fill_level', imageInfo.fillLevel)
    .eq('metadata->>frame', imageInfo.frame)
    .limit(1);

  if (error) {
    console.error('   ⚠️  Error checking existence:', error.message);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Create Supabase training_samples record
 */
async function createSupabaseRecord(imageInfo, b2Url) {
  // Calculate label percentage from fill level
  const fillLevelNum = parseInt(imageInfo.fillLevel.replace('ml', ''));
  const labelPercentage = imageInfo.fillLevel === 'empty' ? 0 : (fillLevelNum / 1500) * 100;

  // Get SKU for this fill level
  const sku = FILL_LEVEL_TO_SKU[imageInfo.fillLevel] || 'filippo-berio-1500ml';

  const record = {
    source_type: 'augmented',
    source_id: null, // No base scan ID since these are from video frames
    image_url: b2Url,
    sku: sku,
    label_percentage: labelPercentage,
    weight: 1.0,
    metadata: {
      augmentation_type: imageInfo.variant,
      fill_level: imageInfo.fillLevel,
      frame: imageInfo.frame,
      source: 'video_frame_augmentation',
      description: `Augmented from video frame: ${imageInfo.fillLevel} fill level, frame ${imageInfo.frame}`
    }
  };

  const { error } = await supabase
    .from('training_samples')
    .insert(record);

  if (error) {
    throw new Error(`Failed to create Supabase record: ${error.message}`);
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
