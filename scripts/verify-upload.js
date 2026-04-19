/**
 * Verify uploaded images and show statistics
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load .env from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'training-images';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EXPECTED_LEVELS = [
  '55ml', '110ml', '165ml', '220ml', '275ml', '330ml', '385ml', '440ml',
  '495ml', '550ml', '605ml', '660ml', '715ml', '770ml', '825ml', '880ml',
  '935ml', '990ml', '1045ml', '1100ml', '1155ml', '1210ml', '1265ml',
  '1320ml', '1375ml', '1430ml', '1485ml', '1500ml', 'empty'
];

async function verifyUpload() {
  console.log('='.repeat(60));
  console.log('📊 Verifying Upload to Supabase Storage');
  console.log('='.repeat(60));

  // Check bucket exists
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  
  if (bucketError) {
    console.log(`\n✗ Error accessing buckets: ${bucketError.message}`);
    return;
  }

  const bucket = buckets.find(b => b.name === BUCKET_NAME);
  if (!bucket) {
    console.log(`\n✗ Bucket '${BUCKET_NAME}' not found`);
    return;
  }

  console.log(`\n✓ Bucket found: ${BUCKET_NAME}`);
  console.log(`  Public: ${bucket.public}`);

  // Scan all fill levels
  console.log('\n📂 Scanning uploaded files...\n');

  const fillLevels = {};
  let totalFiles = 0;
  let totalSize = 0;

  for (const level of EXPECTED_LEVELS) {
    try {
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(level);

      if (error) {
        console.log(`  ⚠ Could not access ${level}: ${error.message}`);
        continue;
      }

      if (files && files.length > 0) {
        const levelSize = files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
        
        fillLevels[level] = {
          count: files.length,
          size: levelSize
        };

        totalFiles += files.length;
        totalSize += levelSize;
      }
    } catch (error) {
      console.log(`  ⚠ Error accessing ${level}: ${error.message}`);
    }
  }

  // Display results
  console.log('='.repeat(60));
  console.log('📈 Upload Statistics');
  console.log('='.repeat(60));
  console.log();
  console.log(`${'Fill Level'.padEnd(15)} ${'Files'.padEnd(10)} ${'Size (MB)'.padStart(12)}`);
  console.log('-'.repeat(40));

  // Sort levels
  const sortedLevels = Object.keys(fillLevels).sort((a, b) => {
    if (a === 'empty') return 1;
    if (b === 'empty') return -1;
    return parseInt(a) - parseInt(b);
  });

  for (const level of sortedLevels) {
    const { count, size } = fillLevels[level];
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    console.log(`${level.padEnd(15)} ${count.toString().padEnd(10)} ${sizeMB.padStart(10)} MB`);
  }

  console.log('-'.repeat(40));
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  console.log(`${'TOTAL'.padEnd(15)} ${totalFiles.toString().padEnd(10)} ${totalSizeMB.padStart(10)} MB`);

  // Free tier warning
  console.log();
  console.log('='.repeat(60));
  console.log('💾 Storage Usage');
  console.log('='.repeat(60));
  
  const totalSizeGB = totalSize / (1024 * 1024 * 1024);
  const freeTierLimitGB = 1.0;
  const usagePercent = (totalSizeGB / freeTierLimitGB) * 100;

  console.log(`Used: ${totalSizeGB.toFixed(3)} GB / ${freeTierLimitGB} GB`);
  console.log(`Usage: ${usagePercent.toFixed(1)}%`);

  if (usagePercent > 80) {
    console.log('⚠️  WARNING: Approaching free tier limit!');
  } else if (usagePercent > 50) {
    console.log('⚠️  Moderate usage - monitor closely');
  } else {
    console.log('✓ Well within free tier limits');
  }

  // Test file access
  console.log();
  console.log('='.repeat(60));
  console.log('🔍 Testing file access...');
  
  if (totalFiles > 0) {
    const sampleLevel = sortedLevels[0];
    try {
      const { data: files } = await supabase.storage
        .from(BUCKET_NAME)
        .list(sampleLevel);

      if (files && files.length > 0) {
        const sampleFile = files[0].name;
        const samplePath = `${sampleLevel}/${sampleFile}`;

        const { data: signedUrl, error } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(samplePath, 60);

        if (error) {
          console.log(`⚠ Could not create signed URL: ${error.message}`);
        } else {
          console.log(`✓ Sample file accessible: ${samplePath}`);
          console.log(`  Signed URL generated successfully`);
        }
      }
    } catch (error) {
      console.log(`⚠ Could not access sample file: ${error.message}`);
    }
  }

  console.log();
  console.log('✅ Verification complete!');
  console.log('='.repeat(60));
}

// Run verification
verifyUpload().catch(console.error);
