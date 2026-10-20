// The sections every style guide has, in this order: id, the title the
// sidebar shows, and the line under the heading that tells a new reader what
// the section is for. A section with no content is left out of the page; no
// other section may be added. Shared by the generator and the check.
export const SECTIONS = [
  ['overview', 'Overview', ''],
  ['colors', 'Colors', 'The raw palette. Where a theme role exists for the job (a background, a text colour, a border), use the role and not the colour itself.'],
  ['themes', 'Themes', 'A theme is one mode of the semantic colours. Put its class on a section and everything inside follows: backgrounds, text, borders and buttons.'],
  ['typography', 'Typography', 'One class per text role. Sizes change per breakpoint through variables, so a text element needs one class and no overrides.'],
  ['utilities', 'Utilities', 'Single-purpose classes for a one-off change. Add one next to a type class before making a new combo.'],
  ['spacing', 'Spacing, radius and layout', 'The values every gap, padding, corner and container comes from. Pick one of these before typing a number.'],
  ['buttons', 'Buttons and links', 'Every button and link style, with its variants. States (hover, focus, pressed) are named in each note.'],
  ['forms', 'Forms', 'Fields, labels and messages as they look inside a form.'],
  ['components', 'Components', 'Reusable blocks. In Webflow each one is a component: insert an instance, never copy the markup.'],
  ['page-sections', 'Page sections', 'Whole sections at half size. Each is removed from here once its page is built.'],
  ['other-classes', 'Other classes', 'Classes with no specimen above. They are applied here so Webflow’s “Clean up unused styles” can’t delete them.'],
];
// The id a section gets in the page. Webflow refuses "forms" as an element
// id (it drops it on import and on write), so that section is anchored as
// "form-elements"; every other section uses its own key.
export const anchorOf = (id) => (id === 'forms' ? 'form-elements' : id);
// Sections whose rows are specimens a project supplies (items or page blocks).
export const SPECIMEN_SECTIONS = ['buttons', 'forms', 'components', 'page-sections'];
