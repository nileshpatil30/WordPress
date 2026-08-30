# Working on CostSignal

## Non-negotiables

These are not style preferences. Breaking one produces a product that misleads
people about what a roof costs.

1. **Never present an unlabelled number.** `data_status` is `NOT NULL`. If you
   add a price, it is `verified`, `modeled` or `sample`, and the UI shows it.
2. **Never let the confidence score inflate.** It exists to fall. Sample data
   caps it at 60, modelled data at 78. Do not add points for anything that is
   not evidence.
3. **Never fabricate history.** A place with no verified series renders an empty
   state saying so. A plausible-looking invented trend line is the most damaging
   thing a pricing product can publish, because it is indistinguishable from a
   real one.
4. **Never accuse a contractor.** The quote checker compares a number to *our
   model*. It says "above our modelled range", never "overcharging". This is
   enforced by a test.
5. **Never call the cheapest quote the best.** The comparison tool normalises
   for scope and lets the reader decide.
6. **Never hardcode a multiplier in a component.** It belongs in
   `pricing_factors`, where an admin can see and change it.
7. **Never publish a page with nothing to say.** `is_published` and
   `page_eligible` are the gates. If you cannot write something specific and
   true about a place, it does not get a page.

## Before you push

```bash
npm run typecheck && npm test && npm run build
```

## Where things live

- **Changing the cost model** → `lib/engine/roofing/model.ts`, and the factor
  rows in `lib/data/seed/pricing.ts`. Add a test in `tests/engine.test.ts`.
- **Changing what the calculator asks** → `lib/engine/roofing/schema.ts`
  (`roofingSteps`). The form renders itself from that; do not edit the form.
- **Adding a service** → see the README. Registry + one engine module + data.
- **Changing copy about accuracy or licensing** → re-read this list first.
