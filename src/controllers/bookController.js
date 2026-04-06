const { v4: uuidv4 } = require("uuid");

// Almacenamiento en memoria (reemplazar por DB en producción)
const books = new Map();

function getAllBooks(_req, res) {
  const list = Array.from(books.values());
  res.json({ count: list.length, books: list });
}

function getBookById(req, res) {
  const book = books.get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: "Libro no encontrado" });
  }

  res.json(book);
}

function createBook(req, res) {
  const { title, author, year, genre, isbn } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: "Se requieren title y author" });
  }

  if (typeof title !== "string" || title.length > 500) {
    return res.status(400).json({ error: "Título inválido" });
  }

  if (typeof author !== "string" || author.length > 300) {
    return res.status(400).json({ error: "Autor inválido" });
  }

  if (year !== undefined && (typeof year !== "number" || year < 0 || year > new Date().getFullYear())) {
    return res.status(400).json({ error: "Año inválido" });
  }

  const id = uuidv4();
  const book = {
    id,
    title: title.trim(),
    author: author.trim(),
    year: year || null,
    genre: typeof genre === "string" ? genre.trim() : null,
    isbn: typeof isbn === "string" ? isbn.trim() : null,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
  };

  books.set(id, book);
  res.status(201).json(book);
}

function updateBook(req, res) {
  const book = books.get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: "Libro no encontrado" });
  }

  if (book.createdBy !== req.user.id) {
    return res.status(403).json({ error: "No tenés permiso para editar este libro" });
  }

  const { title, author, year, genre, isbn } = req.body;

  if (title !== undefined) {
    if (typeof title !== "string" || title.length > 500) {
      return res.status(400).json({ error: "Título inválido" });
    }
    book.title = title.trim();
  }

  if (author !== undefined) {
    if (typeof author !== "string" || author.length > 300) {
      return res.status(400).json({ error: "Autor inválido" });
    }
    book.author = author.trim();
  }

  if (year !== undefined) {
    if (typeof year !== "number" || year < 0 || year > new Date().getFullYear()) {
      return res.status(400).json({ error: "Año inválido" });
    }
    book.year = year;
  }

  if (genre !== undefined) book.genre = typeof genre === "string" ? genre.trim() : null;
  if (isbn !== undefined) book.isbn = typeof isbn === "string" ? isbn.trim() : null;

  book.updatedAt = new Date().toISOString();
  books.set(book.id, book);
  res.json(book);
}

function deleteBook(req, res) {
  const book = books.get(req.params.id);

  if (!book) {
    return res.status(404).json({ error: "Libro no encontrado" });
  }

  if (book.createdBy !== req.user.id) {
    return res.status(403).json({ error: "No tenés permiso para eliminar este libro" });
  }

  books.delete(req.params.id);
  res.status(204).end();
}

module.exports = { getAllBooks, getBookById, createBook, updateBook, deleteBook };
