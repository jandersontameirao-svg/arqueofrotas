import mysql from "mysql2/promise";
if (!process.env.DATABASE_URL)
  throw new Error(
    "DATABASE_URL must explicitly select the database to inspect"
  );
const db = await mysql.createConnection(process.env.DATABASE_URL);
let blocked = false;
const checks: Record<string, string> = {
  duplicateVehicleUse:
    "SELECT vehicleId FROM reservations WHERE reservationStatus='em_uso' GROUP BY vehicleId HAVING COUNT(*)>1",
  duplicateDriverUse:
    "SELECT userId FROM reservations WHERE reservationStatus='em_uso' GROUP BY userId HAVING COUNT(*)>1",
  invalidIntervals: "SELECT id FROM reservations WHERE startDate >= endDate",
  regressiveUses: "SELECT id FROM reservations WHERE checkOutKm < checkInKm",
  negativeVehicleKm: "SELECT id FROM vehicles WHERE currentKm < 0",
  overlappingReservations:
    "SELECT a.id FROM reservations a JOIN reservations b ON a.vehicleId=b.vehicleId AND a.id<b.id AND a.startDate<b.endDate AND a.endDate>b.startDate WHERE a.reservationStatus='agendada' AND b.reservationStatus='agendada'",
};
for (const [name, query] of Object.entries(checks)) {
  const [rows] = await db.query(query);
  const count = (rows as unknown[]).length;
  console.log(`${name}: ${count}`);
  if (count) blocked = true;
}
const [engines] = await db.query(
  "SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND ENGINE <> 'InnoDB'"
);
console.log(`nonTransactionalTables: ${(engines as unknown[]).length}`);
if ((engines as unknown[]).length) blocked = true;
await db.end();
if (blocked) {
  console.error(
    "Review inconsistencies before applying migrations. No records were changed."
  );
  process.exitCode = 1;
}
