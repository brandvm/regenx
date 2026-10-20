# Searchable select (Finsweet Combo Box on a Webflow Dropdown)

A select the visitor can type into to filter its options. It is not in the
starter site: build it when a site needs one. The structure below is the
one that worked on an earlier build; the pitfalls are from that build and
are the reason this page exists.

Needs the Finsweet recipe first ([README.md](README.md)):
`pnpm finsweet add combobox` (add `list` too when the select sorts or
filters a list).

## Structure in Webflow

A Webflow **Dropdown** inside a **Form Block**. Element types matter:
Combo Box finds three of its parts by position, not by attribute.

| # | Element (Webflow type) | Class | Attributes |
| --- | --- | --- | --- |
| 1 | Form Block | Form Block | |
| 2 | › Form | | id `<name>-form` |
| 3 | › › Label | SR Only (or a visible label class) | id `<name>-label` |
| 4 | › › Dropdown | Select | `fs-combobox-element="dropdown"` |
| 5 | › › › Dropdown Toggle | Select Toggle | |
| 6 | › › › › Text Input | Select Input | id `<name>`, `autocomplete="off"`, `aria-labelledby="<name>-label"`; input name `<name>-search` |
| 7 | › › › › DOM `button` | Select Clear | `type="button"`, `aria-label="Clear <what>"`, `fs-combobox-element="clear"` |
| 8 | › › › › Icon (chevron) | Select Icon | decorative |
| 9 | › › › Dropdown List | Select List | |
| 10 | › › › › Select (native) | Select Native | id `<name>-native`, `aria-hidden="true"`, `tabindex="-1"`; input name `<name>`; plus `fs-list-element="sort-trigger"` when it sorts a List |
| 11 | › › › › Dropdown Link | Select Option | text "Option" (the template Combo Box copies per option) |
| 12 | › › › › Paragraph | Select Empty | `fs-combobox-element="empty"`, text "No matches" |

- Rows 6, 10 and 11 are found **by position**: the first `input` and the
  first `select` inside the Dropdown, and the first `a` in the list. Keep
  exactly one of each, in that place. The docs' `text-input`, `select` and
  `option-template` values of `fs-combobox-element` do nothing in 2.7.x;
  they can stay as labels but nothing reads them.
- Row 7, the clear button, is **required**. Without an element carrying
  `fs-combobox-element="clear"` Combo Box throws on start
  (`Cannot read properties of null (reading 'style')`) and shows no options.
  For the icon inside it use the starter's Icon component (`ph ph-x`).
- The options are the native select's `<option>`s (row 10). Add them in the
  Select element's settings; the API can't read or write select options.

## The same thing as prototype markup

```html
<div class="form-block w-form">
  <form id="sort-form">
    <label class="sr-only" id="sort-label" for="sort">Sort by</label>
    <div class="select w-dropdown" fs-combobox-element="dropdown">
      <div class="select-toggle w-dropdown-toggle">
        <input class="select-input w-input" id="sort" name="sort-search" type="text"
               autocomplete="off" aria-labelledby="sort-label">
        <button class="select-clear" type="button" aria-label="Clear sort"
                fs-combobox-element="clear">…</button>
        <div class="select-icon" aria-hidden="true">…</div>
      </div>
      <nav class="select-list w-dropdown-list">
        <select class="select-native w-select" id="sort-native" name="sort"
                aria-hidden="true" tabindex="-1" fs-list-element="sort-trigger">
          <option value="">Default</option>
          <option value="name-asc">Name A to Z</option>
          <option value="name-desc">Name Z to A</option>
        </select>
        <a class="select-option w-dropdown-link" href="#">Option</a>
        <p class="select-empty" fs-combobox-element="empty">No matches</p>
      </nav>
    </div>
  </form>
</div>
```

In the prototype the `w-*` classes are written out because Webflow adds
them on publish; `wf:preflight` will list the `<button>` and the input's
`name` as PLAN items, which is right.

## Classes (Designer)

Webflow's own form and dropdown defaults apply wherever a class doesn't
set the property. Each of these has to be set, or the default shows:

| Class | Set | Because Webflow's default is |
| --- | --- | --- |
| Form Block | margin-bottom 0; align-self stretch when its parent is a flex column | `.w-form` adds 15px below; the wrapper, not the form, is the flex item |
| Select | margin-left and margin-right 0; position relative | `.w-dropdown` has auto side margins |
| Select Toggle | padding 0; display flex, align center; the border, radius and height of the field; **Focus Within**: the focus ring (outline 0.125em, Form/Focus, offset 3px) | `.w-dropdown-toggle` pads 20px 40px 20px 20px |
| Select Input | margin-bottom 0; border none; background transparent; flex 1; **Focus**: border colour = its base value; **Focus Visible**: outline none | `.w-input` adds 10px below and turns the border blue on focus; the ring belongs on the whole field, not the input |
| Select Clear | padding 0; border none; background transparent; cursor pointer; the icon's size | a native button's own styles |
| Select List | position absolute; top 100% plus a gap; width 100%; the panel's background, border, radius and shadow; z-index above what it overlaps | |
| Select Native | the SR Only values (it stays in the DOM for Finsweet and for the form, hidden from sight) | |
| Select Option | colour inherit; padding; **Hover** and **Focus Visible** background | `.w-dropdown-link` sets colour #222 |
| Select Empty | padding; the secondary text colour | |

A list that must show above everything (inside a clipped card, a sticky
bar) can't be solved with z-index alone when an ancestor has `overflow:
hidden` or a transform; give the Dropdown List `position: fixed` from a
module, or move the select out of the clipping ancestor.

## Behaviour to know

- **Options are sorted by `value`,** with `localeCompare`, not in the
  select's order. Choose values that sort the way the options should read
  (`1-newest`, `2-oldest`, or `name-asc` before `name-desc`).
- **It drives List Sort and List Filter.** Combo Box writes the chosen value
  to the native select and fires `input` and `change`, so a select with
  `fs-list-element="sort-trigger"` (values `field-asc` / `field-desc`)
  reorders an `fs-list` on the page.
- **Loading.** It needs `window.FinsweetAttributes.modules`; the recipe's
  `finsweet.ts` creates it. Never add Finsweet's script tag as well.
- **Page transitions.** Call `resetFinsweet()` when a page leaves, or the
  next page's select is wired twice.
- **Form submit.** The Form Block exists because Webflow only allows form
  controls inside one. If the select only sorts a list, it never submits:
  give the form no action and ignore Webflow's success and error blocks.

## Check before calling it done

- Keyboard only: Tab reaches the input, typing filters, Arrow keys move
  through options, Enter chooses, Escape closes, the clear button is
  reachable and named.
- The focus ring is on the whole field (Select Toggle), not a second ring
  on the input.
- `pnpm wf:html` on the page: the input and the select did not publish as
  `name="field"` (set names in the Designer, typing a value that differs
  from the one shown).
- With no match the "No matches" line shows; with the input cleared every
  option is back.
- Phone width: the list is not cut off by the viewport or a parent.
