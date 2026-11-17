# Write-up

A technical write-up of SLLAB: the architecture, Fixture by SLLAB on iOS and the web, the club sites, the data model and its access rules, Film by SLLAB and its tracking mount, engineering practice, and the roadmap.

- **Read it:** [`sllab.pdf`](sllab.pdf)
- **Source:** [`sllab.tex`](sllab.tex). The diagrams are drawn in the source with TikZ; there are no image files for them.
- **Style:** [`sllab.sty`](sllab.sty) (layout, fonts) and [`sllab.bst`](sllab.bst) (reference style), adapted from Pascal Michaillat's MIT-licensed [latex-paper](https://github.com/pmichaillat/latex-paper) template for XeTeX.
- **References:** [`sllab.bib`](sllab.bib).

## Building

The PDF is built with [Tectonic](https://tectonic-typesetting.github.io), which downloads the LaTeX packages it needs on the first build.

```sh
brew install tectonic
tectonic -X compile sllab.tex   # runs BibTeX and writes sllab.pdf
```

Rebuild and commit `sllab.pdf` whenever the source, style or references change, so the PDF linked from the READMEs stays current.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
