# Marp Slides for Solana SVM Study Course

This folder contains Marp-compatible slide decks for the comprehensive Solana SVM Study Course.

## Available Slide Decks

### Course Overview
- **`course-overview.md`** - Complete course curriculum, learning objectives, and repository structure

### Study Topics
- **`study-topics.md`** - Detailed study topics with EVM comparisons and design patterns

### Implementation Tasks
- **`implementation-tasks.md`** - Complete task breakdown with status tracking and priorities

### Module Slides
- **`01-accounts-programs.md`** - Accounts and Programs architecture
- **`02-transactions-instructions.md`** - Transactions and Instructions implementation
- **`03-token-standards.md`** - SPL Token standards and operations
- **`08-mpc.md`** - Multi-Party Computation and threshold cryptography
- **`09-svm.md`** - Solana Virtual Machine runtime and program execution

## Generated Slides

All slide decks have been generated and are available in the `slides/` directory:
- `course-overview.pdf` (21 slides)
- `study-topics.pdf` (39 slides)
- `implementation-tasks.pdf` (25 slides)
- `01-accounts-programs.pdf` (17 slides)
- `02-transactions-instructions.pdf` (21 slides)
- `03-token-standards.pdf` (20 slides)
- `08-mpc.pdf` (22 slides)
- `09-svm.pdf` (23 slides)

**Total: 8 slide decks, 188 slides**

## How to Use

### Option 1: Generate All Slides at Once
```bash
# Make script executable (first time only)
chmod +x generate-slides.sh

# Generate all slides
./generate-slides.sh
```

This will create a `slides/` directory with PDF files for all presentations.

### Option 2: Generate Individual Slides
```bash
# Install Marp CLI
npm install -g @marp-team/marp-cli

# Generate specific PDF
marp course-overview.md --pdf

# Generate HTML slides
marp course-overview.md --html

# Generate all PDFs manually
for file in *.md; do
  marp "$file" --pdf
done
```

### Generate All Slides
```bash
# Create PDFs for all slide decks
./generate-slides.sh
```

## Slide Structure

Each slide deck follows a consistent structure:
- **Title Slide**: Module name and overview
- **Core Concepts**: Key learning objectives
- **Architecture Diagrams**: Mermaid diagrams showing system design
- **API Endpoints**: Available REST endpoints
- **Database Schema**: Entity relationships and fields
- **Implementation Examples**: Code samples and patterns
- **Security Considerations**: Best practices and risks
- **Next Steps**: Related modules and future work

## Marp Configuration

All slides use the following Marp configuration:
- **Theme**: Default
- **Size**: 16:9 (widescreen)
- **Pagination**: Enabled
- **Headers/Footers**: Custom per deck

## Integration with Course

These slides complement the main course documentation:
- **[COURSE.md](../docs/COURSE.md)** - Course curriculum
- **[STUDY.md](../docs/STUDY.md)** - Detailed study topics
- **[TASKS.md](../docs/TASKS.md)** - Implementation tasks
- **[diagrams/](../docs/diagrams/)** - Architecture diagrams

## Development

### Adding New Slides
1. Create new `.md` file with Marp front matter
2. Follow the established slide structure
3. Include Mermaid diagrams where appropriate
4. Add to this README

### Slide Best Practices
- Keep slides focused (7-10 lines max)
- Use consistent formatting
- Include code examples for technical content
- Add navigation between related modules
- Include Q&A sections at the end

## Export Formats

### PDF Generation
```bash
marp input.md --pdf --output output.pdf
```

### HTML Export
```bash
marp input.md --html --output output.html
```

### PowerPoint/PPTX
```bash
marp input.md --pptx --output output.pptx
```

## Course Status

This slide collection represents a **nearly complete** implementation of the Solana SVM Study Course:

### ✅ Completed Features
- Full NestJS API with Solana integration
- Kubernetes production deployment
- Advanced cryptographic features (MPC)
- Complete SVM implementation
- Event-driven architecture with Kafka
- Security best practices
- Monitoring and observability (Prometheus/Grafana)
- Comprehensive testing (>80% coverage)

### 🚧 Remaining Tasks
- Enhanced token operations
- Advanced transaction features
- Additional comprehensive testing
- Performance optimizations
- Multi-network support

### 📊 Project Metrics
- **186+ files** committed
- **8 slide decks** created
- **188 slides** total
- **15 core modules** implemented
- **85%+ completion** rate

## Contributing

When adding new slide content:
1. Follow the established naming convention
2. Update this README with the new deck
3. Test PDF generation
4. Ensure Mermaid diagrams render correctly
5. Add cross-references to related modules

## Resources

- [Marp Documentation](https://marp.app/)
- [Mermaid Diagrams](https://mermaid-js.github.io/)
- [Solana Documentation](https://docs.solana.com/)
- [SPL Token Docs](https://spl.solana.com/)