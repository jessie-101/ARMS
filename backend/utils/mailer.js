function sendMail(to, subject, text, callback) {
    fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": process.env.BREVO_API_KEY
        },
        body: JSON.stringify({
            sender: { name: "ARMS", email: process.env.MAIL_FROM },
            to: [{ email: to }],
            subject: subject,
            textContent: text
        })
    })
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`Brevo ${response.status}: ${await response.text()}`);
            }
            callback(null);
        })
        .catch((err) => callback(err));
}

module.exports = { sendMail };