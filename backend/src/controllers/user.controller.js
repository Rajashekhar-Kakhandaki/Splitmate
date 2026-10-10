const bcrypt = require("bcrypt");
const prisma = require("../prismaClient");

const SALT_ROUNDS = 10;

// PUT /api/user/profile
async function updateProfile(req, res, next) {
  try {
    const { name, email, avatarUrl, upiId, phoneNumber } = req.body;
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

    if (upiId !== undefined) {
      updateData.upiId = upiId ? upiId.trim() : null;
    }

    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber ? phoneNumber.trim() : null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, avatarUrl: true, upiId: true, phoneNumber: true, createdAt: true },
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

// DELETE /api/user/account — permanently delete user account from SplitMate
async function deleteUserAccount(req, res, next) {
  try {
    const userId = req.user.id;

    // Delete rooms created by user (cascades to room members, expenses, recurring, budget)
    await prisma.room.deleteMany({ where: { createdBy: userId } });

    // Delete user memberships in other rooms
    await prisma.roomMember.deleteMany({ where: { userId } });

    // Delete personal expenses
    await prisma.personalExpense.deleteMany({ where: { userId } });

    // Delete recurring expenses where user is payer
    await prisma.recurringExpense.deleteMany({ where: { paidBy: userId } });

    // Delete settlements involving user
    await prisma.settlement.deleteMany({
      where: { OR: [{ payer: userId }, { receiver: userId }] },
    });

    // Delete expense shares
    await prisma.expenseShare.deleteMany({ where: { memberId: userId } });

    // Delete expenses paid by user
    await prisma.expense.deleteMany({ where: { paidBy: userId } });

    // Delete user account
    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true, message: "Account deleted successfully." });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateProfile, changePassword, deleteUserAccount };
