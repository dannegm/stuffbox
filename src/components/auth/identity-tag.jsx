import {
    DiceFiveIcon,
    ArrowClockwiseIcon,
    GenderMaleIcon,
    GenderFemaleIcon,
} from '@phosphor-icons/react/ssr';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar';
import { ColorPicker } from '@/ui/color-picker';
import { getAvatarUrl } from '@/helpers/avatar';
import { cn } from '@/helpers/utils';

const GenderToggle = ({ gender, onChange }) => (
    <div className='flex items-center gap-1 rounded-full bg-muted p-1' data-block='GenderToggle'>
        {[
            { value: 'male', icon: GenderMaleIcon, label: 'Masculino' },
            { value: 'female', icon: GenderFemaleIcon, label: 'Femenino' },
        ].map(option => (
            <button
                key={option.value}
                type='button'
                aria-label={option.label}
                aria-pressed={gender === option.value}
                onClick={() => onChange(option.value)}
                className={cn(
                    'flex size-7 items-center justify-center rounded-full [&_svg]:size-3.5',
                    gender === option.value
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground',
                )}
            >
                <option.icon weight='bold' />
            </button>
        ))}
    </div>
);

// A pregenerated name + avatar, presented like a printed inventory tag — the
// same visual language the label builder uses elsewhere in the app (§8 of
// the plan). Nothing here is final until "continuar": the name is a real
// input, the dice re-rolls the avatar, gender/color are direct picks — this
// saves the first click without taking away the edit.
export const IdentityTag = ({
    identity,
    onNameChange,
    onColorChange,
    onGenderChange,
    onRegenerateName,
    onRegenerateAvatar,
}) => (
    <div
        className='flex w-full overflow-hidden items-center gap-4 rounded-lg border border-dashed border-primary/10 bg-primary/35 p-4'
        data-block='IdentityTag'
    >
        <div className='relative shrink-0'>
            <Avatar
                className='size-16 bg-(--identity-color)'
                style={{ '--identity-color': identity.color }}
            >
                <AvatarImage
                    key={`${identity.avatarSeed}:${identity.gender}`}
                    src={getAvatarUrl(identity.avatarSeed, identity.gender)}
                    alt={identity.name}
                    className='animate-in fade-in zoom-in-50 duration-300'
                />
                <AvatarFallback>{identity.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>

            <ColorPicker value={identity.color} onChange={onColorChange}>
                <button
                    type='button'
                    aria-label='Elegir color'
                    style={{ '--swatch-color': identity.color }}
                    className='absolute -top-0.5 -left-0.5 size-5 rounded-full bg-(--swatch-color) ring-2 ring-card transition-transform hover:scale-110 active:scale-95'
                />
            </ColorPicker>

            <button
                type='button'
                onClick={onRegenerateAvatar}
                aria-label='Probar otro avatar'
                className='absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full bg-rose-500 text-primary-foreground ring-2 ring-card transition-transform hover:scale-110 active:scale-95 [&_svg]:size-4'
            >
                <DiceFiveIcon weight='bold' />
            </button>
        </div>

        <div className='flex min-w-0 flex-1 flex-col gap-2'>
            <div className='flex items-center justify-between gap-2'>
                <span className='font-mono text-sm tracking-widest text-muted-foreground uppercase'>
                    ID · {identity.avatarSeed.slice(0, 6)}
                </span>
                <GenderToggle gender={identity.gender} onChange={onGenderChange} />
            </div>
            <div className='flex items-center gap-2'>
                <input
                    value={identity.name}
                    onChange={event => onNameChange(event.target.value)}
                    aria-label='Tu nombre'
                    className={cn(
                        'min-w-0 flex-1 border-b border-dashed border-border bg-transparent',
                        'font-mono text-base font-medium tracking-wide outline-none',
                        'focus:border-primary',
                    )}
                />
                <button
                    type='button'
                    onClick={onRegenerateName}
                    aria-label='Probar otro nombre'
                    className='flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-transform hover:scale-110 hover:text-foreground active:scale-95 [&_svg]:size-3.5'
                >
                    <ArrowClockwiseIcon weight='bold' />
                </button>
            </div>
        </div>
    </div>
);
