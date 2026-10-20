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

## Looping background video

A hero film that loops shows a jump at the seam unless the file is made to
loop: the last frame cuts back to a first frame that looks nothing like
it. When [Person] supplies a raw clip rather than a finished loop, Claude
can make the render set from it, outside the repo (a `video/` folder in the
workspace, deliverables in `video/out/`; media files are never committed).

**The seamless loop.** Keep every source frame and the source length. Over
the last ~1.25 s, crossfade the film into a *held copy of frame 0*, so the
final frames are frame 0 itself; when the player wraps, frame 0 follows
frame 0 and there is nothing to see. No ping-pong (reversed motion reads
as a rewind), no cut. Grading, if any, is applied to the whole result, so
both sides of the seam match.

**The render set,** from the same loop, all muted, no audio track:

| File | For | Settings |
| --- | --- | --- |
| `hero-1080.mp4` | desktop | 1920×1080, H.264, CRF ~28, `yuv420p`, fast start, keyframe at 0 |
| `hero-720.mp4` | phones (the Video component's small source) | 1280×720, CRF ~27, same flags |
| `hero-1080.webm` | browsers that take it | VP9, CRF ~32; dropped when it is not smaller than the MP4 |
| `hero-poster.jpg` | the poster, reduced motion | frame 0, JPEG quality ~85 |

Each MP4 stays under Webflow's 30 MB. The poster is frame 0, so the switch
from poster to playback is invisible too. A smaller source scaled up is an
upscale, not new detail: say so, and ask for a bigger master if the design
needs it.

**FFmpeg** (any recent build; `ffmpeg-static` from npm when none is
installed). From the clip's folder, after `mkdir -p out`, set its frame
rate and frame count (`ffprobe -show_streams`) and the fade length:

```bash
SRC=source.mp4 FPS=24 FRAMES=241 FADE=1.25
# The fade ends 3 frames before the end, so the last frames are frame 0 itself.
# Keep the braces: zsh reads "$FADE:a" as a path modifier.
START=$(echo "($FRAMES - 3) / $FPS - $FADE" | bc -l)
LOOP="[0:v]setpts=PTS-STARTPTS[base];[1:v]trim=end_frame=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=600,format=yuva420p,fade=t=in:st=${START}:d=${FADE}:alpha=1[head];[base][head]overlay=shortest=1:format=auto"

ffmpeg -y -i "$SRC" -i "$SRC" -filter_complex "$LOOP,scale=1920:1080:flags=lanczos[out]" -map "[out]" -an -r $FPS -frames:v $FRAMES \
  -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -force_key_frames 0 -movflags +faststart out/hero-1080.mp4
ffmpeg -y -i "$SRC" -i "$SRC" -filter_complex "$LOOP,scale=1280:720:flags=lanczos[out]" -map "[out]" -an -r $FPS -frames:v $FRAMES \
  -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -force_key_frames 0 -movflags +faststart out/hero-720.mp4
ffmpeg -y -i "$SRC" -i "$SRC" -filter_complex "$LOOP,scale=1920:1080:flags=lanczos[out]" -map "[out]" -an -r $FPS -frames:v $FRAMES \
  -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -pix_fmt yuv420p out/hero-1080.webm
ffmpeg -y -i out/hero-1080.mp4 -frames:v 1 -q:v 3 out/hero-poster.jpg
```

A grade goes before the scale in the same chain, e.g.
`$LOOP,eq=contrast=0.95:saturation=0.92,scale=…`.

**Check the seam** before the upload: the first and last frames should be
the same picture (SSIM about 0.97 or more after compression; frames a
second apart score far lower), the frame count and size should be what was
set, and the loop should look continuous in a browser over a few cycles
(`<video autoplay muted loop>`).

```bash
ffmpeg -v error -i out/hero-1080.mp4 -vf "select='eq(n\,0)+eq(n\,$((FRAMES - 1)))'" -fps_mode vfr out/seam-%d.png
ffmpeg -i out/seam-1.png -i out/seam-2.png -lavfi ssim -f null - 2>&1 | grep SSIM
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames:format=size out/hero-1080.mp4
```

**Remotion (optional),** when the film needs more than a crossfade
(titles, a mask, a grade previewed frame by frame): one composition at the
clip's size and frame rate with two video layers, the film and a copy held
on frame 0 whose opacity runs 0 → 1 over the same tail. Render the set
with `npx remotion render <Comp> out/hero-1080.mp4 --codec=h264 --crf=28
--pixel-format=yuv420p --muted` (`--scale` for the 720, `--codec=vp9` for
the WebM) and the poster with `npx remotion still <Comp>
out/hero-poster.jpg --frame=0`. Keep the FFmpeg commands as the fallback
for a machine where Remotion's Chrome can't start, and check Remotion's
licence terms for the client's company size.

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
   reduced motion is respected (the poster stays). The playback behaviour
   (late loading, on-screen only, reduced motion, the pause button,
   refused autoplay) comes from the video recipe:
   [recipes/video/](recipes/video/README.md).

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
