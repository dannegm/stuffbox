'use client';

import { CameraIcon, XIcon } from '@phosphor-icons/react/ssr';
import { cn } from '@/helpers/utils';
import { Spinner } from '@/ui/spinner';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

const photoSrc = photo => photo.previewUrl ?? `${R2_PUBLIC_URL}/${photo.r2_key}`;

export const ItemPhotoGallery = ({
    photos = [],
    pending = [],
    isProcessing,
    onAddFiles,
    onRemove,
}) => {
    const all = [...photos, ...pending];

    return (
        <div className='flex flex-wrap gap-2' data-block='ItemPhotoGallery'>
            {all.map(photo => (
                <div
                    key={photo.id ?? photo.r2Key}
                    className='group relative size-20 shrink-0 overflow-hidden rounded-md border bg-muted'
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc(photo)} alt='' className='size-full object-cover' />
                    <button
                        type='button'
                        aria-label='Quitar foto'
                        onClick={() => onRemove(photo)}
                        className='absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 transition-opacity group-hover:opacity-100 [&_svg]:size-3'
                    >
                        <XIcon />
                    </button>
                </div>
            ))}

            <label
                className={cn(
                    'flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:bg-muted',
                    isProcessing && 'pointer-events-none opacity-60',
                )}
            >
                {isProcessing ? <Spinner className='size-4' /> : <CameraIcon className='size-5' />}
                <span className='text-xs'>Agregar</span>
                <input
                    type='file'
                    accept='image/*'
                    multiple
                    capture='environment'
                    className='sr-only'
                    onChange={event => {
                        onAddFiles(event.target.files);
                        event.target.value = '';
                    }}
                />
            </label>
        </div>
    );
};
