# Third-party notices

wf-template is MIT-0 (`LICENSE`). These parts come from others and keep
their own licences. Keep this file in every repo made from the template:
the build tooling still contains code from the Finsweet starter.

## Finsweet developer-starter

wf-template began as a copy of Finsweet's Webflow custom code starter,
<https://github.com/finsweet/developer-starter>, released under the ISC
licence (declared in its `package.json`).

```
ISC License

Copyright (c) Finsweet

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## Bundled files with their own licence

| Part | Licence | Where |
| --- | --- | --- |
| Phosphor Icons (icon font, `pnpm phosphor`) | MIT | `src/phosphor/LICENSE` |
| Geist font (prototype starter) | SIL Open Font License 1.1 | `.claude/skills/webflow-prototype/prototype-starter/public/fonts/Geist-OFL.txt` |

npm packages installed with `pnpm install` (Finsweet Attributes and the
rest) are not copied into this repo; each carries its own licence in
`node_modules/`.
