# DocVault

Ask questions about confidential contracts, letters and payslips without sending their contents to an online cloud service. DocVault is an Q&A app built with React Native and a small language model running offline on the phone.

- Import a PDF, photo, text file or pasted text
- Ask questions in plain language
- Get answers linked to the passages they came from
- Work offline after the model has been downloaded


## About the model 

DocVault uses Qwen2.5-1.5B-Instruct, quantized to `Q4_K_M` GGUF, and runs inference through `llama.rn`.

There is no cloud inference API in the answer pipeline. Once the model is downloaded, question answering is designed to work without Wi-Fi.

The model is approximately 1 GB, so it is downloaded on first launch rather than bundled into the APK. App includes download progress, speed, pause and resume, so an interrupted download doesn't have to start from scratch.

## Answers may need verification

A plausible answer is not necessarily a correct one, especially when it concerns a contract or payslip.

DocVault includes a few checks around model output:

- **Refuse when retrieval finds too little.** If the best passage has insufficient overlap with the question, the app declines to answer instead of asking the model to guess.
- **Keep citations tied to retrieved text.** Citation numbers that do not correspond to available passages are removed.
- **Provide a fallback source.** If an answer contains no citation, the best retrieved passage is attached.
- **Flag unsupported numbers.** Numbers in an answer that do not appear in its cited text are flagged for the user to check.

These are guardrails, not a guarantee of correctness. A model can still misunderstand a passage or produce an incorrect explanation, so the source text remains available for verification.


## The engineering details

A few implementation choices are specifically aimed at mobile constraints.

- **Quantized inference:** `Q4_K_M` reduces model storage and memory requirements compared with higher-precision weights.
- **Memory-mapped weights:** `use_mmap` is enabled and `use_mlock` is disabled, allowing the operating system to reclaim file-backed pages under memory pressure.
- **Bounded context:** the context window is set to 3072 tokens, with one inference sequence and a batch size of 512.
- **CPU-first execution:** four threads are configured by default. An experimental OpenCL path is available in `llama.rn`, but GPU execution has not been tested for this project.
- **Resumable model downloads:** partial files use HTTP Range requests, and completed downloads are checked against the expected file size before being renamed.
- **Recoverable model failures:** an unusable downloaded model can be deleted and downloaded again.
- **Small application package:** the Android build targets `arm64-v8a` and uses the package's prebuilt native libraries rather than compiling llama.cpp in CI.

The settings are configurable in `src/config.ts` and `src/services/llm.ts`. Actual performance and memory usage still need to be measured on physical devices.

## Stack

- React Native CLI 0.76
- TypeScript
- Qwen2.5-1.5B-Instruct — `Q4_K_M` GGUF
- `llama.rn` — on-device model inference
- Android `PdfRenderer` — native PDF page rendering
- Google ML Kit — text recognition

### Requirements

- An ARM64 Android device 
- Network access for the initial model download


## To Run

### Install dependencies

```bash
npm install
```

### Start Metro

```bash
npm start
```

### Build and install on Android

```bash
npm run android
```


## Limits

- Questions should be asked in the same language as the document. Retrieval is word-based, so cross-language question answering is not supported reliably.
- Citation checks help trace answers to source text but do not prove that an answer is correct.
- The app reports what a document appears to say; it does not determine whether a contract clause is legally valid.
`

## Disclaimer

This is a document-reading experiment, not legal, financial or professional advice. Always verify important answers against the original document.

The goal is to make private document search practical on a phone, with fewer unnecessary uploads and more ways to check where an answer came from.
