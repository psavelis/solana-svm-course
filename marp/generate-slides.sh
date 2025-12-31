#!/bin/bash

# Generate Marp Slides Script
# This script generates PDF slides from all Marp markdown files
# Usage: ./generate-slides.sh [--merge]

MERGE_SLIDES=false

# Parse command line arguments
for arg in "$@"; do
    case $arg in
        --merge)
            MERGE_SLIDES=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--merge]"
            echo "  --merge    Also merge all PDFs into a single comprehensive document"
            exit 0
            ;;
    esac
done

echo "Generating Marp slides for Solana SVM Study Course"
echo "=================================================="

# Check if marp is installed
if ! command -v marp &> /dev/null; then
    echo "Marp CLI not found. Install with: npm install -g @marp-team/marp-cli"
    exit 1
fi

# Create output directory
mkdir -p slides

echo "📁 Generating slides..."

# Generate slides for each .md file
for file in *.md; do
    if [[ "$file" != "README.md" ]]; then
        echo "📄 Processing $file..."
        marp "$file" --pdf --output "slides/${file%.md}.pdf"
        if [ $? -eq 0 ]; then
            echo "Generated slides/${file%.md}.pdf"
        else
            echo "Failed to generate slides/${file%.md}.pdf"
        fi
    fi
done

echo ""
echo "Slide generation complete!"
echo "Slides saved in: slides/ directory"
echo ""
echo "Generated slides:"
ls -la slides/

# Merge slides if requested
if [[ "$MERGE_SLIDES" == "true" ]]; then
    echo ""
    echo "🔄 Merging all slides into one PDF..."
    echo "======================================"

    if command -v node &> /dev/null && [[ -f "merge-slides.js" ]]; then
        echo "Using Node.js merger..."
        node merge-slides.js
    elif [[ -f "merge-slides-bash.sh" ]]; then
        echo "Using Bash merger..."
        ./merge-slides-bash.sh
    else
        echo "❌ No merge script found. Run one of:"
        echo "   node merge-slides.js"
        echo "   ./merge-slides-bash.sh"
    fi
fi

echo ""
echo "To view slides, open the PDF files in your preferred PDF viewer"
echo "To customize output, edit the marp configuration in each .md file"