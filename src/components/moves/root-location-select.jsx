'use client';

import { useQuery } from '@tanstack/react-query';
import { SelectSearch } from '@/ui/select-search';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { locationChildrenQuery } from '@/queries/locations';

// A move's origin/destination must be root locations (house/warehouse) —
// same restriction stuffbox-plan.md §4 puts on the moves table, enforced
// here in the UI rather than the (unconstrained) schema.
export const RootLocationSelect = ({ workspaceId, value, onChange, placeholder, exclude }) => {
    const { data: roots = [] } = useQuery(
        locationChildrenQuery({ workspaceId, parentId: null }, { enabled: !!workspaceId }),
    );
    const options = exclude ? roots.filter(root => root.id !== exclude) : roots;

    return (
        <SelectSearch
            options={options}
            value={value}
            onChange={onChange}
            getKey={option => option.id}
            getLabel={option => option.name}
            placeholder={placeholder}
            searchPlaceholder='Buscar ubicación'
            emptyLabel='Sin ubicaciones todavía — crea una primero.'
            renderOption={option => (
                <>
                    <DynamicIcon icon={getLocationIcon(option)} />
                    <span className='truncate'>{option.name}</span>
                </>
            )}
        />
    );
};
