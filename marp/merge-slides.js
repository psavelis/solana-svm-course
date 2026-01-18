#!/usr/bin/env node

/**
 * Script to merge all Marp slide PDFs into a single comprehensive document
 * Usage: node merge-slides.js
 */

const PDFMerger = require('pdf-merger-js').default;
const fs = require('fs');
const path = require('path');

async function mergeAllSlides() {
  const merger = new PDFMerger();
  const slidesDir = path.join(__dirname, 'slides');

  console.log('🔄 Merging all Solana SVM Study Course slides...');
  console.log('==================================================');

  // Define the order of slides for the complete course
  const slideOrder = [
    'course-overview.pdf',
    'study-topics.pdf',
    'implementation-tasks.pdf',
    '01-accounts-programs.pdf',
    '02-transactions-instructions.pdf',
    '03-token-standards.pdf',
    '04-account-abstraction.pdf',
    '05-fee-mechanism.pdf',
    '06-consensus-validation.pdf',
    '07-signing-cryptography.pdf',
    '08-mpc.pdf',
    '09-svm.pdf',
    '10-cpis.pdf',
    '11-events-logging.pdf',
    '12-security-practices.pdf',
    '13-development-tools.pdf',
    '14-network-architecture.pdf',
    '15-advanced-features.pdf',
    '16-esports-matchmaking.pdf',
  ];

  let totalSlides = 0;

  // Add each PDF in the specified order
  for (const slideFile of slideOrder) {
    const slidePath = path.join(slidesDir, slideFile);

    if (fs.existsSync(slidePath)) {
      console.log(`📄 Adding ${slideFile}...`);
      await merger.add(slidePath);
      totalSlides++;
    } else {
      console.log(`⚠️  Warning: ${slideFile} not found, skipping...`);
    }
  }

  // Generate output filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const outputFile = `solana-svm-study-course-complete-${timestamp}.pdf`;
  const outputPath = path.join(__dirname, outputFile);

  // Save the merged PDF
  console.log(`\n💾 Saving merged PDF as: ${outputFile}`);
  await merger.save(outputPath);

  console.log('\n✅ PDF merge complete!');
  console.log('========================');
  console.log(`📊 Total PDFs merged: ${totalSlides}`);
  console.log(`📁 Output file: ${outputFile}`);
  console.log(`📂 Location: ${path.relative(process.cwd(), outputPath)}`);

  // Get file size
  const stats = fs.statSync(outputPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📏 File size: ${fileSizeMB} MB`);

  console.log('\n🎯 Ready for distribution!');
  console.log('===========================');
  console.log('The complete Solana SVM Study Course is now available as a single PDF document.');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Error merging PDFs:', error.message);
  process.exit(1);
});

// Run the merge function
mergeAllSlides().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
