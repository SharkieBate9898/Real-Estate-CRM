import { db } from "../lib/db";

async function setUserRole() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminUserId = process.env.ADMIN_USER_ID?.trim();

  if (!adminEmail && !adminUserId) {
    console.error("Set ADMIN_EMAIL or ADMIN_USER_ID before running this script.");
    process.exit(1);
  }

  await db.execute({
    sql: "UPDATE users SET role = 'user' WHERE role IS NULL OR role != 'user'",
    args: [],
  });

  if (adminUserId) {
    await db.execute({
      sql: "UPDATE users SET role = 'admin' WHERE id = ?",
      args: [Number(adminUserId)],
    });
  } else if (adminEmail) {
    await db.execute({
      sql: "UPDATE users SET role = 'admin' WHERE lower(email) = lower(?)",
      args: [adminEmail],
    });
  }

  console.log("Role update complete.");
}

setUserRole().catch((error) => {
  console.error(error);
  process.exit(1);
});
