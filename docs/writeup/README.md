# Write-up

A technical write-up of SLLAB: the architecture, the data model, Fixture by SLLAB, UCSDMCS by SLLAB, Film by SLLAB and its tracking mount, engineering practice, and the roadmap.

- **Read it:** [`sllab.pdf`](sllab.pdf)
- **Source:** [`sllab.tex`](sllab.tex). The diagrams are drawn in the source with TikZ; there are no image files for them.
- **Style:** [`sllab.sty`](sllab.sty) (layout, fonts, figure placeholders) and [`sllab.bst`](sllab.bst) (reference style), adapted from Pascal Michaillat's MIT-licensed [latex-paper](https://github.com/pmichaillat/latex-paper) template for XeTeX.
- **References:** [`sllab.bib`](sllab.bib).

## Building

The PDF is built with [Tectonic](https://tectonic-typesetting.github.io), which downloads the LaTeX packages it needs on the first build.

```sh
brew install tectonic
tectonic -X compile sllab.tex   # runs BibTeX and writes sllab.pdf
```

Rebuild and commit `sllab.pdf` whenever the source, style, references or a figure changes, so the PDF linked from the READMEs stays current.

## Media

Photos and screenshots go in `figures/`. Until a file exists, the PDF shows a labeled placeholder box in its place. Add a file with the exact name below and rebuild; it is scaled to fit its box.

| File | Shows |
|---|---|
| `figures/fixture-schedule.png` | Fixture: season schedule with availability |
| `figures/fixture-event.png` | Fixture: an event with team responses |
| `figures/fixture-reminder.png` | Fixture: SMS reminder composer |
| `figures/fixture-dashboard.png` | Fixture: captain attendance dashboard |
| `figures/site-schedule.png` | Website: schedule and scores, desktop |
| `figures/site-mobile.png` | Website: standings, mobile |
| `figures/mount.jpg` | The assembled mount with a phone |
| `figures/pcb.jpg` | The controller PCB, assembled |
| `figures/tracking.png` | A frame from a tracking test |

The Fixture screenshots sit side by side in portrait boxes; the website desktop shot is landscape.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
