'use client';

import { CameraIcon, XIcon } from '@phosphor-icons/react/ssr';
import { cn } from '@/helpers/utils';
import { Spinner } from '@/ui/spinner';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

const photoSrc = photo => photo.previewUrl ?? `${R2_PUBLIC_URL}/${photo.r2_key}`;

// Shared by item and location photo galleries — `pending` (uploaded but not
// yet persisted to a row) only applies to the item flow, where photos can be
// added before the item itself exists; pass an empty array otherwise.
export const PhotoGallery = ({ photos = [], pending = [], isProcessing, onAddFiles, onRemove }) => {
    const all = [...photos, ...pending];

    return (
        <div className='flex flex-wrap gap-3' data-block='PhotoGallery'>
            {all.map(photo => (
                <div
                    key={photo.id ?? photo.r2Key}
                    className='group relative size-24 shrink-0 overflow-hidden rounded-lg border bg-muted shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10'
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc(photo)} alt='' className='size-full object-cover' />
                    <button
                        type='button'
                        aria-label='Quitar foto'
                        onClick={() => onRemove(photo)}
                        className='absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-xs shadow-black/20 ring-1 ring-foreground/10 transition-opacity group-hover:opacity-100 touch:opacity-100 [&_svg]:size-3.5'
                    >
                        <XIcon />
                    </button>
                </div>
            ))}

            <label
                className={cn(
                    'flex size-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/60 hover:text-foreground',
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
