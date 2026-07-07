const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretgymkey123";

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Akses ditolak, token tidak ditemukan." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token tidak valid atau telah kedaluwarsa." });
    }
    
    // Simpan payload user ({ id, username }) ke req.user agar endpoint berikutnya tahu siapa yang mengakses
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
