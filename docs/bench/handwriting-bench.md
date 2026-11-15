# Handwriting recognition benchmark — results

Run 2026-11-15 07:26 UTC in Chromium (WebAssembly, CPU), from `tests/bench/hand-bench.js`, on **150 real handwritten lines** from the IAM test split (Teklia/IAM-line test split; every 19th of 2915 lines, so many writers). Model load: 4.2 s (from the browser cache after the first download).

## Line level (each line image read on its own)

| Engine | CER (normalised, as the app reports it) | WER (normalised) | CER (exact characters) | Time per line |
|---|---|---|---|---|
| Handwriting model — TrOCR-small-handwritten (v18) | **15.2%** | **25.4%** | 16.2% | 2102 ms |
| Tesseract 5 (printed-text OCR, v12–v17) | 50.0% | 86.4% | 53.8% | 131 ms |

## Page level (three lines stacked into a page: segmentation + reading)

| Engine | Pages | Lines found correctly | CER | WER |
|---|---|---|---|---|
| Handwriting model (segmented into lines) | 30 | 30/30 pages split into exactly 3 lines | **6.5%** | **12.4%** |
| Tesseract (whole page) | 30 | — | 42.6% | 88.2% |

The page path is what the app runs: each line is evened out and cut to its ink before reading. Reading the same 90 lines as raw line images gives 12.6% (model) and 48.0% (Tesseract), so the cleaning step accounts for part of the difference.

## Image tools on simulated poor photos (handwriting model, CER)

| Problem | Pages | Before the editor's automatic fix | After (flatten light + auto levels, + denoise for the noisy pages) |
|---|---|---|---|
| Dim photo with a side shadow | 10 | 7.9% | 8.1% |
| Low contrast | 10 | 8.3% | 7.3% |
| Speckle noise (4% of pixels) | 10 | 84.1% | 8.5% |

## Is the confidence meaningful? (line level, handwriting model)

| Model confidence | Lines | Mean CER | Mean WER |
|---|---|---|---|
| 80–100% | 77 | 5.1% | 10.5% |
| 60–79% | 51 | 17.3% | 31.8% |
| 0–59% | 22 | 45.7% | 62.8% |

## Method and limits

- **CER / WER**: Levenshtein edit distance between the recognised text and the reference transcription, divided by the reference length in characters / words; averaged per line. "Normalised" ignores case, punctuation and spacing — the same function the Handwriting Check uses. "Exact characters" compares the text as written (IAM's tokenised spacing removed from the reference first).
- **Data**: real handwriting by many writers (IAM, English, scanned forms). It is *not* students' phone photos: real photos add perspective, shadows and blur that these scans do not have — the page-level and image-tool rows only partly simulate that. Results on students' own writing have **not** been validated.
- **Possible overlap**: TrOCR was fine-tuned by its authors on IAM. Their split may not match Teklia's test split exactly, so some test lines might have been seen in training; treat the TrOCR line-level number as optimistic.
- **English only**: TrOCR-handwritten reads English. Arabic and mixed pages still use Tesseract, and the page says so.
- Nothing here measures or judges the writer. Error rates describe the software.
