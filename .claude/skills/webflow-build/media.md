# The media page

A site that plays video gets one extra page, `/design/media`, next to the
style guide. It exists for one reason: Webflow only converts and hosts a
video that is uploaded as a **Background Video** element, and that element
can't carry the attributes, poster handling or script hooks a real page
needs. So each video is uploaded once on the media page, Webflow does the
conversion and hosting, and the real pages play the hosted files through
the project's own Video component.

It is built after the style guide page and before the first page that
plays a video (SKILL.md › The order of a build, step 7). The gate is **Media
done** in [checklists.md](checklists.md).

## When it is needed

Any entry in the video list (**Before the prototype**, in
`webflow-prototype`). A site with no
video has no media page. A video embedded from YouTube or Vimeo doesn't
need it either.

## The source files

[Person] supplies them; Claude checks them before the upload
(`conventions.md` §14):

- MP4, H.264, fast start, no audio track for a background video;
- at most 30 MB each (Webflow's limit for a Background Video);
- a second, smaller encode for phones when the design shows one;
- a poster image per video: the first frame, or the frame the design shows.

## Procedure

1. **Page.** [Claude] creates `/design/media` in the `design` folder, on
   the standard page shell, titled "Media". `noindex, nofollow` in the
   page's head code; excluded from site search and the sitemap; no link to
   it from any page. One Section, and inside it one block per video with a
   heading that names it (the page and section it belongs to).
2. **Upload.** [Person] drops a **Background Video** element into each
   block and uploads the file in its settings. The API can't upload a
   video. This is a row in `MANUAL-TODO.md`.
3. **Publish** to staging. Webflow converts each file (it can take a few
   minutes; until then the published page has no sources).
4. **Read the addresses.** [Claude] reads the published media page and
   takes, for each video, the hosted MP4 and WebM addresses and the poster
   Webflow made. They are recorded in `BUILD-NOTES.md` in one table:
   video, page it is used on, MP4, WebM, poster.
5. **Use them.** The real pages play them through the Video component:
   the addresses go into its source props (or the CMS fields bound to
   them), the poster into its poster prop. Attributes carry values
   (`muted="true"`, `loop="true"`, `playsinline="true"`,
   `autoplay="true"`); the source list skips the WebM when it is larger
   than the MP4.
6. **Check** on staging, at desktop and phone width: each video plays, the
   poster shows first, nothing is requested from the media page itself, and
   reduced motion is respected (the module pauses it or the poster stays).

## Rules

- **The media page stays for the life of the site.** Deleting a Background
  Video there removes its hosted files, and every page that plays them
  breaks. Say so in the client handoff.
- **Replacing a video:** upload the new file in the same block, publish,
  read the new addresses (they change), update the component, publish
  again, check.
- **Never link to it,** and never use its Background Video elements on a
  real page.
- In the prototype the same files sit in `public/assets/`; the prototype
  doesn't need the media page.
