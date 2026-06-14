# Pain Entry Schema

Each line in `pain-log.jsonl` is ONE JSON object with these fields:

| field        | type           | notes                                            |
|--------------|----------------|--------------------------------------------------|
| `id`         | string         | short slug, unique (e.g. "g2-invoice-ocr-0143")  |
| `date`       | string         | ISO date the entry was collected                 |
| `pain`       | string         | the problem, in plain words (1–2 sentences)      |
| `persona`    | string         | who has it (role / segment)                      |
| `workaround` | string \| null | how they cope today (manual step, other tool…)   |
| `pay_signal` | string \| null | any sign they pay / would pay; null if none      |
| `intensity`  | integer 1–5    | how acute the pain reads                          |
| `source`     | string         | source category + site (e.g. "review:G2")        |
| `source_url` | string         | the public page it came from                     |

Example line (do not keep this as real data):

`{"id":"ex-0001","date":"2026-06-02","pain":"...","persona":"...","workaround":null,"pay_signal":null,"intensity":3,"source":"review:G2","source_url":"https://..."}`

Rules: lowercase/trim where sensible; use `null` for unknowns rather than
guessing; one object per line; never reformat or delete earlier lines.
