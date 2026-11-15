const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
});

function sendMail(to, subject, text, callback) {
    transporter.sendMail(
        { from: `"ARMS" <${process.env.MAIL_USER}>`, to, subject, text },
        callback
    );
}

module.exports = { sendMail };