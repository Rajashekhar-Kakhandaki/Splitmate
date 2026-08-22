const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const prisma = require("../prismaClient");

async function loadMembership(roomId, userId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: { select: { userId: true } } },
  });

  if (!room) {
    const err = new Error("Room not found.");
    err.status = 404;
    throw err;
  }

  const isMember = room.members.some((m) => m.userId === userId);
  if (!isMember) {
    const err = new Error("You're not a member of this room.");
    err.status = 403;
    throw err;
  }

  return room;
}

function formatRupees(amount) {
  return `Rs. ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// GET /api/rooms/:id/report?month=YYYY-MM
// Streams a one-page PDF: total spend + category breakdown for the given
// month (defaults to the current month), plus the expense list.
async function downloadMonthlyReport(req, res, next) {
  try {
    const roomId = req.params.id;
    const room = await loadMembership(roomId, req.user.id);

    const monthParam = req.query.month; // "2026-08"
    const now = new Date();
    const year = monthParam ? Number(monthParam.split("-")[0]) : now.getFullYear();
    const monthIndex = monthParam ? Number(monthParam.split("-")[1]) - 1 : now.getMonth();

    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 1);
    const monthLabel = start.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    const expenses = await prisma.expense.findMany({
      where: { roomId, date: { gte: start, lt: end } },
      include: { payer: { select: { name: true } } },
      orderBy: { date: "asc" },
    });

    const roomRecord = await prisma.room.findUnique({ where: { id: roomId } });

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const byCategory = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="splitmate-${roomRecord.roomName.replace(/\s+/g, "_")}-${monthLabel.replace(/\s+/g, "_")}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(20).text("SplitMate — Monthly Report", { align: "left" });
    doc.moveDown(0.2);
    doc.fontSize(12).fillColor("#555").text(`${roomRecord.roomName} · ${monthLabel}`);
    doc.moveDown(1);

    doc.fillColor("#000").fontSize(14).text("Summary");
    doc.moveDown(0.3);
    doc.fontSize(11).text(`Total spend: ${formatRupees(total)}`);
    doc.text(`Expenses logged: ${expenses.length}`);
    doc.moveDown(1);

    doc.fontSize(14).text("By category");
    doc.moveDown(0.3);
    doc.fontSize(11);
    const categories = Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a]);
    if (categories.length === 0) {
      doc.fillColor("#777").text("No expenses this month.");
    } else {
      for (const cat of categories) {
        const pct = total > 0 ? Math.round((byCategory[cat] / total) * 100) : 0;
        doc.fillColor("#000").text(`${cat}: ${formatRupees(byCategory[cat])} (${pct}%)`);
      }
    }
    doc.moveDown(1);

    doc.fontSize(14).fillColor("#000").text("Expenses");
    doc.moveDown(0.3);
    doc.fontSize(10);
    if (expenses.length === 0) {
      doc.fillColor("#777").text("Nothing logged for this month yet.");
    } else {
      for (const e of expenses) {
        const dateLabel = e.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        doc
          .fillColor("#000")
          .text(`${dateLabel} — ${e.title} (${e.category}) — ${formatRupees(e.amount)} — paid by ${e.payer.name}`);
      }
    }

    doc.end();
  } catch (err) {
    next(err);
  }
}

// GET /api/rooms/:id/report/excel?month=YYYY-MM
// Streams an .xlsx with two sheets: expense list and category summary.
async function downloadExcelReport(req, res, next) {
  try {
    const roomId = req.params.id;
    const room = await loadMembership(roomId, req.user.id);

    const monthParam = req.query.month;
    const now = new Date();
    const year = monthParam ? Number(monthParam.split("-")[0]) : now.getFullYear();
    const monthIndex = monthParam ? Number(monthParam.split("-")[1]) - 1 : now.getMonth();

    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 1);
    const monthLabel = start.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    const expenses = await prisma.expense.findMany({
      where: { roomId, date: { gte: start, lt: end } },
      include: {
        payer: { select: { name: true } },
        shares: { include: { member: { select: { name: true } } } },
      },
      orderBy: { date: "asc" },
    });

    const roomRecord = await prisma.room.findUnique({ where: { id: roomId } });
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SplitMate";
    workbook.created = new Date();

    // ── Sheet 1: Expense List ──
    const sheet1 = workbook.addWorksheet("Expenses");
    sheet1.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Title", key: "title", width: 28 },
      { header: "Category", key: "category", width: 14 },
      { header: "Paid By", key: "paidBy", width: 16 },
      { header: "Amount (₹)", key: "amount", width: 14 },
      { header: "Split Between", key: "split", width: 36 },
    ];

    // Style the header row
    const headerRow = sheet1.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFF5EFDE" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14251C" } };
      cell.alignment = { vertical: "middle" };
    });
    headerRow.height = 22;

    for (const e of expenses) {
      sheet1.addRow({
        date: e.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        title: e.title,
        category: e.category,
        paidBy: e.payer.name,
        amount: Number(e.amount),
        split: e.shares.map((s) => `${s.member.name} (₹${Number(s.shareAmount).toFixed(2)})`).join(", "),
      });
    }

    // Totals row
    const totalRow = sheet1.addRow({ title: "TOTAL", amount: Math.round(total * 100) / 100 });
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    // ── Sheet 2: Category Summary ──
    const sheet2 = workbook.addWorksheet("Summary");
    sheet2.columns = [
      { header: "Category", key: "category", width: 18 },
      { header: "Total (₹)", key: "total", width: 14 },
      { header: "% of Spend", key: "pct", width: 14 },
    ];

    const summaryHeader = sheet2.getRow(1);
    summaryHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFF5EFDE" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB08D57" } };
      cell.alignment = { vertical: "middle" };
    });
    summaryHeader.height = 22;

    const byCategory = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    }
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    for (const [cat, catTotal] of sorted) {
      sheet2.addRow({
        category: cat,
        total: Math.round(catTotal * 100) / 100,
        pct: total > 0 ? `${Math.round((catTotal / total) * 100)}%` : "—",
      });
    }
    // Grand total
    const gtRow = sheet2.addRow({ category: "TOTAL", total: Math.round(total * 100) / 100, pct: "100%" });
    gtRow.eachCell((cell) => { cell.font = { bold: true }; });

    const safeName = roomRecord.roomName.replace(/\s+/g, "_");
    const safeMonth = monthLabel.replace(/\s+/g, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="splitmate-${safeName}-${safeMonth}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

module.exports = { downloadMonthlyReport, downloadExcelReport };

