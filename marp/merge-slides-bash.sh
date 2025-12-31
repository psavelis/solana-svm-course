#!/bin/bash

# Script to merge all Marp slide PDFs into a single document using pdftk
# Alternative to the Node.js merge-slides.js script

echo "🔄 Merging all Solana SVM Study Course slides (Bash version)..."
echo "================================================================"

# Check if pdftk is installed
if ! command -v pdftk &> /dev/null; then
    echo "❌ pdftk not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install pdftk-java
    else
        echo "❌ Homebrew not found. Please install pdftk manually:"
        echo "   brew install pdftk-java"
        echo "   or visit: https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/"
        exit 1
    fi
fi

# Define the order of slides for the complete course
SLIDES_DIR="slides"
OUTPUT_DIR="."

# Generate timestamp for filename
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_FILE="solana-svm-study-course-complete-${TIMESTAMP}.pdf"

echo "📂 Slides directory: $SLIDES_DIR"
echo "📄 Output file: $OUTPUT_FILE"

# Build the list of PDF files in order
PDF_FILES=(
    "$SLIDES_DIR/course-overview.pdf"
    "$SLIDES_DIR/study-topics.pdf"
    "$SLIDES_DIR/implementation-tasks.pdf"
    "$SLIDES_DIR/01-accounts-programs.pdf"
    "$SLIDES_DIR/02-transactions-instructions.pdf"
    "$SLIDES_DIR/03-token-standards.pdf"
    "$SLIDES_DIR/04-account-abstraction.pdf"
    "$SLIDES_DIR/05-fee-mechanism.pdf"
    "$SLIDES_DIR/06-consensus-validation.pdf"
    "$SLIDES_DIR/07-signing-cryptography.pdf"
    "$SLIDES_DIR/08-mpc.pdf"
    "$SLIDES_DIR/09-svm.pdf"
    "$SLIDES_DIR/10-cpis.pdf"
    "$SLIDES_DIR/11-events-logging.pdf"
    "$SLIDES_DIR/12-security-practices.pdf"
    "$SLIDES_DIR/13-development-tools.pdf"
    "$SLIDES_DIR/14-network-architecture.pdf"
    "$SLIDES_DIR/15-advanced-features.pdf"
)

# Check if all files exist
MISSING_FILES=()
for pdf in "${PDF_FILES[@]}"; do
    if [[ ! -f "$pdf" ]]; then
        MISSING_FILES+=("$pdf")
    fi
done

if [[ ${#MISSING_FILES[@]} -gt 0 ]]; then
    echo "❌ Missing PDF files:"
    for missing in "${MISSING_FILES[@]}"; do
        echo "   - $missing"
    done
    echo ""
    echo "💡 Run ./generate-slides.sh first to generate all PDFs"
    exit 1
fi

# Merge PDFs using pdftk
echo "🔄 Merging PDFs..."
pdftk "${PDF_FILES[@]}" cat output "$OUTPUT_FILE"

if [[ $? -eq 0 ]]; then
    echo ""
    echo "✅ PDF merge complete!"
    echo "======================"
    echo "📊 Total PDFs merged: ${#PDF_FILES[@]}"
    echo "📁 Output file: $OUTPUT_FILE"

    # Get file size
    FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "0")
    FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc 2>/dev/null || echo "Unknown")
    echo "📏 File size: $FILE_SIZE_MB MB"

    echo ""
    echo "🎯 Ready for distribution!"
    echo "==========================="
    echo "The complete Solana SVM Study Course is now available as a single PDF document."
else
    echo "❌ Error merging PDFs"
    exit 1
fi