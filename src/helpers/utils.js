import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export const match = action => {
    let hasMatch = false;
    let finalHandler = null;

    return {
        with(pattern, handler) {
            if (!hasMatch) {
                const entries = Object.entries(pattern);
                const isMatching = entries.every(([key, value]) => {
                    return action[key] === value;
                });

                if (isMatching) {
                    hasMatch = true;
                    finalHandler = handler;
                }
            }
            return this;
        },
        when(matcher, handler) {
            if (!hasMatch && matcher(action)) {
                hasMatch = true;
                finalHandler = handler;
            }
            return this;
        },
        otherwise(handler) {
            if (!hasMatch) {
                finalHandler = handler;
            }
            return this;
        },
        run() {
            return typeof finalHandler === 'function' ? finalHandler(action) : finalHandler;
        },
    };
};
