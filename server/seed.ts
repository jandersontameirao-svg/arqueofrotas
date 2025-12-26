import { getDb } from "./db";
import {
  users,
  units,
  projects,
  vehicles,
  vehicleDocuments,
  checklistTemplates,
  checklistTemplateItems,
} from "../drizzle/schema";

async function seed() {
  console.log("🌱 Starting seed...");

  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  // Clean existing data first (in reverse order of dependencies)
  console.log("🧹 Cleaning existing data...");
  await db.delete(checklistTemplateItems);
  await db.delete(checklistTemplates);
  await db.delete(vehicleDocuments);
  await db.delete(vehicles);
  await db.delete(projects);
  await db.delete(units);

  // Seed Units
  console.log("📍 Seeding units...");
  const [matrizUnit] = await db
    .insert(units)
    .values([
      { name: "Matriz - São Paulo", code: "SP001", address: "Av. Paulista, 1000", city: "São Paulo", state: "SP" },
      { name: "Filial - Rio de Janeiro", code: "RJ001", address: "Av. Rio Branco, 500", city: "Rio de Janeiro", state: "RJ" },
      { name: "Filial - Belo Horizonte", code: "MG001", address: "Av. Afonso Pena, 200", city: "Belo Horizonte", state: "MG" },
    ])
    .$returningId();

  // Seed Projects
  console.log("📋 Seeding projects...");
  const [projectA] = await db
    .insert(projects)
    .values([
      { name: "Projeto Alpha", code: "ALPHA-2024", description: "Projeto de expansão regional", unitId: matrizUnit.id },
      { name: "Projeto Beta", code: "BETA-2024", description: "Manutenção predial", unitId: matrizUnit.id },
      { name: "Operações Diárias", code: "OPS-2024", description: "Operações e logística diária", unitId: matrizUnit.id },
    ])
    .$returningId();

  // Seed Vehicles
  console.log("🚗 Seeding vehicles...");
  await db.insert(vehicles).values({
    plate: "ABC-1234",
    model: "Hilux SW4",
    brand: "Toyota",
    year: 2023,
    color: "Branco",
    vehicleType: "caminhonete",
    status: "ativo",
    unitId: matrizUnit.id,
    currentKm: 15000,
    chassi: "9BRBL3HE5N0123456",
    renavam: "12345678901",
  });
  await db.insert(vehicles).values({
    plate: "XYZ-5678",
    model: "Strada Freedom",
    brand: "Fiat",
    year: 2022,
    color: "Prata",
    vehicleType: "caminhonete",
    status: "ativo",
    unitId: matrizUnit.id,
    currentKm: 35000,
    chassi: "9BD374121N0654321",
    renavam: "98765432109",
  });
  await db.insert(vehicles).values({
    plate: "DEF-9012",
    model: "Onix Plus",
    brand: "Chevrolet",
    year: 2024,
    color: "Preto",
    vehicleType: "carro",
    status: "ativo",
    unitId: matrizUnit.id,
    currentKm: 5000,
    chassi: "9BGKS48U0NG789012",
    renavam: "11223344556",
  });
  await db.insert(vehicles).values({
    plate: "GHI-3456",
    model: "Sprinter 415",
    brand: "Mercedes-Benz",
    year: 2021,
    color: "Branco",
    vehicleType: "van",
    status: "manutencao",
    unitId: matrizUnit.id,
    currentKm: 85000,
    chassi: "9BM906533NB345678",
    renavam: "55667788990",
  });
  await db.insert(vehicles).values({
    plate: "JKL-7890",
    model: "HR",
    brand: "Hyundai",
    year: 2020,
    color: "Branco",
    vehicleType: "caminhao",
    status: "ativo",
    unitId: matrizUnit.id,
    currentKm: 120000,
    chassi: "9BHN751CXLP901234",
    renavam: "99887766554",
  });

  // Seed Vehicle Documents
  console.log("📄 Seeding vehicle documents...");
  const vehiclesList = await db.select().from(vehicles);
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expired = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);

  for (const vehicle of vehiclesList) {
    await db.insert(vehicleDocuments).values({
      vehicleId: vehicle.id,
      documentType: "crlv",
      description: `CRLV - ${vehicle.plate}`,
      expirationDate: in90Days,
    });
    await db.insert(vehicleDocuments).values({
      vehicleId: vehicle.id,
      documentType: "seguro",
      description: `Seguro - ${vehicle.plate}`,
      expirationDate: vehicle.id === 1 ? in30Days : in60Days,
    });
    await db.insert(vehicleDocuments).values({
      vehicleId: vehicle.id,
      documentType: "licenciamento",
      description: `Licenciamento - ${vehicle.plate}`,
      expirationDate: vehicle.id === 2 ? expired : in90Days,
    });
  }

  // Seed Checklist Templates
  console.log("📝 Seeding checklist templates...");
  const [dailyTemplateResult] = await db
    .insert(checklistTemplates)
    .values({
      name: "Checklist Diário - Veículos Leves",
      description: "Verificação diária para carros e caminhonetes",
      vehicleType: "carro",
      active: true,
    })
    .$returningId();
  
  await db.insert(checklistTemplates).values({
    name: "Checklist Semanal - Caminhões",
    description: "Verificação semanal detalhada para caminhões",
    vehicleType: "caminhao",
    active: true,
  });
  
  const dailyTemplate = { id: dailyTemplateResult.id };

  // Seed Checklist Template Items
  console.log("✅ Seeding checklist template items...");
  const checklistItems = [
    { templateId: dailyTemplate.id, description: "Nível de óleo do motor", category: "Motor", isCritical: true, order: 1 },
    { templateId: dailyTemplate.id, description: "Nível do líquido de arrefecimento", category: "Motor", isCritical: true, order: 2 },
    { templateId: dailyTemplate.id, description: "Nível do fluido de freio", category: "Freios", isCritical: true, order: 3 },
    { templateId: dailyTemplate.id, description: "Estado dos pneus (calibragem e desgaste)", category: "Pneus", isCritical: true, order: 4 },
    { templateId: dailyTemplate.id, description: "Funcionamento dos faróis", category: "Iluminação", isCritical: false, order: 5 },
    { templateId: dailyTemplate.id, description: "Funcionamento das lanternas", category: "Iluminação", isCritical: false, order: 6 },
    { templateId: dailyTemplate.id, description: "Funcionamento das setas", category: "Iluminação", isCritical: false, order: 7 },
    { templateId: dailyTemplate.id, description: "Funcionamento do limpador de para-brisa", category: "Visibilidade", isCritical: false, order: 8 },
    { templateId: dailyTemplate.id, description: "Estado dos espelhos retrovisores", category: "Visibilidade", isCritical: false, order: 9 },
    { templateId: dailyTemplate.id, description: "Funcionamento do cinto de segurança", category: "Segurança", isCritical: true, order: 10 },
    { templateId: dailyTemplate.id, description: "Presença do triângulo de sinalização", category: "Segurança", isCritical: false, order: 11 },
    { templateId: dailyTemplate.id, description: "Presença do macaco e chave de roda", category: "Segurança", isCritical: false, order: 12 },
    { templateId: dailyTemplate.id, description: "Estado geral da carroceria (amassados, arranhões)", category: "Carroceria", isCritical: false, order: 13 },
    { templateId: dailyTemplate.id, description: "Limpeza interna do veículo", category: "Limpeza", isCritical: false, order: 14 },
    { templateId: dailyTemplate.id, description: "Documentos do veículo presentes", category: "Documentação", isCritical: true, order: 15 },
  ];
  
  for (const item of checklistItems) {
    await db.insert(checklistTemplateItems).values(item);
  }

  console.log("✨ Seed completed successfully!");
}

// Run seed
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
