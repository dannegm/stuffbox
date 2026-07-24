import { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/ui/avatar';
import { getAvatarUrl } from '@/helpers/avatar';
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
                <Avatar
                    key={rating.id}
                    size='sm'
                    className={cn('ring-2', tone === 'like' ? 'ring-emerald-500' : 'ring-rose-500')}
                >
                    <AvatarImage
                        src={getAvatarUrl(rating.profiles?.avatar_seed, rating.profiles?.gender)}
                        alt={rating.profiles?.name}
                    />
                    <AvatarFallback>{rating.profiles?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
            ))}
            {extra > 0 && <AvatarGroupCount>+{extra}</AvatarGroupCount>}
        </AvatarGroup>
    );
};
