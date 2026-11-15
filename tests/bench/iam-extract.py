# Extracts a fixed, reproducible sample of handwritten lines from the IAM test split for the handwriting benchmark.
# Source: the Teklia/IAM-line dataset on Hugging Face (IAM Handwriting Database, Marti & Bunke 2002). The images are
# NOT committed to this repository; run this once to fetch them into tests/bench/.data/iam/ (git-ignored).
#   curl -L -o /tmp/iam-test.parquet https://huggingface.co/datasets/Teklia/IAM-line/resolve/main/data/test.parquet
#   python3 tests/bench/iam-extract.py /tmp/iam-test.parquet
import sys, os, json, pyarrow.parquet as pq
src = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 150
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.data', 'iam'); os.makedirs(out, exist_ok=True)
t = pq.read_table(src); n = t.num_rows; step = n // N  # every step-th line: spread across writers and forms, no cherry-picking
rows = []
for k in range(N):
    r = t.slice(k * step, 1).to_pylist()[0]
    name = f'line{k:03d}.png'
    with open(os.path.join(out, name), 'wb') as f: f.write(r['image']['bytes'])
    rows.append({'file': name, 'index': k * step, 'text': r['text']})
json.dump({'source': 'Teklia/IAM-line test split', 'rows_in_split': n, 'step': step, 'lines': rows}, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
print(len(rows), 'lines written to', out)
