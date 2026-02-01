#!/bin/bash

# Gemini Risk Analyzer
# This tool uses Gemini CLI to analyze code changes and identify risks

set -e

# Configuration
GEMINI_BIN="gemini"
OUTPUT_DIR=".agency/LOGS"
RISKS_FILE=".agency/RISKS.md"
KNOWLEDGE_FILE=".agency/KNOWLEDGE.md"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Gemini CLI is available
check_gemini() {
    if ! command -v $GEMINI_BIN &> /dev/null; then
        log_error "Gemini CLI not found. Please install it first."
        exit 1
    fi
    log_success "Gemini CLI found at $(which $GEMINI_BIN)"
}

# Function to analyze repository for risks
analyze_repo_risks() {
    log_info "Analyzing repository for risks..."
    
    local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S")
    local output_file="$OUTPUT_DIR/gemini-risk-analysis-$(date +%Y%m%d-%H%M%S).txt"
    
    # Create the analysis prompt
    local prompt="Analyze this codebase for potential risks. Focus on:
1. Breaking changes in dependencies
2. Security vulnerabilities
3. Performance bottlenecks
4. Regression-prone areas
5. Complex coupling between modules
6. Missing error handling
7. Data integrity risks

Provide a structured risk assessment with:
- Risk ID
- Severity (CRITICAL/HIGH/MEDIUM/LOW)
- Category (Technical/Security/Performance/Compliance)
- Description
- Impact
- Affected files/components
- Recommended mitigation

Current file structure:
$(find . -type f -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | head -50)
"
    
    log_info "Calling Gemini CLI for risk analysis..."
    
    # Call Gemini and capture output
    if $GEMINI_BIN "$prompt" > "$output_file" 2>&1; then
        log_success "Risk analysis completed"
        log_info "Output saved to: $output_file"
        
        # Display the output
        echo ""
        echo "=== GEMINI RISK ANALYSIS ==="
        cat "$output_file"
        echo "============================"
        echo ""
        
        return 0
    else
        log_error "Gemini analysis failed"
        return 1
    fi
}

# Function to analyze specific files for risks
analyze_files() {
    local files="$@"
    
    if [ -z "$files" ]; then
        log_error "No files specified for analysis"
        return 1
    fi
    
    log_info "Analyzing specific files for risks: $files"
    
    local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S")
    local output_file="$OUTPUT_DIR/gemini-file-analysis-$(date +%Y%m%d-%H%M%S).txt"
    
    # Build file contents for analysis
    local file_contents=""
    for file in $files; do
        if [ -f "$file" ]; then
            file_contents="$file_contents\n\n=== File: $file ===\n$(cat $file)"
        fi
    done
    
    local prompt="Analyze these code files for potential risks and issues:
$file_contents

Focus on:
1. Breaking changes
2. Security vulnerabilities
3. Performance issues
4. Error handling gaps
5. Ripple effects on other components
6. Test coverage gaps

Provide specific, actionable risk assessments."
    
    log_info "Calling Gemini CLI for file analysis..."
    
    if $GEMINI_BIN "$prompt" > "$output_file" 2>&1; then
        log_success "File analysis completed"
        log_info "Output saved to: $output_file"
        
        echo ""
        echo "=== GEMINI FILE ANALYSIS ==="
        cat "$output_file"
        echo "============================"
        echo ""
        
        return 0
    else
        log_error "Gemini analysis failed"
        return 1
    fi
}

# Function to analyze dependencies
analyze_dependencies() {
    log_info "Analyzing dependencies for risks..."
    
    local output_file="$OUTPUT_DIR/gemini-dependency-analysis-$(date +%Y%m%d-%H%M%S).txt"
    
    # Check for package.json
    if [ ! -f "package.json" ]; then
        log_warning "No package.json found"
        return 1
    fi
    
    local prompt="Analyze this package.json for dependency risks:

$(cat package.json)

Focus on:
1. Outdated packages with known vulnerabilities
2. Breaking changes in major version updates
3. Dependency conflicts
4. Unused dependencies
5. Missing peer dependencies
6. License compliance issues

Provide specific recommendations."
    
    log_info "Calling Gemini CLI for dependency analysis..."
    
    if $GEMINI_BIN "$prompt" > "$output_file" 2>&1; then
        log_success "Dependency analysis completed"
        log_info "Output saved to: $output_file"
        
        echo ""
        echo "=== GEMINI DEPENDENCY ANALYSIS ==="
        cat "$output_file"
        echo "=================================="
        echo ""
        
        return 0
    else
        log_error "Gemini analysis failed"
        return 1
    fi
}

# Function to analyze git diff for risks
analyze_diff() {
    log_info "Analyzing recent changes for risks..."
    
    local output_file="$OUTPUT_DIR/gemini-diff-analysis-$(date +%Y%m%d-%H%M%S).txt"
    
    # Get recent diff
    local diff_output=$(git diff HEAD~1..HEAD 2>/dev/null || echo "No git repository or no commits")
    
    if [ "$diff_output" = "No git repository or no commits" ]; then
        log_warning "No git diff available"
        return 1
    fi
    
    local prompt="Analyze this git diff for potential risks:

$diff_output

Focus on:
1. Breaking API changes
2. Removed error handling
3. Security regressions
4. Performance degradations
5. Missing tests for new code
6. Ripple effects on dependent code

Provide specific risk assessments."
    
    log_info "Calling Gemini CLI for diff analysis..."
    
    if $GEMINI_BIN "$prompt" > "$output_file" 2>&1; then
        log_success "Diff analysis completed"
        log_info "Output saved to: $output_file"
        
        echo ""
        echo "=== GEMINI DIFF ANALYSIS ==="
        cat "$output_file"
        echo "============================"
        echo ""
        
        return 0
    else
        log_error "Gemini analysis failed"
        return 1
    fi
}

# Main function
main() {
    log_info "Gemini Risk Analyzer"
    echo ""
    
    # Check prerequisites
    check_gemini
    
    # Create output directory if it doesn't exist
    mkdir -p "$OUTPUT_DIR"
    
    # Parse command
    case "${1:-repo}" in
        repo)
            analyze_repo_risks
            ;;
        files)
            shift
            analyze_files "$@"
            ;;
        deps|dependencies)
            analyze_dependencies
            ;;
        diff)
            analyze_diff
            ;;
        *)
            echo "Usage: $0 [command] [args]"
            echo ""
            echo "Commands:"
            echo "  repo              - Analyze entire repository for risks (default)"
            echo "  files <files...>  - Analyze specific files"
            echo "  deps              - Analyze dependencies"
            echo "  diff              - Analyze recent git changes"
            echo ""
            echo "Examples:"
            echo "  $0 repo"
            echo "  $0 files src/app.ts src/utils.ts"
            echo "  $0 deps"
            echo "  $0 diff"
            exit 1
            ;;
    esac
    
    log_success "Analysis complete!"
}

# Run main function
main "$@"
