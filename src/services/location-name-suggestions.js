import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModel } from '@/services/ai';

const schema = z.object({
    name: z
        .string()
        .describe('Nombre corto y útil para el contenedor, basado en su contenido real.'),
});

const RULES = `El nombre debe ser corto (máximo 40 caracteres) y útil para identificar el contenedor de un vistazo — agrupa por categoría/tipo de lo que contiene en vez de listar cada cosa por separado. Puedes combinar hasta 2-3 categorías con "," y "&". No inventes contenido que no te di.

Ejemplo: contenido = "Los Juegos del Hambre" (tag: libro), "Harry Potter" (tag: libro), "Gameboy Pocket" (tag: lego), "Lego Gameboy" (tag: gadget) → nombre: "Libros, Legos & Dispositivos".`;

// Suggests a container name from its full recursive contents (any depth of
// child locations + items, via getLocationContents in src/queries/locations.js)
// — grouped by category/tag rather than restating every item, unlike the
// label description's contents listing (src/services/label-descriptions.js),
// which is meant to spare someone from opening the box, not to name it.
export const generateLocationNameSuggestion = async ({ items = [], locations = [] }) => {
    if (items.length === 0 && locations.length === 0) {
        throw new Error('Este contenedor no tiene contenido para sugerir un nombre.');
    }

    const itemLines = items.map(item => {
        const tags = item.item_tags?.map(({ tags }) => tags.name) ?? [];
        return tags.length > 0 ? `${item.name} (${tags.join(', ')})` : item.name;
    });

    const { object } = await generateObject({
        model: getAIModel(),
        schema,
        prompt: `Contenido de un contenedor de un inventario doméstico:
${itemLines.length > 0 ? `Items: ${itemLines.join('; ')}` : ''}
${locations.length > 0 ? `Sub-espacios: ${locations.map(location => location.name).join(', ')}` : ''}

${RULES}`,
    });

    return object.name.trim();
};
