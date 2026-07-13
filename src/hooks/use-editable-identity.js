'use client';

import { useState } from 'react';
import { nanoid } from 'nanoid';
import { generateName, generateColor, generateGender } from '@/helpers/identity';

// Backs the register/join identity tag: a name the person can type over, a
// gender toggle, a color picker, and an avatar they can re-roll — starts
// pregenerated (saves the first click), never locked in until they hit
// continue. Gender/color are explicit choices, not bundled into the avatar
// re-roll, since the profile schema tracks them as their own fields. See
// src/services/provision-account.js's pending-identity hand-off for how the
// final values become the real profile.
export const useEditableIdentity = () => {
    const [name, setName] = useState(() => generateName());
    const [color, setColor] = useState(() => generateColor());
    const [gender, setGender] = useState(() => generateGender());
    const [avatarSeed, setAvatarSeed] = useState(() => nanoid());

    const regenerateName = () => setName(generateName());
    const regenerateAvatar = () => setAvatarSeed(nanoid());

    return {
        identity: { name, color, gender, avatarSeed },
        setName,
        setColor,
        setGender,
        regenerateName,
        regenerateAvatar,
    };
};
