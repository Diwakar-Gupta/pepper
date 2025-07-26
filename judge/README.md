# Pepper Judge Backend

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Diwakar-Gupta/pepper.git
   cd pepper/judge
   ```
2. **Set up Python environment:**
   - (Recommended) Create a virtual environment:
     ```bash
     python -m venv venv
     # On Windows:
     venv\Scripts\activate
     # On macOS/Linux:
     source venv/bin/activate
     ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the judge server:**
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