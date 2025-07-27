#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "========================================"
echo "   🎯 Pepper Judge Setup for Linux/macOS"
echo "========================================"
echo -e "${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get Python command
get_python_cmd() {
    if command_exists python3; then
        echo "python3"
    elif command_exists python; then
        # Check if it's Python 3
        if python -c "import sys; exit(0 if sys.version_info[0] == 3 else 1)" 2>/dev/null; then
            echo "python"
        else
            echo ""
        fi
    else
        echo ""
    fi
}

echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check Python
PYTHON_CMD=$(get_python_cmd)
if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}❌ Python 3.8+ is not installed or not in PATH${NC}"
    echo "Please install Python 3.8+ from https://www.python.org/downloads/"
    echo "Or use your package manager:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install python3 python3-pip python3-venv"
    echo "  CentOS/RHEL: sudo yum install python3 python3-pip"
    echo "  macOS: brew install python3"
    exit 1
fi

# Verify Python version
PYTHON_VERSION=$($PYTHON_CMD -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo -e "${RED}❌ Python version $PYTHON_VERSION found, but 3.8+ is required${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Python $PYTHON_VERSION found${NC}"

# Check Java
if ! command_exists java; then
    echo -e "${RED}❌ Java is not installed or not in PATH${NC}"
    echo "Please install JDK 8+ from https://adoptium.net/"
    echo "Or use your package manager:"
    echo "  Ubuntu/Debian: sudo apt install default-jdk"
    echo "  CentOS/RHEL: sudo yum install java-11-openjdk-devel"
    echo "  macOS: brew install openjdk"
    exit 1
fi

echo -e "${GREEN}✅ Java found${NC}"

# Check GCC/G++
if ! command_exists g++; then
    echo -e "${RED}❌ GCC/G++ is not installed or not in PATH${NC}"
    echo "Please install build tools:"
    echo "  Ubuntu/Debian: sudo apt install build-essential"
    echo "  CentOS/RHEL: sudo yum groupinstall 'Development Tools'"
    echo "  macOS: xcode-select --install"
    exit 1
fi

echo -e "${GREEN}✅ GCC/G++ found${NC}"
echo

# Create directory
echo -e "${BLUE}📁 Creating pepper-judge directory...${NC}"
mkdir -p pepper-judge
cd pepper-judge

# Download files
echo -e "${BLUE}📥 Downloading judge files...${NC}"

echo "Downloading main.py..."
if ! curl -s -O https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/main.py; then
    echo -e "${RED}❌ Failed to download main.py${NC}"
    echo "Please check your internet connection"
    exit 1
fi

echo "Downloading requirements.txt..."
if ! curl -s -O https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/requirements.txt; then
    echo -e "${RED}❌ Failed to download requirements.txt${NC}"
    echo "Please check your internet connection"
    exit 1
fi

echo -e "${GREEN}✅ Files downloaded successfully!${NC}"
echo

# Create virtual environment
echo -e "${BLUE}🐍 Creating Python virtual environment...${NC}"
if ! $PYTHON_CMD -m venv venv; then
    echo -e "${RED}❌ Failed to create virtual environment${NC}"
    echo "You might need to install python3-venv:"
    echo "  Ubuntu/Debian: sudo apt install python3-venv"
    exit 1
fi

# Activate virtual environment
echo -e "${BLUE}🔄 Activating virtual environment...${NC}"
source venv/bin/activate

# Upgrade pip
echo -e "${BLUE}📦 Upgrading pip...${NC}"
python -m pip install --upgrade pip --quiet

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
if ! pip install -r requirements.txt --quiet; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    echo "Try running: pip install -r requirements.txt"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
echo

# Create run script
echo -e "${BLUE}📝 Creating run script...${NC}"
cat > run-judge.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
python main.py
EOF

chmod +x run-judge.sh

echo -e "${GREEN}"
echo "========================================"
echo "   🎉 Setup Complete!"
echo "========================================"
echo -e "${NC}"
echo
echo "To start the Pepper Judge:"
echo "  1. Run: ./run-judge.sh OR"
echo "  2. Run: source venv/bin/activate && python main.py"
echo
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "  1. Run the judge server"
echo "  2. Copy the 8-character judge code displayed"
echo "  3. Enter this code in the Pepper web application"
echo
echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
echo "  - If you get errors, check the console output"
echo "  - Make sure all prerequisites are properly installed"
echo "  - Visit: https://github.com/Diwakar-Gupta/pepper/issues"
echo

# Ask if user wants to start the judge now
echo -n -e "${CYAN}🚀 Would you like to start the judge now? (y/n): ${NC}"
read -r start_now

if [[ $start_now =~ ^[Yy]$ ]]; then
    echo
    echo -e "${BLUE}Starting Pepper Judge...${NC}"
    python main.py
else
    echo
    echo "You can start the judge later by running './run-judge.sh'"
fi
