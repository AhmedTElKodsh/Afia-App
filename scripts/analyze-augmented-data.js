#!/usr/bin/env node

/**
 * Analyze Existing Augmented Data
 * 
 * Scans the oil-bottle-augmented folder to understand:
 * - How many base images exist (orig_*)
 * - How many augmented variants exist (aug_*)
 * - What augmentation pattern was used
 * - What's missing compared to Story 7.2's 10-variant requirement
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const AUGMENTED_DATA_PATH = 'D:\\AI Projects\\Freelance\\Afia-App\\oil-bottle-augmented';

// Story 7.2 requires 10 variants per base image
const REQUIRED_VARIANTS = [
  'brightness_plus',
  'brightness_minus',
  'contrast_plus',
  'contrast_minus',
  'flip_horizontal',
  'rotate_plus',
  'rotate_minus',
  'jpeg_quality_low',
  'jpeg_quality_mid',
  'jpeg_quality_high'
];

async function analyzeAugmentedData() {
  console.log('🔍 Analyzing Existing Augmented Data');
  console.log('=====================================\n');

  try {
    // Get all fill level folders
    const folders = await readdir(AUGMENTED_DATA_PATH);
    const fillLevelFolders = folders.filter(f => !f.startsWith('.'));

    console.log(`📁 Found ${fillLevelFolders.length} fill level folders:\n`);
    console.log(fillLevelFolders.map(f => `   - ${f}`).join('\n'));
    console.log('\n');

    let totalOriginal = 0;
    let totalAugmented = 0;
    const fillLevelStats = {};

    // Analyze each folder
    for (const folder of fillLevelFolders) {
      const folderPath = join(AUGMENTED_DATA_PATH, folder);
      
      try {
        const files = await readdir(folderPath);
        const jpgFiles = files.filter(f => f.toLowerCase().endsWith('.jpg'));
        
        const origFiles = jpgFiles.filter(f => f.startsWith('orig_'));
        const augFiles = jpgFiles.filter(f => f.startsWith('aug_'));
        
        totalOriginal += origFiles.length;
        totalAugmented += augFiles.length;
        
        fillLevelStats[folder] = {
          original: origFiles.length,
          augmented: augFiles.length,
          total: jpgFiles.length
        };
      } catch (err) {
        console.error(`   ⚠️  Error reading ${folder}:`, err.message);
      }
    }

    // Display summary
    console.log('📊 Summary Statistics:');
    console.log('======================\n');
    console.log(`Total Original Images: ${totalOriginal}`);
    console.log(`Total Augmented Images: ${totalAugmented}`);
    console.log(`Total Images: ${totalOriginal + totalAugmented}\n`);

    // Analyze augmentation pattern
    console.log('🔬 Augmentation Pattern Analysis:');
    console.log('==================================\n');

    // Sample one folder to understand the pattern
    const sampleFolder = fillLevelFolders.find(f => f !== 'empty') || fillLevelFolders[0];
    const samplePath = join(AUGMENTED_DATA_PATH, sampleFolder);
    const sampleFiles = await readdir(samplePath);
    const sampleJpgs = sampleFiles.filter(f => f.toLowerCase().endsWith('.jpg'));
    
    const sampleOrig = sampleJpgs.filter(f => f.startsWith('orig_'));
    const sampleAug = sampleJpgs.filter(f => f.startsWith('aug_'));
    
    console.log(`Sample Folder: ${sampleFolder}`);
    console.log(`   Original images: ${sampleOrig.length}`);
    console.log(`   Augmented images: ${sampleAug.length}`);
    
    if (sampleOrig.length > 0) {
      const variantsPerOriginal = sampleAug.length / sampleOrig.length;
      console.log(`   Variants per original: ${variantsPerOriginal.toFixed(1)}\n`);
      
      // Analyze naming pattern
      console.log('📝 Naming Pattern:');
      console.log(`   Original: ${sampleOrig[0]}`);
      if (sampleAug.length > 0) {
        console.log(`   Augmented: ${sampleAug[0]}`);
        console.log(`   Augmented: ${sampleAug[1] || 'N/A'}\n`);
      }
      
      // Determine what's missing
      console.log('🎯 Gap Analysis:');
      console.log('================\n');
      
      const existingVariants = Math.floor(variantsPerOriginal);
      const requiredVariants = REQUIRED_VARIANTS.length;
      
      console.log(`Story 7.2 requires: ${requiredVariants} variants per image`);
      console.log(`Currently have: ${existingVariants} variants per image`);
      
      if (existingVariants < requiredVariants) {
        const missingCount = requiredVariants - existingVariants;
        console.log(`\n⚠️  MISSING: ${missingCount} variants per image`);
        console.log(`\nTotal missing augmented images: ${totalOriginal * missingCount}`);
        console.log(`\n📋 Required Story 7.2 Variants:`);
        REQUIRED_VARIANTS.forEach((v, i) => {
          console.log(`   ${i + 1}. ${v}`);
        });
        
        console.log(`\n💡 Current Pattern Analysis:`);
        console.log(`   Your existing data uses: aug_XXX pattern`);
        console.log(`   Story 7.2 uses: aug-{scanId}-{variantName}.jpg pattern`);
        console.log(`\n   The naming conventions are different!`);
      } else {
        console.log(`\n✅ You have ${existingVariants} variants, which meets or exceeds the requirement!`);
      }
    }

    // Detailed breakdown by fill level
    console.log('\n\n📈 Detailed Breakdown by Fill Level:');
    console.log('====================================\n');
    
    const sortedFolders = Object.keys(fillLevelStats).sort((a, b) => {
      const aNum = parseInt(a.replace('ml', '')) || 0;
      const bNum = parseInt(b.replace('ml', '')) || 0;
      return aNum - bNum;
    });
    
    console.log('Fill Level | Original | Augmented | Total');
    console.log('-----------|----------|-----------|------');
    sortedFolders.forEach(folder => {
      const stats = fillLevelStats[folder];
      console.log(`${folder.padEnd(10)} | ${String(stats.original).padStart(8)} | ${String(stats.augmented).padStart(9)} | ${String(stats.total).padStart(5)}`);
    });

    // Recommendations
    console.log('\n\n💡 Recommendations:');
    console.log('===================\n');
    
    console.log('1. **Naming Convention Mismatch:**');
    console.log('   - Your data: aug_XXX_550ml_tXXXX.XXs_fXXXX.jpg');
    console.log('   - Story 7.2: aug-{scanId}-{variantName}.jpg');
    console.log('   - These are incompatible formats!\n');
    
    console.log('2. **Data Source:**');
    console.log('   - Your data appears to be video frame extractions (time-based)');
    console.log('   - Story 7.2 expects scan-based augmentations (transformation-based)');
    console.log('   - These serve different purposes!\n');
    
    console.log('3. **Next Steps:**');
    console.log('   a) Keep your existing data for video-based training');
    console.log('   b) Run Story 7.2 augmentation script for scan-based training');
    console.log('   c) Both datasets can coexist and complement each other\n');
    
    console.log('4. **Story 7.2 Augmentation Script:**');
    console.log('   - Reads from Supabase training_samples table');
    console.log('   - Generates 10 transformation variants per scan');
    console.log('   - Uploads to B2 storage with proper naming');
    console.log('   - Creates Supabase records for tracking\n');

  } catch (error) {
    console.error('❌ Error analyzing data:', error.message);
    process.exit(1);
  }
}

// Run analysis
analyzeAugmentedData().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
