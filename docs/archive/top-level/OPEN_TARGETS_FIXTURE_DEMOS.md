# Open Targets Fixture Demos

The production Open Targets snapshot remains empty until reviewed source data is imported. To preview the External Safety Context UI without mixing fixture data into the live app, run:

```bash
npm run demo:open-targets
```

This generates local HTML files under `.tmp/open-targets-fixture-demo/` using committed fixture input from `tests/fixtures/open-targets/`.

Primary example:

```text
.tmp/open-targets-fixture-demo/scenarios/ot-paroxetine-codeine-context.html
```

The fixture cards are intentionally labeled as review-only context. They must not change `calcRisk()`, warning severity, or interaction counts; that contract is enforced by `npm run audit:scenario-snapshots`.
