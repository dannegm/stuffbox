import { Avatar, AvatarImage, AvatarFallback } from '@/ui/avatar';
import { getAvatarUrl } from '@/helpers/avatar';
import { cn } from '@/helpers/utils';

// Every profile avatar in the app (sidebar, admin, collaborators, workspace
// members, identity picker, deck ratings) needs the same three things: the
// DiceBear image, an initial-letter fallback, and the profile's own color as
// the avatar's background (bg-(--profile-color)) — this was getting
// re-implemented slightly differently at each call site, and easy to forget
// (workspace/[id]/page.js's member AvatarGroup had never gotten the color).
export const UserAvatar = ({ user, size, className, imageClassName, ...props }) => (
    <Avatar
        size={size}
        className={cn('bg-(--profile-color)', className)}
        style={{ '--profile-color': user?.color }}
        {...props}
    >
        <AvatarImage
            src={getAvatarUrl(user?.avatar_seed, user?.gender)}
            alt={user?.name ?? ''}
            className={imageClassName}
        />
        <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
    </Avatar>
);
