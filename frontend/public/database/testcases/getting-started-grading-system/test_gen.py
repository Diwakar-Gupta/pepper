import json
import os

# Create output directory if it doesn't exist
os.makedirs("testcases", exist_ok=True)

# Test cases to cover each rule clearly
test_cases = [
    (95, "excellent"),           # > 90
    (90, "good"),                # = 90
    (85, "good"),                # > 80 and <= 90
    (80, "fair"),                # = 80
    (75, "fair"),                # > 70 and <= 80
    (70, "meets expectations"),  # = 70
    (65, "meets expectations"),  # > 60 and <= 70
    (60, "below par"),           # = 60
    (45, "below par")            # < 60
]

testcase_list = []

for i, (mark, expected_output) in enumerate(test_cases, start=1):
    input_filename = f"testcaseinput{i}.txt"
    output_filename = f"testcaseoutput{i}.txt"

    with open(input_filename, "w") as infile:
        infile.write(str(mark))

    with open(output_filename, "w") as outfile:
        outfile.write(expected_output)

    testcase_list.append({
        "input": input_filename,
        "output": output_filename
    })

# Write JSON mapping
with open("testcases.json", "w") as json_file:
    json.dump(testcase_list, json_file, indent=4)

print("✅ Test cases generated successfully in 'testcases/' folder.")
