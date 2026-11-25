# Knowledge base for the portfolio chatbot

Every answer the chatbot gives is grounded in the files in this folder — nothing else.
- Add or edit Markdown (`.md`) or text (`.txt`) files. Put your **CV as a PDF** here too (e.g. `Ali-Zain-CV.pdf`); it is converted with `pdftotext` at build time.
- Front matter line `section: #anchor` tells the chatbot which part of the site to link as the source.
- After any change run:  `node rag/build_index.mjs`  (writes `data/rag-index.json` + `data/rag-index.js`).
- Only write facts that are true. If something is not in these files, the chatbot says it does not know.
