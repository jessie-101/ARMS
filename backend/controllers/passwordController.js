const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { sendMail } = require("../utils/mailer");

const TABLES = { student: "students", supervisor: "supervisors", admin: "administrators" };

function sha256(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

exports.requestReset = (req, res) => {
    const { email, userType } = req.body;
    const table = TABLES[userType];
    if (!email || !table) {
        return res.status(400).json({ message: "Email and account type are required" });
    }
    const generic = { message: "If that email is registered, a reset link has been sent." };

const emailColumn = userType === "student"
    ? "(email = ? OR alternate_email = ?)"
    : "email = ?";

const params = userType === "student"
    ? [email, email]
    : [email];

db.query(`SELECT email, alternate_email FROM ${table} WHERE ${emailColumn} LIMIT 1`, params, (err, rows) => {
    if (err) {
        console.log("MYSQL ERROR (requestReset lookup):", err);
        return res.status(500).json({ message: "Something went wrong" });
    }

    if (rows.length === 0) return res.status(200).json(generic);

    const primaryEmail = rows[0].email;
    const token = crypto.randomBytes(32).toString("hex");

    const insertSql = `
        INSERT INTO password_resets (user_type, email, token_hash, expires_at)
        VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
    `;
db.query(insertSql, [userType, primaryEmail, sha256(token)], (insErr) => {
        if (insErr) {
            console.log("MYSQL ERROR (requestReset insert):", insErr);
            return res.status(500).json({ message: "Something went wrong" });
        }

        const link = `${process.env.FRONTEND_URL}/pages/reset-password.html?token=${token}&type=${userType}`;
        const text = `You asked to reset your ARMS password.\n\nOpen this link within 1 hour:\n${link}\n\nIf you did not ask for this, ignore this email.`;

        sendMail(email, "ARMS password reset", text, (mailErr) => {
            if (mailErr) console.log("MAIL ERROR:", mailErr);
            res.status(200).json(generic);
        });
    });
});
};

exports.resetPassword = (req, res) => {
    const { token, userType, password } = req.body;
    const table = TABLES[userType];
    if (!token || !table || !password) {
        return res.status(400).json({ message: "Token, account type and new password are required" });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const findSql = `
        SELECT reset_id, email FROM password_resets
        WHERE token_hash = ? AND user_type = ? AND used = 0 AND expires_at > NOW()
        LIMIT 1
    `;
    db.query(findSql, [sha256(token), userType], (err, rows) => {
        if (err) {
            console.log("MYSQL ERROR (resetPassword lookup):", err);
            return res.status(500).json({ message: "Something went wrong" });
        }
        if (rows.length === 0) {
            return res.status(400).json({ message: "This reset link is invalid or has expired" });
        }
        const reset = rows[0];
        bcrypt.hash(password, 10, (hashErr, hashed) => {
            if (hashErr) {
                console.log("BCRYPT ERROR:", hashErr);
                return res.status(500).json({ message: "Something went wrong" });
            }
            db.query(`UPDATE ${table} SET password = ? WHERE email = ?`, [hashed, reset.email], (updErr) => {
                if (updErr) {
                    console.log("MYSQL ERROR (resetPassword update):", updErr);
                    return res.status(500).json({ message: "Something went wrong" });
                }
                db.query("UPDATE password_resets SET used = 1 WHERE reset_id = ?", [reset.reset_id], () => {
                    res.status(200).json({ message: "Password reset successfully. You can now log in." });
                });
            });
        });
    });
};