const prisma = require("../prismaClient");

// Characters chosen to avoid visually ambiguous pairs (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function randomCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

// Generates a room code and retries on the rare collision.
async function generateUniqueRoomCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await prisma.room.findUnique({ where: { roomCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique room code. Try again.");
}

module.exports = { generateUniqueRoomCode };
