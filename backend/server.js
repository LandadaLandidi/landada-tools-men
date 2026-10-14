
import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
res.json({
status: "online",
service: "Landada Cobalt Backend",
message: "Backend berhasil berjalan."
});
});

app.listen(PORT, "0.0.0.0", () => {
console.log("Backend berjalan pada port ${PORT}");
});
