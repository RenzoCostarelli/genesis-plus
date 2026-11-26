import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const prerender = false;

const REQUIRED_FIELDS = ["nombre", "contacto", "tipo_espacio", "ubicacion", "mensaje"] as const;

function jsonResponse(body: Record<string, unknown>, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export const POST: APIRoute = async ({ request }) => {
	const formData = await request.formData();

	const fields: Record<string, string> = {};
	for (const field of REQUIRED_FIELDS) {
		const value = formData.get(field)?.toString().trim() ?? "";
		if (!value) {
			return jsonResponse({ error: `Falta el campo "${field}".` }, 400);
		}
		fields[field] = value;
	}

	const { nombre, contacto, tipo_espacio, ubicacion, mensaje } = fields;

	const { GMAIL_USER, GMAIL_APP_PASSWORD } = import.meta.env;
	if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
		console.error("Faltan las variables de entorno GMAIL_USER / GMAIL_APP_PASSWORD");
		return jsonResponse({ error: "El formulario no está configurado todavía." }, 500);
	}

	const transporter = nodemailer.createTransport({
		service: "gmail",
		auth: {
			user: GMAIL_USER,
			pass: GMAIL_APP_PASSWORD,
		},
	});

	try {
		await transporter.sendMail({
			from: `"Formulario Genesis Plus" <${GMAIL_USER}>`,
			to: GMAIL_USER,
			replyTo: contacto,
			subject: `Nueva consulta de ${nombre}`,
			text: [
				`Nombre: ${nombre}`,
				`Contacto: ${contacto}`,
				`Tipo de espacio: ${tipo_espacio}`,
				`Ubicación: ${ubicacion}`,
				"",
				"Mensaje:",
				mensaje,
			].join("\n"),
			html: `
				<h2>Nueva consulta desde la web</h2>
				<p><strong>Nombre:</strong> ${nombre}</p>
				<p><strong>Contacto:</strong> ${contacto}</p>
				<p><strong>Tipo de espacio:</strong> ${tipo_espacio}</p>
				<p><strong>Ubicación:</strong> ${ubicacion}</p>
				<p><strong>Mensaje:</strong></p>
				<p>${mensaje.replace(/\n/g, "<br />")}</p>
			`,
		});

		return jsonResponse({ success: true }, 200);
	} catch (error) {
		console.error("Error al enviar el mail de contacto:", error);
		return jsonResponse({ error: "No se pudo enviar la consulta. Intentá de nuevo más tarde." }, 500);
	}
};
