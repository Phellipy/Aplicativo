import { describe, it, expect } from "vitest";
import { financeRows, financeWorkbook } from "./finance";
import {
  saveClient,
  periodDates,
  periodLabel,
  filterPeriod,
  type Client,
  type Appointment,
} from "./domain";
const client: Client = {
  id: 1,
  name: "Cliente demonstrativo",
  phone: "11900000000",
  document: "00000000000",
  lastVisit: "2026-11-11",
  consent: false,
};
const appointment: Appointment = {
  id: 1,
  client: client.name,
  clientId: 1,
  professional: "Profissional",
  procedure: "Procedimento",
  date: "2026-11-11",
  time: "09:00",
  value: 100,
  commissionRate: 40,
  status: "Concluído",
  paymentMethod: "Pix",
};
describe("financeiro e documento", () => {
  it("documento é opcional, pode ser removido e normaliza pontuação", () => {
    expect(
      saveClient([], [], { ...client, document: "000.000.000-00" }, "admin")
        .clients[0].document,
    ).toBe("00000000000");
    expect(
      saveClient([client], [], { ...client, document: "" }, "admin").clients[0]
        .document,
    ).toBe("");
    expect(
      saveClient([], [], { ...client, document: undefined }, "admin").clients[0]
        .document,
    ).toBe("");
    expect(
      saveClient([], [], { ...client, document: "00.000.000/0000-00" }, "admin")
        .clients[0].document,
    ).toBe("00000000000000");
    expect(() =>
      saveClient([], [], { ...client, document: "123" }, "admin"),
    ).toThrow("11 dígitos");
  });
  it("associa documento por id sem confundir clientes homônimos e inclui excluídos", () => {
    const rows = financeRows(
      [appointment],
      [
        { ...client, deletedAt: "2026-11-12" },
        { ...client, id: 2, document: "11111111111" },
      ],
      "month",
      "2026-11-01",
    );
    expect(rows[0].document).toBe("00000000000");
  });
  it("usa nome apenas nos registros antigos sem id e não inventa documento", () => {
    expect(
      financeRows(
        [{ ...appointment, clientId: undefined }],
        [client],
        "day",
        appointment.date,
      )[0].document,
    ).toBe(client.document);
    expect(
      financeRows([appointment], [], "day", appointment.date)[0].document,
    ).toBe("");
  });
  it("filtra período e só exporta concluídos, mantendo pendências", () => {
    const rows = financeRows(
      [
        appointment,
        { ...appointment, id: 2, paymentMethod: undefined },
        { ...appointment, id: 3, status: "Cancelado" },
        { ...appointment, id: 4, date: "2026-12-01" },
      ],
      [client],
      "month",
      "2026-11-01",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].received).toBe(100);
    expect(rows[1].received).toBe(0);
    expect(rows[1].pending).toBe(100);
    expect(rows[1].payout).toBe(40);
    expect(rows[1].paidPayout).toBe(0);
  });
  it("gera Excel real com documento textual, valores numéricos e totais recuperáveis", async () => {
    const rows = financeRows(
      [{ ...appointment, client: '=HYPERLINK("teste")' }],
      [client],
      "year",
      "2026-11-11",
    );
    const book = await financeWorkbook(rows, "Empresa demo", "Ano 2026");
    const buffer = await book.xlsx.writeBuffer();
    const { default: ExcelJS } = await import("exceljs");
    const parsed = new ExcelJS.Workbook();
    await parsed.xlsx.load(buffer);
    const sheet = parsed.getWorksheet("Financeiro")!;
    expect(sheet.getCell("D6").value).toBe("00000000000");
    expect(sheet.getCell("D6").numFmt).toBe("@");
    expect(sheet.getCell("G6").value).toBe(100);
    expect(sheet.getCell("C6").type).toBe(ExcelJS.ValueType.String);
    expect(sheet.getCell("I7").value).toEqual({
      formula: "SUM(I6:I6)",
      result: 100,
    });
    expect(sheet.getCell("M7").value).toEqual({
      formula: "SUM(M6:M6)",
      result: 60,
    });
  });
  it("exporta período vazio com cabeçalhos e totais zero", async () => {
    const book = await financeWorkbook([], "Demo", "Sem registros");
    expect(book.getWorksheet("Financeiro")!.getCell("I6").value).toBe(0);
    expect((await book.xlsx.writeBuffer()).byteLength).toBeGreaterThan(0);
  });
});
describe("semana no início e financeiro", () => {
  it("usa segunda a domingo inclusive entre anos", () => {
    expect(periodDates("week", "2027-01-01")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
    expect(periodLabel("week", "2027-01-01")).toBe("28/12/2026 a 03/01/2027");
    expect(
      filterPeriod(
        [
          { ...appointment, date: "2026-12-28" },
          { ...appointment, date: "2027-01-03" },
          { ...appointment, date: "2027-01-04" },
        ],
        "week",
        "2027-01-01",
      ),
    ).toHaveLength(2);
  });
});
