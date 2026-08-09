import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModel } from '@/services/ai';

const ITEM_RULES = `No repitas el nombre ni digas que falta información — si no hay nada que aporte valor real más allá del nombre, responde con una cadena vacía. Sin frases de relleno. Máximo 120 caracteres.`;

// The whole point of a container label is to save someone from opening the
// box to see what's in it — a vague category sentence ("Colección de
// legos") doesn't do that, a concrete listing does. Few-shot examples here
// carry more weight than an abstract instruction would.
const CONTAINER_RULES = `Lista los nombres reales de lo que hay dentro — nunca una descripción genérica de categoría. Usa solo los nombres que te doy, no inventes ninguno.

Mal: "Colección de legos"
Bien: "Apollo 11, Guitarra Fender, otros"

Si hay grupos de tipos distintos, agrúpalos así: "Legos (Apollo 11, Guitarra, otros) + Llaveros de Zelda".

No repitas el nombre del contenedor. No digas que falta información — si no hay nada que listar, responde con una cadena vacía. Máximo 150 caracteres; si no caben todos los nombres, prioriza los más distintivos y agrega "otros".`;

const schema = z.object({
    description: z
        .string()
        .describe(
            'Texto breve para una etiqueta impresa, en español, o cadena vacía si no aporta nada más allá del nombre.',
        ),
});

// Metadata-driven description for an item label — only calls the model when
// there's actually something to summarize beyond the name (tags, condition,
// notes, sentimental value, more than one unit). Otherwise a real item like
// "Taza" with no other data would still hallucinate filler text.
export const generateItemLabelDescription = async ({
    name,
    description,
    quantity,
    condition,
    sentimentalValue,
    tags = [],
}) => {
    const hasMetadata = !!description || tags.length > 0 || !!condition || !!sentimentalValue || quantity > 1;
    if (!hasMetadata) return '';

    const { object } = await generateObject({
        model: getAIModel(),
        schema,
        prompt: `Item de un inventario doméstico llamado "${name}".
${description ? `Notas: ${description}` : ''}
${quantity > 1 ? `Cantidad: ${quantity}` : ''}
${condition ? `Condición: ${condition}` : ''}
${tags.length > 0 ? `Tags: ${tags.join(', ')}` : ''}
${sentimentalValue ? `Valor sentimental: ${sentimentalValue}/5` : ''}

${ITEM_RULES}`,
    });

    return object.description.trim();
};

// Content-driven description for a container/location label — based on its
// direct children (items + child locations), not a recursive dump. Same
// empty-on-nothing-to-say guard as the item version.
export const generateContainerLabelDescription = async ({
    name,
    type,
    childItemNames = [],
    childLocationNames = [],
}) => {
    if (childItemNames.length === 0 && childLocationNames.length === 0) return '';

    const { object } = await generateObject({
        model: getAIModel(),
        schema,
        prompt: `Contenedor de un inventario doméstico llamado "${name}" (tipo: ${type}).
${childItemNames.length > 0 ? `Contiene los items: ${childItemNames.join(', ')}` : ''}
${childLocationNames.length > 0 ? `Contiene los sub-espacios: ${childLocationNames.join(', ')}` : ''}

${CONTAINER_RULES}`,
    });

    return object.description.trim();
};
