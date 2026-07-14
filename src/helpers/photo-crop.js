// crop_x/crop_y/zoom (item_photos/location_photos, db.sql) describe a pan +
// zoom around center, not a physical crop — db.sql: "Square-masked at
// render, never physically cropped". 0/0/1 (the columns' defaults, and what
// every photo has today since there's no cropper UI writing to them yet) is
// "centered, no zoom", so this renders identical to plain object-cover until
// a photo actually has non-default values. Consumed as CSS custom properties
// (never a raw `style={{ transform }}`, per the CSS-var convention) via
// `scale-(--photo-zoom) object-(--photo-position)` on the <img>.
export const getPhotoCropStyle = photo => {
    const cropX = photo?.crop_x ?? 0;
    const cropY = photo?.crop_y ?? 0;
    const zoom = photo?.zoom ?? 1;
    return {
        '--photo-zoom': zoom,
        '--photo-position': `${(0.5 + cropX) * 100}% ${(0.5 + cropY) * 100}%`,
    };
};
