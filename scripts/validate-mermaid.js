const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docsDir = path.join(__dirname, '../docs/diagrams');
const tempDir = path.join(__dirname, '../temp_mermaid_validation');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

let hasError = false;

console.log(`Validating ${files.length} mermaid files...`);

for (const file of files) {
    const inputPath = path.join(docsDir, file);
    const outputPath = path.join(tempDir, file);
    
    // Check if file contains mermaid blocks
    const content = fs.readFileSync(inputPath, 'utf8');
    if (!content.includes('```mermaid')) {
        console.log(`Skipping ${file} (no mermaid blocks)`);
        continue;
    }

    console.log(`Validating ${file}...`);
    try {
        // Run mmdc
        // We capture output to avoid noise, but print if error
        execSync(`"./node_modules/.bin/mmdc" -i "${inputPath}" -o "${outputPath}"`, { stdio: 'pipe' });
    } catch (e) {
        console.error(`❌ Error in ${file}:`);
        console.error(e.stderr.toString());
        hasError = true;
    }
}

// Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });

if (hasError) {
    console.error('Validation failed!');
    process.exit(1);
} else {
    console.log('✅ All diagrams are valid.');
    process.exit(0);
}
