import os
import random
import string
from config import JUDGE_CODE_FILE


def generate_judge_code():
    """Generate 8-character alphanumeric code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(8))


def format_judge_code(code):
    """Format code as XXXX-XXXX"""
    return f"{code[:4]}-{code[4:]}"


def get_or_create_judge_code():
    """Get existing code or create new one"""
    if os.path.exists(JUDGE_CODE_FILE):
        with open(JUDGE_CODE_FILE, 'r') as f:
            code = f.read().strip()
            if len(code) == 8 and code.isalnum():
                return code
    
    # Generate new code
    code = generate_judge_code()
    with open(JUDGE_CODE_FILE, 'w') as f:
        f.write(code)
    return code
