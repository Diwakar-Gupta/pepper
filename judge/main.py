import subprocess
import shutil
import tempfile
import os
import difflib
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

def compare_outputs(actual, expected):
    # Split into lines, strip each line, ignore line ending differences
    actual_lines = [line.rstrip() for line in actual.strip().splitlines()]
    expected_lines = [line.rstrip() for line in expected.strip().splitlines()]
    passed = actual_lines == expected_lines
    diff = None
    if not passed:
        diff = '\n'.join(difflib.unified_diff(expected_lines, actual_lines, fromfile='expected', tofile='output', lineterm=''))
    return passed, diff

@app.route("/languages", methods=["GET"])
def get_languages():
    return jsonify(detect_languages())

@app.route("/execute", methods=["POST"])
def execute_code():
    data = request.json
    code = data.get("code")
    lang = data.get("language")
    test_cases = data.get("testCases", [])
    
    # For backward compatibility, if no test cases provided, use single input
    if not test_cases:
        input_text = data.get("input", "")
        test_cases = [{"input": input_text, "expectedOutput": ""}]

    if lang not in EXECUTORS:
        return jsonify({"error": "Unsupported language"}), 400

    results = []
    for i, test_case in enumerate(test_cases):
        input_text = test_case.get("input", "")
        expected_output = test_case.get("expectedOutput", "")

        try:
            stdout, stderr = EXECUTORS[lang](code, input_text)
            actual_output = stdout.strip()
            expected_output = expected_output.strip()
            passed, diff = (None, None)
            if expected_output:
                passed, diff = compare_outputs(actual_output, expected_output)
            results.append({
                "testCase": i + 1,
                "input": input_text,
                "expectedOutput": expected_output,
                "actualOutput": actual_output,
                "stderr": stderr,
                "passed": passed,
                "diff": diff,
                "error": None
            })
        except Exception as e:
            results.append({
                "testCase": i + 1,
                "input": input_text,
                "expectedOutput": expected_output,
                "actualOutput": "",
                "stderr": str(e),
                "passed": False,
                "diff": None,
                "error": str(e)
            })

    return jsonify({
        "results": results,
        "summary": {
            "total": len(results),
            "passed": sum(1 for r in results if r["passed"] is True),
            "failed": sum(1 for r in results if r["passed"] is False),
            "noExpectedOutput": sum(1 for r in results if r["passed"] is None)
        }
    })

# --- HTTPS cert generation and loading below ---

import pathlib

CERT_DIR = pathlib.Path("./cert")
CERT_DIR.mkdir(exist_ok=True)

CERT_PATH = CERT_DIR / "cert.pem"
KEY_PATH = CERT_DIR / "key.pem"

def generate_self_signed_cert():
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    import datetime

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"US"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"California"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, u"San Francisco"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"My Org"),
        x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
    ])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.utcnow())
        .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName([x509.DNSName(u"localhost")]),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )

    with open(CERT_PATH, "wb") as cert_file:
        cert_file.write(cert.public_bytes(serialization.Encoding.PEM))

    with open(KEY_PATH, "wb") as key_file:
        key_file.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))

def generate_or_load_cert():
    if CERT_PATH.exists() and KEY_PATH.exists():
        print("Using existing cert and key")
        return str(CERT_PATH), str(KEY_PATH)
    else:
        print("Generating new cert and key")
        generate_self_signed_cert()
        return str(CERT_PATH), str(KEY_PATH)

if __name__ == "__main__":
    cert_path, key_path = generate_or_load_cert()
    print(f"Starting HTTPS server on port 5050 with cert {cert_path} and key {key_path}")
    app.run(port=5050, ssl_context=(cert_path, key_path))
