import { describe, it, expect } from "vitest";
import { assignedProcedures, professionalServices, procedureRate, type ProfessionalRecord } from "./domain";
const procedures = [{ id: 1, name: "Serviço", duration: 30, price: 50 }];
const person: ProfessionalRecord = { id: 1, name: "Profissional", active: true, services: [] };
describe("procedimentos e repasses do profissional único", () => {
  it("habilita procedimentos novos automaticamente com repasse de 100%", () => {
    const projected = assignedProcedures(procedures, [person]);
    expect(projected[0].professionals).toEqual([person.name]);
    expect(procedureRate(projected[0], person.name)).toBe(100);
  });
  it("preserva percentual configurado, inclusive zero", () => {
    const record = { ...person, services: [{ procedureId: 1, enabled: true, commissionRate: 0 }] };
    expect(procedureRate(assignedProcedures(procedures, [record])[0], person.name)).toBe(0);
  });
  it("considera somente profissionais ativos e não excluídos", () => {
    expect(assignedProcedures(procedures, [person, { ...person, id: 2, name: "Inativo", active: false }])[0].professionals).toEqual([person.name]);
    expect(assignedProcedures(procedures, [{ ...person, active: false }])[0].professionals).toEqual([]);
  });
  it("mantém os serviços do primeiro ao cadastrar um segundo profissional", () => {
    const first = { ...person, services: professionalServices(person, procedures, true) };
    const second = { ...person, id: 2, name: "Segundo" };
    expect(assignedProcedures(procedures, [first, second])[0].professionals).toEqual([person.name]);
    expect(professionalServices(second, procedures, false)[0]).toEqual({ procedureId: 1, enabled: false, commissionRate: 100 });
  });
});
