import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

export const correoHabilitado = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);

export const REMITENTE = GMAIL_USER
    ? `"Gestion de Flota SENA" <${GMAIL_USER}>`
    : 'Gestion de Flota SENA';

export const transporter = correoHabilitado
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
    : null;
