// crop_x/crop_y/zoom (item_photos/location_photos, db.sql) describe a pan +
// zoom around center, not a physical crop — db.sql: "Square-masked at
// render, never physically cropped". 0/0/1 (the columns' defaults, and what
// every photo has today since there's no cropper UI writing to them yet) is
// "centered, no zoom".
//
// crop_x/crop_y/zoom come from react-easy-crop's own pan/zoom state (UI
// only, never its canvas export — PhotoCropDialog, src/components/photos/
// photo-crop-dialog.jsx), which internally renders via
// `translate(${x}px, ${y}px) scale(${zoom})` on the image. crop_x/crop_y are
// stored as a *fraction* of react-easy-crop's own crop-area size at edit
// time (x/cropSize.width, y/cropSize.height) rather than raw pixels, so the
// same stored value scales correctly to any container size (a 96px thumb, a
// full lightbox, or the editor itself) without knowing react-easy-crop's
// pixel dimensions — expressed as a CSS translate *percentage* here, which
// resolves against the box it's applied to (CroppedPhoto's square "stage",
// src/ui/cropped-photo.jsx), reproducing the same proportional shift at any
// size.
// rotation is baked into this same transform (not a separate wrapper) on
// purpose — react-easy-crop's own media element uses exactly
// `translate(x,y) rotate(rotation) scale(zoom)` in that order (its source,
// not documented), and Tailwind's translate-x/translate-y/rotate/scale
// utilities always compose into one `transform` in that same fixed order
// regardless of class order — so keeping all four on one element here
// reproduces react-easy-crop's own composition exactly. Flip is NOT part of
// react-easy-crop's model at all (no native flip support) — it's applied as
// a separate outer wrap in both the editor and CroppedPhoto (see
// getPhotoFlipStyle/cropped-photo.jsx), which only stays visually
// consistent between the two if flip wraps *around* this whole
// translate+rotate+scale transform in both places, not intermixed with it.
export const getPhotoCropStyle = photo => {
    const cropX = photo?.crop_x ?? 0;
    const cropY = photo?.crop_y ?? 0;
    const zoom = photo?.zoom ?? 1;
    const rotation = photo?.rotation ?? 0;
    return {
        '--photo-zoom': zoom,
        '--photo-x': `${cropX * 100}%`,
        '--photo-y': `${cropY * 100}%`,
        '--photo-rotate': `${rotation}deg`,
    };
};

// Separate from getPhotoCropStyle on purpose — see the comment above it.
export const getPhotoFlipStyle = photo => ({
    '--photo-flip-x': photo?.flip_x ? -1 : 1,
    '--photo-flip-y': photo?.flip_y ? -1 : 1,
});
