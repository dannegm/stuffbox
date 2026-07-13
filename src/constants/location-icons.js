// Default icon per free-text `locations.type`, keyed lowercase. Editable per
// the plan (§11) — a location's own `icon` jsonb always wins over this map.
export const DEFAULT_LOCATION_ICONS = {
    house: { library: 'phosphor', name: 'HouseIcon' },
    room: { library: 'phosphor', name: 'DoorOpenIcon' },
    box: { library: 'phosphor', name: 'PackageIcon' },
    shelf: { library: 'phosphor', name: 'BooksIcon' },
    library: { library: 'phosphor', name: 'BooksIcon' },
    closet: { library: 'phosphor', name: 'TShirtIcon' },
    drawer: { library: 'phosphor', name: 'ArchiveIcon' },
    warehouse: { library: 'phosphor', name: 'WarehouseIcon' },
    kitchen: { library: 'phosphor', name: 'ForkKnifeIcon' },
    bathroom: { library: 'phosphor', name: 'BathtubIcon' },
    office: { library: 'phosphor', name: 'BriefcaseIcon' },
    garage: { library: 'phosphor', name: 'GarageIcon' },
};

export const FALLBACK_LOCATION_ICON = { library: 'phosphor', name: 'FolderIcon' };
export const FALLBACK_ITEM_ICON = { library: 'phosphor', name: 'CubeIcon' };
export const FALLBACK_TAG_ICON = { library: 'phosphor', name: 'TagIcon' };

// Common type presets offered when creating a location — free text, not an
// enum, so this is a shortlist of suggestions rather than a hard constraint.
export const LOCATION_TYPE_PRESETS = Object.keys(DEFAULT_LOCATION_ICONS).filter(
    type => type !== 'library',
);

// Root-level locations only offer these two — a room/box/etc. can't be a
// tree root, so they're excluded from the house-creation type picker.
export const ROOT_LOCATION_TYPE_PRESETS = ['house', 'warehouse'];
