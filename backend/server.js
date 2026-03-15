const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/authRoutes");
const accountRoutes = require("./routes/accountRoutes");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
	cors({
		origin: frontendUrl,
		credentials: true,
	})
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
	res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);

app.use((err, _req, res, _next) => {
	const status = err.status || 500;
	res.status(status).json({
		message: err.message || "Internal server error",
	});
});

app.listen(port, () => {
	// Keep startup output simple for local development.
	console.log(`Server running on http://localhost:${port}`);
});
