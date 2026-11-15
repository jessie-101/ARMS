const jwt = require("jsonwebtoken");

// Verifies the JWT sent in the Authorization header.
// Usage on a protected route:
//   router.get("/profile", verifyToken, studentController.getProfile);
const verifyToken = (req, res, next) => {

    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {

        if (err) {
            return res.status(403).json({
                message: "Invalid or expired token"
            });
        }

        // Attach decoded payload (student_id, email, role) to the request
        req.user = decoded;
        next();
    });
};

module.exports = { verifyToken };