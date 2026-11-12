import {
  calculateCommission,
  filterPeriod,
  type Appointment,
  type Client,
  type Period,
} from "./domain";
export function financeRows(
  appointments: Appointment[],
  clients: Client[],
  period: Period,
  date: string,
) {
  return filterPeriod(appointments, period, date)
    .filter((a) => a.status === "Concluído")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map((a) => {
      const client = a.clientId
        ? clients.find((c) => c.id === a.clientId)
        : clients.find((c) => c.name === a.client);
      const received = a.paymentMethod ? a.value : 0;
      const payout = calculateCommission(a);
      return {
        date: a.date,
        time: a.time,
        client: a.client,
        document: client?.document ?? "",
        professional: a.professional,
        procedure: a.procedure,
        value: a.value,
        payment: a.paymentMethod ?? "Não pago",
        received,
        pending: a.value - received,
        payout,
        paidPayout: a.paymentMethod ? payout : 0,
      };
    });
}
export type FinanceRow = ReturnType<typeof financeRows>[number];
export async function financeWorkbook(
  rows: FinanceRow[],
  establishment: string,
  periodLabel: string,
) {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.creator = establishment;
  const sheet = book.addWorksheet("Financeiro");
  sheet.columns = [
    { width: 14 },
    { width: 10 },
    { width: 28 },
    { width: 23 },
    { width: 26 },
    { width: 40 },
    ...Array.from({ length: 7 }, () => ({ width: 20 })),
  ];
  sheet.mergeCells("A1:M1");
  sheet.getCell("A1").value = `${establishment} · Financeiro`;
  sheet.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FF24476B" },
  };
  sheet.getRow(1).height = 28;
  sheet.mergeCells("A2:M2");
  sheet.getCell("A2").value =
    `${periodLabel} · Dados demonstrativos · Serviços concluídos`;
  sheet.mergeCells("A3:M3");
  sheet.getCell("A3").value =
    "Saldo antes de despesas = recebido menos repasses dos serviços pagos. Não representa lucro. Documento informado no cadastro; sem validação fiscal.";
  sheet.getRow(3).height = 32;
  sheet.getCell("A3").alignment = { wrapText: true, vertical: "middle" };
  sheet.addRow([]);
  const headers = [
    "Data",
    "Horário",
    "Cliente",
    "CPF/CNPJ",
    "Profissional",
    "Procedimentos",
    "Valor (R$)",
    "Pagamento",
    "Recebido (R$)",
    "A receber (R$)",
    "Repasse (R$)",
    "Repasse pago* (R$)",
    "Saldo antes despesas (R$)",
  ];
  sheet.addRow(headers);
  sheet.getRow(5).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF24476B" },
    };
    cell.alignment = { wrapText: true, vertical: "middle" };
  });
  sheet.getRow(5).height = 34;
  for (const row of rows) {
    // All customer input remains literal text, never an Excel formula.
    const added = sheet.addRow([
      row.date.split("-").reverse().join("/"),
      row.time,
      row.client,
      row.document,
      row.professional,
      row.procedure,
      row.value,
      row.payment,
      row.received,
      row.pending,
      row.payout,
      row.paidPayout,
      row.received - row.paidPayout,
    ]);
    added.height = 32;
    added.alignment = { wrapText: true, vertical: "middle" };
    added.getCell(4).numFmt = "@";
    for (const col of [7, 9, 10, 11, 12, 13])
      added.getCell(col).numFmt = '"R$" #,##0.00';
  }
  sheet.views = [{ state: "frozen", ySplit: 5 }];
  sheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: Math.max(5, 5 + rows.length), column: 13 },
  };
  const total = sheet.addRow(["TOTAL"]);
  total.font = { bold: true };
  for (const col of [7, 9, 10, 11, 12, 13]) {
    total.getCell(col).value = rows.length
      ? {
          formula: `SUM(${String.fromCharCode(64 + col)}6:${String.fromCharCode(64 + col)}${5 + rows.length})`,
          result: rows.reduce(
            (sum, row) =>
              sum +
              [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                row.value,
                0,
                row.received,
                row.pending,
                row.payout,
                row.paidPayout,
                row.received - row.paidPayout,
              ][col],
            0,
          ),
        }
      : 0;
    total.getCell(col).numFmt = '"R$" #,##0.00';
  }
  sheet.addRow([
    "* Repasse sobre serviços pagos: valor calculado, não comprova pagamento ao profissional.",
  ]);
  return book;
}
export async function downloadFinance(
  rows: FinanceRow[],
  establishment: string,
  periodLabel: string,
  date: string,
) {
  const book = await financeWorkbook(rows, establishment, periodLabel);
  const buffer = await book.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `financeiro-${date}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
