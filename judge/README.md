# Pepper Judge Backend

> 🚀 **Local code execution backend for the Pepper DSA Learning Platform**

The Pepper Judge is a secure local server that executes user code submissions in multiple programming languages. It communicates with the frontend web application via WebRTC for real-time code execution and testing.

## 🚨 First Time User? Seeing "Code Editor Unavailable"?

**If you see this message on the website:**
> Code Editor Unavailable
> 
> Please connect to the judge server using the connection panel in the top-right corner.

**Follow these 2 simple steps:**

### Step 1: 🏃‍♂️ Run the Local Judge Server
1. Use the [Quick Start](#-quick-start-automated-setup) section below to set up the judge
2. The judge will display an 8-character code (e.g., `ABCD-1234`)
3. Keep the judge running in your terminal

### Step 2: 🔗 Connect to the Judge in Your Browser
1. Go to the Pepper website
2. Click the **connection panel** in the **top-right corner**
3. Enter the 8-character code from your judge
4. Click "Connect"
5. ✅ The code editor should now be available!

**Need help?** Continue reading for detailed setup instructions below. ⬇️

---

## 🎯 Quick Start (Automated Setup)

> **New in v2.0**: Setup now uses Git to clone only the judge folder, making it faster and more efficient!

### Windows Users
```cmd
# Download and run the Windows setup script
curl -O https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/setup-judge-win.bat
setup-judge-win.bat
```

### Linux/macOS Users
```bash
# Download and run the Linux setup script
curl -O https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/setup-judge-linux.sh
chmod +x setup-judge-linux.sh
./setup-judge-linux.sh
```

### What's New?
- ✨ **Smart Cloning**: Only downloads the judge folder (not the entire heavy repository)
- 🔄 **Auto-Updates**: Each time you run the judge, it automatically updates to the latest version
- 🚀 **Faster Setup**: Reduced download size and improved performance
- 🛡️ **Git-Based**: More reliable than direct file downloads

## 📋 Prerequisites

Before running the judge, ensure you have the following installed:

### Required Software
- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)

### Verify Installation
Run these commands to verify your setup:
```bash
python3 --version    # Should show Python 3.8+
```

## 🛠️ Manual Setup

If you prefer to set up manually or the automated scripts don't work:

### Step 1: Download Files
```bash
# Create a directory for the judge
mkdir pepper-judge && cd pepper-judge

# Download required files
curl -O https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/main.py
curl -O https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/requirements.txt
```

### Step 2: Create Virtual Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate

# Linux/macOS:
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Run the Judge
```bash
python main.py
```

## 🔧 Configuration

### Judge Code
When you first run the judge, it will:
1. Generate a unique 8-character judge code (e.g., `ABCD-1234`)
2. Save this code to `.judge_code` file
3. Display the code in the terminal

**Important:** You'll need this code to connect the frontend to your local judge.

### Test Case Caching
The judge automatically caches test cases in the `.test_cases_cache` directory to avoid re-downloading them on subsequent submissions. This improves performance and reduces network usage.

### Signaling Server
The judge connects to a signaling server for WebRTC communication. The default server is:
```
https://pepper-isjb.onrender.com
```

To use a different signaling server, modify the `SIGNALING_SERVER_URL` in `main.py`.

## ✨ Features

- 🔒 **Secure Code Execution** - Runs user code in isolated temporary environments
- 🌐 **WebRTC Communication** - Real-time communication with the frontend
- 🚀 **Multi-language Support** - Execute code in Python, Java, and C++
- 🧪 **Test Case Validation** - Compare outputs with expected results
- 💾 **Test Case Caching** - Caches test cases locally for faster subsequent runs
- ⚡ **Fast Execution** - Optimized for quick code testing and validation
- 🔄 **Auto-reconnection** - Handles connection drops gracefully

## 🗣️ Supported Languages

| Language | Version | Compiler/Interpreter |
|----------|---------|---------------------|
| **Python** | 3.8+ | `python3` |
| **Java** | 8+ | `javac` + `java` |
| **C++** | C++11+ | `g++` |

## 🚀 Usage

1. **Start the Judge**: Run `python main.py` in your terminal
2. **Note the Judge Code**: Copy the 8-character code displayed (e.g., `ABCD-1234`)
3. **Connect Frontend**: Enter this code in the Pepper web application
4. **Execute Code**: Submit code through the web interface for execution

### Expected Output
When the judge starts successfully, you should see:
```
🎯 Pepper Judge Server Starting...
📋 Detected Languages:
   ✅ Python: Python 3.9.7
   ✅ Java: openjdk version "11.0.16"
   ✅ C++: g++ (GCC) 9.4.0

🔑 Judge Code: ABCD-1234
💾 Code saved to .judge_code

🌐 Connecting to signaling server...
✅ Connected to signaling server
🎧 Waiting for frontend connections...
```

## 🔧 Troubleshooting

### Common Issues

**❌ "Command not found" errors**
- Ensure Python, Java, and GCC are installed and in your PATH
- Try `python` instead of `python3` on Windows
- Restart your terminal after installing new software

**❌ "Permission denied" errors**
- On Linux/macOS: Make sure you have execute permissions
- Try running with `sudo` if necessary (not recommended for security)

**❌ "Connection failed" errors**
- Check your internet connection
- Verify the signaling server URL is accessible
- Try restarting the judge

**❌ "Port already in use" errors**
- Another judge instance might be running
- Kill existing processes: `pkill -f "python.*main.py"`

### Getting Help

If you encounter issues:
1. Check the [troubleshooting section](#-troubleshooting) above
2. Look at the console output for error messages
3. Create an issue on the [GitHub repository](https://github.com/Diwakar-Gupta/pepper/issues)

## ⚠️ Security Note

**Important**: This server executes arbitrary code submitted by users. For security:
- ✅ Only run on trusted, isolated machines
- ✅ Don't run on production servers
- ✅ Use in development/learning environments only
- ❌ Never run with elevated privileges
- ❌ Don't expose to public networks

## 🤝 Contributing

We welcome contributions! Here's how you can help:

- 🐛 **Report Bugs**: Create issues for any problems you find
- 💡 **Suggest Features**: Share ideas for improvements
- 🔧 **Submit PRs**: Fix bugs or add new features
- 📚 **Improve Docs**: Help make the documentation better

See the main [README](../README.md) for detailed contribution guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details. 
