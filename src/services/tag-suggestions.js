import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModel } from '@/services/ai';
import { LIBRARIES, matchesQuery } from '@/ui/icon-picker';

const MAX_SEARCH_TERMS = 6;
const MAX_ICON_QUERIES = 6;
const MAX_RELATED_ICONS = 8;
const MAX_MATCHES_PER_QUERY = 2;

const schema = z.object({
    searchTerms: z
        .array(z.string())
        .describe(
            'Palabras o frases en español — sinónimos, categorías más amplias o conceptos relacionados — que alguien podría escribir para encontrar este tag.',
        ),
    iconQueries: z
        .array(z.string())
        .describe(
            'English keywords (one or two words each) describing icons visually or conceptually related to this tag, for searching icon libraries such as Phosphor and Lucide.',
        ),
});

// Icon names come from the model as free-text keywords, never as exact
// {library,name} pairs — an LLM has no reliable knowledge of which exact
// PascalCase icon identifiers exist across four different icon libraries,
// so trusting a hallucinated name would silently break DynamicIcon. Instead
// each keyword is resolved against the real icon lists (same data +
// matching logic IconPicker itself searches with), guaranteeing every
// suggestion is real.
const findIconsForQuery = (query, exclude) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    outer: for (const library of LIBRARIES) {
        for (const icon of library.icons) {
            if (!matchesQuery(icon, q)) continue;
            const candidate = { library: library.value, name: icon.name };
            if (exclude && exclude === `${candidate.library}:${candidate.name}`) continue;
            matches.push(candidate);
            if (matches.length >= MAX_MATCHES_PER_QUERY) break outer;
        }
    }
    return matches;
};

// Generates sub-tag search terms + related icons for a tag from its name
// and (optionally) its currently-chosen icon — used by the "Generar
// sugerencias" button in TagDialog. Never writes anything itself; the
// caller decides how to merge the result into form state.
export const generateTagSuggestions = async ({ name, icon }) => {
    const currentIconContext = icon
        ? `El ícono actual del tag es "${icon.name}" de la librería ${icon.library}.`
        : 'El tag todavía no tiene un ícono elegido.';

    const { object } = await generateObject({
        model: getAIModel(),
        schema,
        prompt: `Tag de un inventario doméstico llamado "${name}". ${currentIconContext}

Sugiere hasta ${MAX_SEARCH_TERMS} términos de búsqueda en español (sinónimos, categorías más amplias o conceptos relacionados) para que este tag también aparezca al buscar por esos términos.

Sugiere también hasta ${MAX_ICON_QUERIES} palabras clave en inglés (una o dos palabras cada una) que describan íconos relacionados visual o conceptualmente con este tag.`,
    });

    const excludeKey = icon ? `${icon.library}:${icon.name}` : null;
    const seen = new Set(excludeKey ? [excludeKey] : []);
    const relatedIcons = [];

    for (const query of object.iconQueries.slice(0, MAX_ICON_QUERIES)) {
        for (const candidate of findIconsForQuery(query, excludeKey)) {
            const key = `${candidate.library}:${candidate.name}`;
            if (seen.has(key)) continue;
            seen.add(key);
            relatedIcons.push(candidate);
            if (relatedIcons.length >= MAX_RELATED_ICONS) break;
        }
        if (relatedIcons.length >= MAX_RELATED_ICONS) break;
    }

    return {
        searchTerms: object.searchTerms.slice(0, MAX_SEARCH_TERMS),
        relatedIcons,
    };
};
