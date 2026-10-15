import express from "express";

const app = express();

app.use(express.static("web"));
app.get("/api/health", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`http://localhost:${port}`));
