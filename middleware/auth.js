// middleware/auth.js
export function requireApiKey(req, res, next) {
  const provided = req.header("x-api-key");
  const expected = process.env.API_KEY;

  if (!expected) {
    return res
      .status(500)
      .json({ message: "API_KEY no configurada en el servidor" });
  }
  if (!provided || provided !== expected) {
    return res.status(401).json({ message: "No autorizado" });
  }
  next();
}
