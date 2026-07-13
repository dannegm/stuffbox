import { createElement } from 'react';

export const createProviders =
    providers =>
    ({ children }) =>
        providers.reduceRight(
            (acc, [Provider, props = {}]) => createElement(Provider, props, acc),
            children,
        );
