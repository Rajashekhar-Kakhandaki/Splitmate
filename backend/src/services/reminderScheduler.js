const prisma = require("../prismaClient");
const nodemailer = require("nodemailer");
const { getBalancesAndSuggestions } = require("../controllers/settlement.controller");

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function checkAndSendOverdueReminders() {
  try {
    const rooms = await prisma.room.findMany({
      select: { id: true, roomName: true },
    });

    for (const room of rooms) {
      try {
        const { suggestions } = await getBalancesAndSuggestions(room.id);
        const overdueSuggestions = suggestions.filter((s) => s.isOverdue);

        for (const suggestion of overdueSuggestions) {
          const [debtor, creditor] = await Promise.all([
            prisma.user.findUnique({ where: { id: suggestion.from }, select: { name: true, email: true } }),
            prisma.user.findUnique({ where: { id: suggestion.to }, select: { name: true, upiId: true } }),
          ]);

          if (!debtor || !creditor) continue;

          const amountFormatted = Number(suggestion.amount).toFixed(2);
          const upiPaymentLink = creditor.upiId ? `upi://pay?pa=${encodeURIComponent(creditor.upiId)}&pn=${encodeURIComponent(creditor.name)}&am=${amountFormatted}&cu=INR` : null;

          if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
              const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === "true",
                auth: {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASS,
                },
              });

              await transporter.sendMail({
                from: `"SplitMate Automated Reminder" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: debtor.email,
                subject: `⏰ Overdue Debt Notice: ₹${amountFormatted} owed in ${room.roomName}`,
                text: `Hi ${debtor.name},\n\nThis is an automated reminder that you have an unpaid balance of ₹${amountFormatted} owed to ${creditor.name} in "${room.roomName}" which is more than 7 days overdue.\n\n${creditor.upiId ? `Creditor UPI ID: ${creditor.upiId}\nUPI Pay Link: ${upiPaymentLink}\n\n` : ''}Please open SplitMate to settle up as soon as possible.\n\nThank you!`,
                html: `<p>Hi <strong>${debtor.name}</strong>,</p><p>This is an automated reminder that you have an unpaid balance of <strong>₹${amountFormatted}</strong> owed to <strong>${creditor.name}</strong> in group "<em>${room.roomName}</em>" which is more than 7 days overdue.</p>${creditor.upiId ? `<p><strong>Creditor UPI ID:</strong> ${creditor.upiId}</p>` : ''}<p>Please open SplitMate to settle up as soon as possible.</p>`,
              });
              console.log(`[AUTOMATED REMINDER] Sent 7-day overdue notification email to ${debtor.email} for ₹${amountFormatted}`);
            } catch (mailErr) {
              console.error(`[AUTOMATED REMINDER] Failed to send email to ${debtor.email}:`, mailErr.message);
            }
          } else {
            console.log("\n===========================================");
            console.log(`[AUTOMATED REMINDER] (MOCK EMAIL) 7-Day Overdue Balance`);
            console.log(`TO: ${debtor.email}`);
            console.log(`DEBT: ₹${amountFormatted} owed by ${debtor.name} to ${creditor.name} in room "${room.roomName}"`);
            console.log("===========================================\n");
          }
        }
      } catch (roomErr) {
        console.error(`Error processing overdue reminders for room ${room.id}:`, roomErr.message);
      }
    }
  } catch (err) {
    console.error("Error running checkAndSendOverdueReminders:", err.message);
  }
}

function startReminderScheduler() {
  // Initial run 30s after server startup
  setTimeout(() => {
    checkAndSendOverdueReminders();
  }, 30000);

  // Run every 24 hours
  setInterval(() => {
    checkAndSendOverdueReminders();
  }, 24 * 60 * 60 * 1000);
}

module.exports = { startReminderScheduler, checkAndSendOverdueReminders };
