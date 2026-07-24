import { ThumbsUpIcon, ThumbsDownIcon } from '@phosphor-icons/react/ssr';
import { AvatarGroup, AvatarGroupCount } from '@/ui/avatar';
import { UserAvatar } from '@/ui/user-avatar';
import { cn } from '@/helpers/utils';

const MAX_VISIBLE = 3;

// `chip` wraps the stack in a colored pill with a like/dislike icon — the
// deck card's corner indicators (dislike: avatars then icon, like: icon then
// avatars, so both icons point toward the card's center). Without `chip`
// this is just the bare AvatarGroup with a tone-colored ring per avatar,
// which is all the item detail page's "Calificaciones" card needs (it
// already shows its own icon+count above the stack).
export const RatingAvatarStack = ({ ratings, tone, className, chip = false }) => {
    if (!ratings?.length) return null;
    const visible = ratings.slice(0, MAX_VISIBLE);
    const extra = ratings.length - visible.length;
    const isLike = tone === 'like';

    // AvatarGroup's own base styling rings every avatar in ring-background
    // (its default overlap treatment) — overridden here to the pill's own
    // accent color instead, so the stack reads as punched out of the chip
    // rather than bordered against the page background behind it.
    const avatarGroup = (
        <AvatarGroup
            className={cn(
                chip && (isLike ? '*:data-[slot=avatar]:ring-emerald-500' : '*:data-[slot=avatar]:ring-rose-500'),
                !chip && className,
            )}
        >
            {visible.map(rating => (
                <UserAvatar
                    key={rating.id}
                    user={rating.profiles}
                    size='sm'
                    className={!chip && cn('ring-2', isLike ? 'ring-emerald-500' : 'ring-rose-500')}
                />
            ))}
            {extra > 0 && <AvatarGroupCount>+{extra}</AvatarGroupCount>}
        </AvatarGroup>
    );

    if (!chip) return avatarGroup;

    // Same size-6/size-3.5 container as before, just without its own
    // background color — the pill itself is the only background now.
    const Icon = isLike ? ThumbsUpIcon : ThumbsDownIcon;
    const icon = (
        <span className='flex size-6 shrink-0 items-center justify-center rounded-full text-white [&_svg]:size-3.5'>
            <Icon weight='fill' />
        </span>
    );

    return (
        <div
            className={cn(
                'flex items-center rounded-full p-1',
                isLike ? 'bg-emerald-500' : 'bg-rose-500',
                className,
            )}
        >
            {isLike ? (
                <>
                    {icon}
                    {avatarGroup}
                </>
            ) : (
                <>
                    {avatarGroup}
                    {icon}
                </>
            )}
        </div>
    );
};
