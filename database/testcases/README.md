# Test Cases

This directory contains test cases for coding problems. Each problem has its own subdirectory named after the problem slug.

## Directory Structure

```
testcases/
├── <problem-slug>/
│   ├── testcaseinput1.txt
│   ├── testcaseoutput1.txt
│   ├── testcaseinput2.txt
│   ├── testcaseoutput2.txt
│   └── ...
└── README.md
```

## File Naming Convention

- Input files: `testcaseinput<N>.txt`
- Output files: `testcaseoutput<N>.txt`

Where `<N>` is the test case number starting from 1.

## Adding Test Cases

1. Create a subdirectory for your problem using the problem slug
2. Add input and output files following the naming convention
3. Update the problem's JSON file to include the test case references

### Example Problem JSON

```json
{
  "name": "Print Z",
  "slug": "getting-started-print-z",
  "testCases": [
    {
      "input": "testcaseinput1.txt",
      "output": "testcaseoutput1.txt"
    },
    {
      "input": "testcaseinput2.txt", 
      "output": "testcaseoutput2.txt"
    }
  ]
}
```

## How It Works

1. When a problem has test cases defined, the Submit button becomes enabled
2. The frontend loads the first test case and allows users to edit it and add more test cases
3. When the user clicks Submit, the judge fetches all test cases from this directory
4. The judge runs the user's code against all test cases
5. Results are returned showing which test cases passed or failed
6. The judge caches test cases locally to avoid re-downloading them on subsequent submissions

## Test Case Format

- Input files should contain the input that will be fed to the user's program
- Output files should contain the expected output that the user's program should produce
- Both files should use plain text format
- Line endings are normalized during comparison 