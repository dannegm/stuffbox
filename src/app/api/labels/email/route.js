import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Only Route Handler that touches the Resend key — the PDF itself is built
// entirely client-side (@react-pdf/renderer), this just relays the finished
// bytes as an email attachment.
export const POST = async request => {
    const formData = await request.formData();
    const email = formData.get('email');
    const moveName = formData.get('moveName') ?? 'tu mudanza';
    const file = formData.get('file');

    if (!email || !file) {
        return NextResponse.json({ error: 'email and file are required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
        // Resend's shared sandbox sender — works without verifying a domain.
        // Swap for a verified "from" address on your own Resend domain once
        // you have one.
        from: 'Stuffbox <onboarding@resend.dev>',
        to: email,
        subject: `Etiquetas — ${moveName}`,
        html: `<p>Adjunto van las etiquetas de <strong>${moveName}</strong>.</p>`,
        attachments: [{ filename: 'etiquetas.pdf', content: buffer }],
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
};
