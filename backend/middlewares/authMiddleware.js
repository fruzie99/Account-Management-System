const { supabase } = require("../config/supabaseClient");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing authorization token." });
  }

  const accessToken = authHeader.slice(7).trim();

  if (!accessToken) {
    return res.status(401).json({ message: "Invalid authorization token." });
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  req.user = data.user;
  req.accessToken = accessToken;
  return next();
};

module.exports = authMiddleware;