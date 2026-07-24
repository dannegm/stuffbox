import { getPhotoCropStyle, getPhotoFlipStyle } from '@/helpers/photo-crop';

// Renders a photo panned/zoomed per crop_x/crop_y/zoom, clipped to whatever
// shape the parent gives it — the parent must be `relative overflow-hidden`
// with its own sizing (a square box, in every current caller); this just
// fills it. Two layers, not `object-fit: cover` on a single <img>:
// object-fit picks its framing at layout time and *discards* whatever part
// of a non-square photo doesn't fit — those pixels are gone from the
// rendered box entirely, so no transform afterwards can reveal them (this
// is why panning used to get stuck inside a "central square" on rectangular
// photos). Instead:
// - the *stage* div (this component's root) gets the pan/zoom transform,
//   and is always exactly the parent's own square shape — same math as
//   before, valid since it's always square regardless of the photo's shape.
// - the <img> inside is sized via min-width/min-height:100% + width/height:
//   auto (never object-fit), so its FULL content genuinely exists in the
//   layout — just centered on the stage via the standard top/left:50% +
//   translate(-50%,-50%) trick, which centers correctly no matter the
//   image's own rendered size.
// Panning/zooming the (always-square) stage then reveals real,
// previously-invisible edges of a rectangular photo, instead of being stuck
// wherever object-fit:cover happened to crop it.
export const CroppedPhoto = ({ src, photo }) => (
    // Flip is its own outer layer, wrapping the pan/zoom/rotate stage rather
    // than being folded into its transform — see getPhotoCropStyle's comment
    // for why the ordering has to match PhotoCropDialog's editor preview
    // exactly (flip applied to the *whole* already rotated/panned/zoomed
    // square, not intermixed with it).
    <div
        className='absolute inset-0 scale-x-(--photo-flip-x) scale-y-(--photo-flip-y)'
        style={getPhotoFlipStyle(photo)}
    >
        <div
            className='absolute inset-0 translate-x-(--photo-x) translate-y-(--photo-y) rotate-(--photo-rotate) scale-(--photo-zoom)'
            style={getPhotoCropStyle(photo)}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt=''
                draggable={false}
                className='absolute top-1/2 left-1/2 h-auto min-h-full w-auto min-w-full -translate-x-1/2 -translate-y-1/2'
            />
        </div>
    </div>
);
