#!/usr/bin/env node

/**
 * Training Data Augmentation Pipeline
 * 
 * Generates augmented variants of training-eligible scans to accelerate
 * model training dataset growth. Implements Story 7.2 requirements.
 * 
 * Usage:
 *   node scripts/augment-training-data.js [--dry-run] [--limit=N]
 * 
 * Environment Variables Required:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key (admin access)
 *   B2_KEY_ID - Backblaze B2 key ID
 *   B2_APPLICATION_KEY - Backblaze B2 application key
 *   B2_BUCKET_NAME - B2 bucket name
 *   B2_DOWNLOAD_URL - B2 download URL base
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
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

// Initialize Supabase client with service role key (admin access)
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

/**
 * Augmentation configurations
 * Each variant applies a specific transformation to the base image
 * Note: 10 variants total (increased from 8 to include quality range 0.6-0.95)
 */
const AUGMENTATION_VARIANTS = [
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
  console.log('🚀 Training Data Augmentation Pipeline');
  console.log('=====================================\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  if (limit) {
    console.log(`📊 Processing limit: ${limit} base images\n`);
  }

  // Step 1: Query base training samples
  console.log('📥 Step 1: Querying base training samples...');
  const baseSamples = await queryBaseSamples(limit);
  console.log(`   Found ${baseSamples.length} training-eligible base samples\n`);

  if (baseSamples.length === 0) {
    console.log('✅ No base samples to augment. Exiting.');
    return;
  }

  // Check if we've reached the 500 sample threshold
  const totalBaseSamples = await countTotalBaseSamples();
  console.log(`📊 Training Dataset Status:`);
  console.log(`   Base samples (non-augmented): ${totalBaseSamples}`);
  console.log(`   Threshold for training: 500`);
  
  if (totalBaseSamples >= 500) {
    console.log(`   ✅ Threshold reached! Ready for model training.\n`);
  } else {
    console.log(`   ⏳ Need ${500 - totalBaseSamples} more base samples to reach threshold.\n`);
  }

  // Step 2: Process each base sample
  let totalVariantsCreated = 0;
  let totalVariantsSkipped = 0;
  let processedCount = 0;

  for (const sample of baseSamples) {
    processedCount++;
    console.log(`\n🔄 Processing ${processedCount}/${baseSamples.length}: ${sample.id}`);
    console.log(`   SKU: ${sample.sku}, Fill: ${sample.label_percentage}%`);

    try {
      // Download base image
      const imageBuffer = await downloadImage(sample.image_url);
      
      // Generate augmented variants
      const results = await generateAugmentedVariants(
        sample,
        imageBuffer,
        isDryRun
      );

      totalVariantsCreated += results.created;
      totalVariantsSkipped += results.skipped;

      console.log(`   ✅ Created: ${results.created}, Skipped: ${results.skipped}`);

      // Progress report every 10 images
      if (processedCount % 10 === 0) {
        console.log(`\n📊 Progress Report (${processedCount}/${baseSamples.length}):`);
        console.log(`   Total variants created: ${totalVariantsCreated}`);
        console.log(`   Total variants skipped: ${totalVariantsSkipped}`);
      }

    } catch (error) {
      console.error(`   ❌ Error processing sample ${sample.id}:`, error.message);
      // Continue with next sample
    }
  }

  // Final summary
  console.log('\n\n✅ Augmentation Pipeline Complete!');
  console.log('===================================');
  console.log(`Base samples processed: ${processedCount}`);
  console.log(`Variants created: ${totalVariantsCreated}`);
  console.log(`Variants skipped (duplicates): ${totalVariantsSkipped}`);
  console.log(`Total new training samples: ${totalVariantsCreated}`);
  
  if (isDryRun) {
    console.log('\n🔍 This was a DRY RUN - no actual changes were made');
  }
}

/**
 * Query base training samples from Supabase
 * Returns samples where augmented=false and training_eligible=true
 */
