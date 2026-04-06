const express = require("express");
const { authenticate } = require("../middleware/auth");
const { getAllBooks, getBookById, createBook, updateBook, deleteBook } = require("../controllers/bookController");

const router = express.Router();

// Rutas públicas
router.get("/", getAllBooks);
router.get("/:id", getBookById);

// Rutas protegidas (requieren JWT)
router.post("/", authenticate, createBook);
router.put("/:id", authenticate, updateBook);
router.delete("/:id", authenticate, deleteBook);

module.exports = router;
