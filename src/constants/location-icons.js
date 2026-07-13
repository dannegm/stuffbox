// Default icon per free-text `locations.type`, keyed lowercase. Editable per
// the plan (§11) — a location's own `icon` jsonb always wins over this map.
export const DEFAULT_LOCATION_ICONS = {
    house: { library: 'phosphor', name: 'HouseIcon' },
    room: { library: 'phosphor', name: 'DoorOpenIcon' },
    bedroom: { library: 'phosphor', name: 'BedIcon' },
    livingroom: { library: 'phosphor', name: 'CouchIcon' },
    diningroom: { library: 'huge', name: 'RestaurantTableIcon' },
    // Videogame consoles, billiards, game zones.
    gameroom: { library: 'phosphor', name: 'GameControllerIcon' },
    box: { library: 'phosphor', name: 'PackageIcon' },
    shelf: { library: 'phosphor', name: 'BooksIcon' },
    library: { library: 'phosphor', name: 'BooksIcon' },
    closet: { library: 'phosphor', name: 'TShirtIcon' },
    drawer: { library: 'phosphor', name: 'ArchiveIcon' },
    warehouse: { library: 'phosphor', name: 'WarehouseIcon' },
    kitchen: { library: 'phosphor', name: 'ForkKnifeIcon' },
    bathroom: { library: 'phosphor', name: 'BathtubIcon' },
    // Laundry, maintenance, cleaning, linen room.
    utility: { library: 'phosphor', name: 'WashingMachineIcon' },
    office: { library: 'phosphor', name: 'BriefcaseIcon' },
    // Music/nail/art studio, workshop, general "make stuff" space.
    studio: { library: 'phosphor', name: 'PaletteIcon' },
    garage: { library: 'phosphor', name: 'GarageIcon' },
    outdoor: { library: 'phosphor', name: 'ParkIcon' },
    // Transition zone, hallway, entryway, corridor.
    hallway: { library: 'phosphor', name: 'FootprintsIcon' },
    other: { library: 'phosphor', name: 'DotsThreeIcon' },
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
