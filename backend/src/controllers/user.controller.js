const bcrypt = require("bcrypt");
const prisma = require("../prismaClient");

const SALT_ROUNDS = 10;

// PUT /api/user/profile
async function updateProfile(req, res, next) {
  try {
    const { name, email, avatarUrl } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ error: "Email is already in use by another account." });
      }
      updateData.email = email;
    }
    
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });

    res.json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
}

// PUT /api/user/password
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Incorrect current password." });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateProfile, changePassword };
