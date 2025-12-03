import { db } from "./db";
import { eq } from "drizzle-orm";
import * as schema from "../shared/schema";

async function createSuperadmin() {
  try {
    const email = process.env.SUPERADMIN_EMAIL || "email@gymsaathi.com";
    const password = process.env.SUPERADMIN_PASSWORD || "password123";

    let bcrypt: typeof import("bcrypt");
    try {
      bcrypt = await import("bcrypt");
    } catch (error: any) {
      console.error("❌ Error: bcrypt dependency not found");
      process.exit(1);
    }

    console.log("🔐 Creating superadmin account...");
    console.log("📧 Email:", email);

    const passwordHash = await bcrypt.hash(password, 10);

    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingUser) {
      console.log("⚠️ User already exists. Updating password...");

      await db
        .update(schema.users)
        .set({
          passwordHash: passwordHash,
          role: "superadmin",
          isActive: 1,
        })
        .where(eq(schema.users.email, email));

      console.log("✅ Superadmin account updated successfully!");
    } else {
      await db.insert(schema.users).values({
        email,
        passwordHash: passwordHash,
        role: "superadmin",
        name: "Super Admin",
        phone: "+1-000-000-0000",
        isActive: 1,
      });

      console.log("✅ Superadmin account created successfully!");
    }

    console.log("");
    console.log("🎉 You can now log in with:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

createSuperadmin();
