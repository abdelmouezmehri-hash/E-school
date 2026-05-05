import { Router, type IRouter, type Request, type Response } from "express";
import { db, schoolSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
const SETTINGS_ROW_ID = 1;

function requireAdmin(req: Request, res: Response): boolean {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

async function getOrCreateSettings() {
  const [existing] = await db.select().from(schoolSettingsTable).where(eq(schoolSettingsTable.id, SETTINGS_ROW_ID));
  if (existing) return existing;
  const [created] = await db.insert(schoolSettingsTable).values({ id: SETTINGS_ROW_ID }).returning();
  return created;
}

router.get("/settings", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err: any) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/settings", requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const {
    schoolName, slogan, sloganAr, registrationId,
    address, phone, phone2, email, website,
    instagram, facebook, youtube, tiktok,
    logoUrl, logoWhiteUrl, logoPrintUrl, faviconUrl, signatureUrl,
    invoiceFooterEn, invoiceFooterAr,
    currency, currencySymbolAr, invoicePrefix,
    primaryColor, secondaryColor,
    welcomeAnnouncement,
    workingDays, workingHoursStart, workingHoursEnd,
    pupilLabel, pupilLabelAr,
    parentContactAdmin, parentContactTeacher, parentContactPsychologist, parentHideAdminName,
  } = req.body ?? {};

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (schoolName !== undefined) updates.schoolName = schoolName;
  if (slogan !== undefined) updates.slogan = slogan;
  if (sloganAr !== undefined) updates.sloganAr = sloganAr;
  if (registrationId !== undefined) updates.registrationId = registrationId || null;
  if (address !== undefined) updates.address = address || null;
  if (phone !== undefined) updates.phone = phone || null;
  if (phone2 !== undefined) updates.phone2 = phone2 || null;
  if (email !== undefined) updates.email = email || null;
  if (website !== undefined) updates.website = website || null;
  if (instagram !== undefined) updates.instagram = instagram || null;
  if (facebook !== undefined) updates.facebook = facebook || null;
  if (youtube !== undefined) updates.youtube = youtube || null;
  if (tiktok !== undefined) updates.tiktok = tiktok || null;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl || null;
  if (logoWhiteUrl !== undefined) updates.logoWhiteUrl = logoWhiteUrl || null;
  if (logoPrintUrl !== undefined) updates.logoPrintUrl = logoPrintUrl || null;
  if (faviconUrl !== undefined) updates.faviconUrl = faviconUrl || null;
  if (signatureUrl !== undefined) updates.signatureUrl = signatureUrl || null;
  if (invoiceFooterEn !== undefined) updates.invoiceFooterEn = invoiceFooterEn || null;
  if (invoiceFooterAr !== undefined) updates.invoiceFooterAr = invoiceFooterAr || null;
  if (currency !== undefined) updates.currency = currency || "DZD";
  if (currencySymbolAr !== undefined) updates.currencySymbolAr = currencySymbolAr || "د.ج";
  if (invoicePrefix !== undefined) updates.invoicePrefix = invoicePrefix || "RCP-";
  if (primaryColor !== undefined) updates.primaryColor = primaryColor || "#1B2E8F";
  if (secondaryColor !== undefined) updates.secondaryColor = secondaryColor || "#F5A600";
  if (welcomeAnnouncement !== undefined) updates.welcomeAnnouncement = welcomeAnnouncement || null;
  if (workingDays !== undefined) updates.workingDays = workingDays || null;
  if (workingHoursStart !== undefined) updates.workingHoursStart = workingHoursStart || null;
  if (workingHoursEnd !== undefined) updates.workingHoursEnd = workingHoursEnd || null;
  if (pupilLabel !== undefined) updates.pupilLabel = pupilLabel || "Pupils";
  if (pupilLabelAr !== undefined) updates.pupilLabelAr = pupilLabelAr || "تلاميذ";
  if (parentContactAdmin !== undefined) updates.parentContactAdmin = Boolean(parentContactAdmin);
  if (parentContactTeacher !== undefined) updates.parentContactTeacher = Boolean(parentContactTeacher);
  if (parentContactPsychologist !== undefined) updates.parentContactPsychologist = Boolean(parentContactPsychologist);
  if (parentHideAdminName !== undefined) updates.parentHideAdminName = Boolean(parentHideAdminName);

  try {
    await getOrCreateSettings();
    const [updated] = await db.update(schoolSettingsTable)
      .set(updates)
      .where(eq(schoolSettingsTable.id, SETTINGS_ROW_ID))
      .returning();
    res.json(updated);
  } catch (err: any) {
    console.error("Error updating settings:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