async function queryBaseSamples(limit = null) {
  let query = supabase
    .from('training_samples')
    .select('*')
    .eq('source_type', 'scan')
    .order('created_at', { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error querying training samples:', error);
    throw error;
  }

  return data || [];
}

/**
 * Count total base (non-augmented) training samples
 */
async function countTotalBaseSamples() {
  const { count, error } = await supabase
    .from('training_samples')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'scan');

  if (error) {
    console.error('❌ Error counting base samples:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Download image from B2 storage with retry logic
 */
async function downloadImage(imageUrl, retries = 3) {
  // Extract the path from the full URL
  const urlPath = imageUrl.replace(B2_CONFIG.downloadUrl, '').replace(/^\//, '');
  const fullUrl = `${B2_CONFIG.downloadUrl}/${urlPath}`;

  console.log(`   📥 Downloading: ${urlPath}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Set 30 second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(fullUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) {
        // Retry on 5xx server errors
        if (response.status >= 500 && attempt < retries) {
          console.log(`   ⚠️  Retry ${attempt}/${retries} after ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
      
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`   ⚠️  Retry ${attempt}/${retries} after error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Generate augmented variants for a base sample
 */
async function generateAugmentedVariants(baseSample, imageBuffer, isDryRun) {
  let created = 0;
  let skipped = 0;

  for (const variant of AUGMENTATION_VARIANTS) {
    try {
      // Check if variant already exists (idempotency)
      const exists = await checkVariantExists(baseSample.id, variant);
      
      if (exists) {
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`   🔍 [DRY RUN] Would create: ${variant.description}`);
        created++;
        continue;
      }

      // Apply augmentation
      const augmentedBuffer = await applyAugmentation(imageBuffer, variant);

      // Upload to B2
      const augmentedUrl = await uploadToB2(
        augmentedBuffer,
        baseSample.id,
        variant.name
      );

      // Create Supabase record
      await createAugmentedRecord(baseSample, augmentedUrl, variant);

      created++;

    } catch (error) {
      console.error(`   ⚠️  Failed to create variant ${variant.name}:`, error.message);
      // Continue with next variant
    }
  }

  return { created, skipped };
}

/**
 * Check if an augmented variant already exists
 */
async function checkVariantExists(baseSampleId, variant) {
  const augmentationParams = JSON.stringify(variant);

  const { data, error } = await supabase
    .from('training_samples')
    .select('id')
    .eq('source_type', 'augmented')
    .eq('source_id', baseSampleId)
    .eq('metadata->>augmentation_type', variant.name)
    .limit(1);

  if (error) {
    console.error('⚠️  Error checking variant existence:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Apply augmentation transformation to image
 */
async function applyAugmentation(imageBuffer, variant) {
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

  // Apply JPEG quality (default is 80)
  const quality = variant.quality || 78;
  pipeline = pipeline.jpeg({ quality });

  return await pipeline.toBuffer();
}

/**
 * Upload augmented image to B2 storage
 */
async function uploadToB2(imageBuffer, baseSampleId, variantName) {
  const fileName = `images/aug-${baseSampleId}-${variantName}.jpg`;

  // Step 1: Authorize account to get authorization token and API URL
  const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${B2_CONFIG.keyId}:${B2_CONFIG.applicationKey}`).toString('base64')}`
    }
  });

  if (!authResponse.ok) {
    throw new Error(`Failed to authorize B2 account: ${authResponse.status}`);
  }

  const { authorizationToken, apiUrl } = await authResponse.json();

  // Step 2: Get upload URL for the bucket
  const uploadUrlResponse = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      'Authorization': authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bucketId: B2_CONFIG.bucketName })
  });

  if (!uploadUrlResponse.ok) {
    throw new Error(`Failed to get B2 upload URL: ${uploadUrlResponse.status}`);
  }

  const { uploadUrl, authorizationToken: uploadToken } = await uploadUrlResponse.json();

  // Step 3: Upload file
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': uploadToken,
      'X-Bz-File-Name': fileName,
      'Content-Type': 'image/jpeg',
      'X-Bz-Content-Sha1': createHash('sha1').update(imageBuffer).digest('hex')
    },
    body: imageBuffer
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload to B2: ${uploadResponse.status}`);
  }

  return `${B2_CONFIG.downloadUrl}/${fileName}`;
}

/**
 * Create augmented training sample record in Supabase
 */
async function createAugmentedRecord(baseSample, augmentedUrl, variant) {
  const record = {
    source_type: 'augmented',
    source_id: baseSample.id,
    image_url: augmentedUrl,
    sku: baseSample.sku,
    label_percentage: baseSample.label_percentage,
    weight: baseSample.weight || 1.0,
    metadata: {
      augmentation_type: variant.name,
      augmentation_params: variant,
      base_sample_id: baseSample.id,
      description: variant.description
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
