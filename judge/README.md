# Pepper Judge Backend

## Quick Setup

1. 📥 Download required files
   Using curl:
   ```bash
   # Create a directory for the judge
   mkdir pepper-judge && cd pepper-judge

   # Download only the required files
   curl -O https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/main.py
   curl -O https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/requirements.txt
   ```

   Or using wget:
   ```bash
   mkdir pepper-judge && cd pepper-judge

   wget https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/main.py
   wget https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/requirements.txt
   ```

2. 🐍 Set up Python environment
   ```bash
   # Create a virtual environment
   python -m venv venv
   
   # Activate the environment
   # Windows:
   venv\Scripts\activate
   
   # macOS/Linux:
   source venv/bin/activate
   ```

3. 📦 Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

4. 🚀 Run the Judge Server
   ```bash
   python main.py
   ```

This is the local code execution backend for the Pepper DSA Learning Platform. It allows users to run code (Java, Python, C++) from the frontend web app.

## Features
- Securely execute user code in Java, Python, and C++
- Communicates with the frontend via HTTP API

## Supported Languages
- Java
- Python
- C++

## Usage
- The frontend will connect to this server for code execution.
- Make sure the judge is running locally when using the code execution feature on the web app.

## Security Note
- This server executes arbitrary code. Run it only on trusted machines.

## Contributing

Improvements and bugfixes are welcome! See the main [README](../README.md) for details. 
