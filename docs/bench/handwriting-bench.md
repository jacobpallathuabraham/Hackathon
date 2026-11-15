# Handwriting recognition benchmark — results

Run 2026-11-15 06:59 UTC in Chromium (WebAssembly, CPU), from `tests/bench/hand-bench.js`, on **9 real handwritten lines** from the IAM test split (Teklia/IAM-line test split; every 19th of 2915 lines, so many writers). Model load: 4.7 s (from the browser cache after the first download).

## Line level (each line image read on its own)

| Engine | CER (normalised, as the app reports it) | WER (normalised) | CER (exact characters) | Time per line |
|---|---|---|---|---|
| Handwriting model — TrOCR-small-handwritten (v18) | **5.0%** | **10.3%** | 8.2% | 2152 ms |
| Tesseract 5 (printed-text OCR, v12–v17) | 43.1% | 86.8% | 48.4% | 146 ms |

## Page level (three lines stacked into a page: segmentation + reading)

| Engine | Pages | Lines found correctly | CER | WER |
|---|---|---|---|---|
| Handwriting model (segmented into lines) | 3 | 3/3 pages split into exactly 3 lines | **7.5%** | **13.2%** |
| Tesseract (whole page) | 3 | — | 34.2% | 92.4% |

## Image tools on simulated poor photos (handwriting model, CER)

| Problem | Pages | Before the editor's automatic fix | After (flatten light + auto levels, + denoise for the noisy pages) |
|---|---|---|---|
| Dim photo | 3 | 6.1% | 6.9% |
| Low contrast | 3 | 6.8% | 5.3% |
| Speckle noise (4% of pixels) | 3 | 62.3% | 7.8% |

## Is the confidence meaningful? (line level, handwriting model)

| Model confidence | Lines | Mean CER | Mean WER |
|---|---|---|---|
| 80–100% | 6 | 1.9% | 3.3% |
| 60–79% | 3 | 11.1% | 24.1% |
| 0–59% | 0 | — | — |

## Method and limits

- **CER / WER**: Levenshtein edit distance between the recognised text and the reference transcription, divided by the reference length in characters / words; averaged per line. "Normalised" ignores case, punctuation and spacing — the same function the Handwriting Check uses. "Exact characters" compares the text as written (IAM's tokenised spacing removed from the reference first).
- **Data**: real handwriting by many writers (IAM, English, scanned forms). It is *not* students' phone photos: real photos add perspective, shadows and blur that these scans do not have — the page-level and image-tool rows only partly simulate that. Results on students' own writing have **not** been validated.
- **Possible overlap**: TrOCR was fine-tuned by its authors on IAM. Their split may not match Teklia's test split exactly, so some test lines might have been seen in training; treat the TrOCR line-level number as optimistic.
- **English only**: TrOCR-handwritten reads English. Arabic and mixed pages still use Tesseract, and the page says so.
- Nothing here measures or judges the writer. Error rates describe the software.
