// One canvas round-trip: createImageBitmap with imageOrientation: 'from-image'
// bakes the EXIF rotation into pixels, and canvas.toBlob never carries EXIF
// forward — so resizing here also strips metadata for free.
export const processImageFile = async (file, maxDimension = 2000) => {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
};
