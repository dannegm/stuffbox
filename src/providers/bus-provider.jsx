'use client';

import { createContext, useContext, useEffect, useRef } from 'react';

const defaultBusPayload = {
    on: () => () => null,
    off: () => null,
    emit: () => null,
};

const BusContext = createContext(defaultBusPayload);

export const useEvents = () => {
    return useContext(BusContext);
};

export const useListener = (eventName, eventHandler) => {
    const { on } = useEvents();
    useEffect(() => {
        const unbind = on(eventName, eventHandler);
        return () => unbind();
    }, [on, eventName, eventHandler]);
};

export const useEmitter = (eventName, ...args) => {
    const { emit } = useEvents();

    const handleEmit = () => {
        emit(eventName, ...args);
    };

    return handleEmit;
};

export const BusProvider = ({ children }) => {
    const $events = useRef({});

    const off = (eventName, eventHandler) => {
        $events.current[eventName] = $events.current[eventName]?.filter(e => eventHandler !== e);
    };

    const on = (eventName, eventHandler) => {
        $events.current[eventName] ??= [];
        $events.current[eventName].push(eventHandler);
        return () => off(eventName, eventHandler);
    };

    const emit = (eventName, ...args) => {
        const handlers = $events.current[eventName] ?? [];
        handlers.forEach(handler => handler(...args));
    };

    return <BusContext.Provider value={{ on, off, emit }}>{children}</BusContext.Provider>;
};
