import subprocess
import shutil
import tempfile
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

LANG_COMMANDS = {
    "python": ["python3", "--version"],
    "java": ["java", "-version"],
    "cpp": ["g++", "--version"]
}

EXECUTORS = {
    "python": lambda code, input_text: run_python(code, input_text),
    "java": lambda code, input_text: run_java(code, input_text),
    "cpp": lambda code, input_text: run_cpp(code, input_text)
}

def detect_languages():
    result = {}
    for lang, cmd in LANG_COMMANDS.items():
        try:
            version = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().split('\n')[0]
            result[lang] = version
        except Exception as e:
            result[lang] = None
    return result

def run_python(code, input_text):
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(code)
        filepath = f.name
    try:
        result = subprocess.run(["python3", filepath], input=input_text.encode(), capture_output=True, timeout=5)
        return result.stdout.decode(), result.stderr.decode()
    finally:
        os.remove(filepath)

def run_cpp(code, input_text):
    with tempfile.TemporaryDirectory() as tempdir:
        source = os.path.join(tempdir, "main.cpp")
        binary = os.path.join(tempdir, "main.out")
        with open(source, "w") as f:
            f.write(code)
        compile_result = subprocess.run(["g++", source, "-o", binary], capture_output=True)
        if compile_result.returncode != 0:
            return "", compile_result.stderr.decode()
        run_result = subprocess.run([binary], input=input_text.encode(), capture_output=True, timeout=5)
        return run_result.stdout.decode(), run_result.stderr.decode()

def run_java(code, input_text):
    with tempfile.TemporaryDirectory() as tempdir:
        source_path = os.path.join(tempdir, "Main.java")
        with open(source_path, "w") as f:
            f.write(code)
        compile = subprocess.run(["javac", source_path], capture_output=True)
        if compile.returncode != 0:
            return "", compile.stderr.decode()
        run = subprocess.run(["java", "-cp", tempdir, "Main"], input=input_text.encode(), capture_output=True, timeout=5)
        return run.stdout.decode(), run.stderr.decode()

@app.route("/languages", methods=["GET"])
def get_languages():
    return jsonify(detect_languages())

@app.route("/execute", methods=["POST"])
def execute_code():
    data = request.json
    code = data.get("code")
    lang = data.get("language")
    input_text = data.get("input", "")

    if lang not in EXECUTORS:
        return jsonify({"error": "Unsupported language"}), 400

    stdout, stderr = EXECUTORS[lang](code, input_text)
    return jsonify({
        "stdout": stdout,
        "stderr": stderr
    })

if __name__ == "__main__":
    app.run(port=5050)
