import { AvatarGroup, AvatarGroupCount } from '@/ui/avatar';
import { UserAvatar } from '@/ui/user-avatar';
import { cn } from '@/helpers/utils';

const MAX_VISIBLE = 3;

// Corner avatar stacks on the deck card (reused on the item detail page) —
// tone drives the ring color so like/dislike read at a glance: emerald for
// likes, rose for dislikes.
export const RatingAvatarStack = ({ ratings, tone, className }) => {
    if (!ratings?.length) return null;
    const visible = ratings.slice(0, MAX_VISIBLE);
    const extra = ratings.length - visible.length;

    return (
        <AvatarGroup className={className}>
            {visible.map(rating => (
                <UserAvatar
                    key={rating.id}
                    user={rating.profiles}
                    size='sm'
                    className={cn('ring-2', tone === 'like' ? 'ring-emerald-500' : 'ring-rose-500')}
                />
            ))}
            {extra > 0 && <AvatarGroupCount>+{extra}</AvatarGroupCount>}
        </AvatarGroup>
    );
};
