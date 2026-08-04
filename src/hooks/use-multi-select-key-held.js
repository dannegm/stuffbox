import { useEffect, useState } from 'react';

// Alt/Option only — deliberately not Cmd/Ctrl, since that's the browser's
// own "open link in new tab" gesture on a click; hijacking it here would
// break that on every selectable row/card.
export const useMultiSelectKeyHeld = () => {
    const [held, setHeld] = useState(false);

    useEffect(() => {
        const onKeyDown = event => {
            if (event.key === 'Alt') setHeld(true);
        };
        const onKeyUp = event => {
            if (event.key === 'Alt') setHeld(false);
        };
        const onBlur = () => setHeld(false);

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, []);

    return held;
};
