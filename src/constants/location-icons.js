// Default icon per free-text `locations.type`, keyed lowercase. Editable per
// the plan (§11) — a location's own `icon` jsonb always wins over this map.
export const DEFAULT_LOCATION_ICONS = {
    house: { library: 'huge', name: 'House03Icon' },
    room: { library: 'huge', name: 'DoorOpenIcon' },
    box: { library: 'huge', name: 'Package01Icon' },
    shelf: { library: 'huge', name: 'LibraryIcon' },
    library: { library: 'huge', name: 'LibraryIcon' },
    closet: { library: 'huge', name: 'ShirtIcon' },
    drawer: { library: 'huge', name: 'Archive01Icon' },
    warehouse: { library: 'huge', name: 'WarehouseIcon' },
    kitchen: { library: 'huge', name: 'KitchenUtensilsIcon' },
    bathroom: { library: 'huge', name: 'BathtubIcon' },
    office: { library: 'huge', name: 'Briefcase03Icon' },
    garage: { library: 'huge', name: 'GarageIcon' },
};

export const FALLBACK_LOCATION_ICON = { library: 'huge', name: 'Folder01Icon' };
export const FALLBACK_ITEM_ICON = { library: 'huge', name: 'Package02Icon' };
export const FALLBACK_TAG_ICON = { library: 'huge', name: 'DiscountTagIcon' };

// Common type presets offered when creating a location — free text, not an
// enum, so this is a shortlist of suggestions rather than a hard constraint.
export const LOCATION_TYPE_PRESETS = Object.keys(DEFAULT_LOCATION_ICONS).filter(
    type => type !== 'library',
);

// Root-level locations only offer these two — a room/box/etc. can't be a
// tree root, so they're excluded from the house-creation type picker.
export const ROOT_LOCATION_TYPE_PRESETS = ['house', 'warehouse'];

// A small curated set for the house-creation icon picker — not a full
// searchable library (that's a separate feature, see icon-picker in pinia).
export const HOUSE_ICON_CHOICES = [
    'House01Icon',
    'House02Icon',
    'House03Icon',
    'House04Icon',
    'GuestHouseIcon',
    'CottageIcon',
    'VillaIcon',
    'ApartmentIcon',
    'Building01Icon',
    'CastleIcon',
    'WarehouseIcon',
    'TentIcon',
    'Tree01Icon',
    'GarageIcon',
].map(name => ({ library: 'huge', name }));
