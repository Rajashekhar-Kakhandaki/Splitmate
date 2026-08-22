const prisma = require("../prismaClient");
const { generateUniqueRoomCode } = require("../utils/generateRoomCode");

// Shape a room + its members for API responses.
function serializeRoom(room) {
  return {
    id: room.id,
    roomName: room.roomName,
    roomCode: room.roomCode,
    createdBy: room.createdBy,
    createdAt: room.createdAt,
    members: room.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      joinedAt: m.joinedAt,
    })),
  };
}

const roomInclude = {
  members: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  },
};

// POST /api/rooms — create a room, creator auto-joins as the first member.
async function createRoom(req, res, next) {
  try {
    const { roomName } = req.body;
    const roomCode = await generateUniqueRoomCode();

    const room = await prisma.room.create({
      data: {
        roomName,
        roomCode,
        createdBy: req.user.id,
        members: {
          create: { userId: req.user.id },
        },
      },
      include: roomInclude,
    });

    res.status(201).json({ room: serializeRoom(room) });
  } catch (err) {
    next(err);
  }
}

// POST /api/rooms/join — join an existing room by its code.
async function joinRoom(req, res, next) {
  try {
    const { roomCode } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomCode: roomCode.trim().toUpperCase() },
      include: roomInclude,
    });

    if (!room) {
      return res.status(404).json({ error: "No room found with that code." });
    }

    const alreadyMember = room.members.some((m) => m.user.id === req.user.id);
    if (alreadyMember) {
      return res.json({ room: serializeRoom(room) });
    }

    await prisma.roomMember.create({
      data: { roomId: room.id, userId: req.user.id },
    });

    const updated = await prisma.room.findUnique({
      where: { id: room.id },
      include: roomInclude,
    });

    res.status(201).json({ room: serializeRoom(updated) });
  } catch (err) {
    next(err);
  }
}

// GET /api/rooms — every room the current user belongs to.
async function listRooms(req, res, next) {
  try {
    const rooms = await prisma.room.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: roomInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json({ rooms: rooms.map(serializeRoom) });
  } catch (err) {
    next(err);
  }
}

// GET /api/rooms/:id — a single room's detail, only for its members.
async function getRoom(req, res, next) {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: roomInclude,
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    const isMember = room.members.some((m) => m.user.id === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: "You're not a member of this room." });
    }

    res.json({ room: serializeRoom(room) });
  } catch (err) {
    next(err);
  }
}

module.exports = { createRoom, joinRoom, listRooms, getRoom };
