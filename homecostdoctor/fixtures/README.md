# Test fixtures

## `sample-quote.pdf`

A synthetic roofing quote for exercising the extractor before you spend a real
homeowner's document on it. **No real company, person, address or phone number
appears in it** — every identifier is a `555` number or an `.example` domain.

Regenerate it from `sample-quote.html` with any headless Chrome:

```
chrome --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=fixtures/sample-quote.pdf fixtures/sample-quote.html
```

It is deliberately awkward, so a passing run means something:

| Trap | What correct extraction looks like |
|---|---|
| Company name, licence, two phone numbers, email, website, both addresses | None of it comes back in any field |
| Permit never mentioned | `scope.permit` is `not_stated` — **not** `excluded`, **not** `included` |
| Ventilation excluded in a sentence, not a line item | `scope.ventilation` is `excluded` |
| Decking priced per sheet, quantity unknowable until tear-off | `deckPricePerSheet: 96`, `deckSheetsIncluded: null` |
| Deductible absorption + assignment of claim rights | Red flag, with the wording quoted |
| Full payment demanded before work starts | Red flag, with the wording quoted |
| Line items do not sum to the stated total | `totalPrice: 19450` — the stated total wins, nothing recalculated |
| Total written in figures and again in words | One total, not two |

The permit case is the one to watch. A model that resolves silence into a
sensible-looking `included` breaks the entire quote-checker, because the whole
tool rests on "the quote didn't say" being different from "the quote said no" —
and it fails in a way that looks completely correct on the page.

## Usage

```
npm run test:extract -- fixtures/sample-quote.pdf
npm run test:extract -- ~/Downloads/*.pdf --json /tmp/extractions.json
```

Reads `ANTHROPIC_API_KEY` from the environment or `.env.local`. Exits non-zero
on a privacy failure or a crash.
