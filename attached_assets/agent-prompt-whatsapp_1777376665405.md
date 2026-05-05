# أمر الإيجنت — تكامل WhatsApp API في Kidspeak-Hub
# (يدعم 3 مزوّدين: UltraMsg / GREEN-API / WAHA)

---

## توصية المزوّد

| الخيار | التكلفة | السهولة | للمركز |
|--------|---------|---------|--------|
| WAHA على Railway/Render | مجاني | متوسطة | ✅ الأفضل |
| GREEN-API | مجاني محدود | سهلة | ✅ للبداية |
| UltraMsg | $15/شهر | سهلة جداً | ✅ إذا تريد راحة البال |

**توصية:** ابدأ بـ GREEN-API للاختبار (مجاني، لا يحتاج سيرفر).
إذا نجح الربط انتقل لـ WAHA على Railway أو Render (مجاني كامل، لا حد للرسائل).

---

## الهدف

بناء تكامل WhatsApp بحيث يختار الأدمن المزوّد من الإعدادات ويغيّره
في أي وقت بدون تعديل في الكود — فقط يغيّر بياناته ويحفظ.

---

```
Implement WhatsApp messaging integration in Kidspeak-Hub.
The system must support THREE providers that the admin can choose from
in the Settings page: UltraMsg, GREEN-API, or WAHA (self-hosted).
Switching providers requires only changing settings — no code changes.

Work through these steps in order. Do NOT break any existing functionality.

---

### STEP 1 — Database: add WhatsApp config to school settings

File: lib/db/src/schema/schoolSettings.ts

Add these fields to schoolSettingsTable:

  whatsappEnabled:     boolean("whatsapp_enabled").default(false),
  whatsappProvider:    text("whatsapp_provider").default("ultramsg"),
  // ^ one of: "ultramsg" | "greenapi" | "waha"
  whatsappToken:       text("whatsapp_token"),       // shared by all providers
  whatsappInstanceId:  text("whatsapp_instance_id"), // UltraMsg only
  whatsappIdInstance:  text("whatsapp_id_instance"), // GREEN-API only
  whatsappWahaUrl:     text("whatsapp_waha_url"),    // WAHA only
  whatsappWahaSession: text("whatsapp_waha_session").default("default"), // WAHA only

Run migration: pnpm db:push

---

### STEP 2 — Backend: multi-provider utility

Create file: artifacts/api-server/src/lib/whatsapp.ts

export type WhatsAppProvider = "ultramsg" | "greenapi" | "waha";

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  token: string;
  instanceId?: string;  // UltraMsg
  idInstance?: string;  // GREEN-API
  wahaUrl?: string;     // WAHA
  wahaSession?: string; // WAHA
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "213" + p.slice(1);
  return p;
}

export async function sendWhatsAppMessage(
  config: WhatsAppConfig, to: string, body: string
): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizePhone(to);
  try {

    // UltraMsg
    if (config.provider === "ultramsg") {
      const res = await fetch(
        `https://api.ultramsg.com/${config.instanceId}/messages/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: config.token, to: phone, body }).toString(),
        }
      );
      const data = await res.json() as any;
      return (data.sent === "true" || data.sent === true)
        ? { ok: true }
        : { ok: false, error: data.error ?? "UltraMsg error" };
    }

    // GREEN-API
    if (config.provider === "greenapi") {
      const res = await fetch(
        `https://api.green-api.com/waInstance${config.idInstance}/sendMessage/${config.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: `${phone}@c.us`, message: body }),
        }
      );
      const data = await res.json() as any;
      return data.idMessage ? { ok: true } : { ok: false, error: data.message ?? "GREEN-API error" };
    }

    // WAHA (self-hosted)
    if (config.provider === "waha") {
      const baseUrl = (config.wahaUrl ?? "").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.token ? { "X-Api-Key": config.token } : {}),
        },
        body: JSON.stringify({
          session: config.wahaSession ?? "default",
          chatId: `${phone}@c.us`,
          text: body,
        }),
      });
      const data = await res.json() as any;
      return (res.ok && data.id) ? { ok: true } : { ok: false, error: data.message ?? "WAHA error" };
    }

    return { ok: false, error: "Unknown provider" };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function sendWhatsAppBulk(
  config: WhatsAppConfig,
  recipients: { phone: string; name: string }[],
  bodyTemplate: string,
  delayMs = 1200
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0, failed = 0;
  const errors: string[] = [];
  for (const r of recipients) {
    if (!r.phone) { failed++; continue; }
    const result = await sendWhatsAppMessage(config, r.phone, bodyTemplate.replace(/\{name\}/g, r.name));
    if (result.ok) sent++;
    else { failed++; errors.push(`${r.name}: ${result.error}`); }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return { sent, failed, errors };
}

export function buildWhatsAppConfig(settings: any): WhatsAppConfig | null {
  if (!settings?.whatsappEnabled || !settings?.whatsappToken) return null;
  return {
    provider:    settings.whatsappProvider ?? "ultramsg",
    token:       settings.whatsappToken,
    instanceId:  settings.whatsappInstanceId,
    idInstance:  settings.whatsappIdInstance,
    wahaUrl:     settings.whatsappWahaUrl,
    wahaSession: settings.whatsappWahaSession ?? "default",
  };
}

---

### STEP 3 — Backend: WhatsApp routes

Create file: artifacts/api-server/src/routes/whatsapp.ts

POST /api/whatsapp/test  — tests connection using credentials from request body
POST /api/whatsapp/send  — bulk send using credentials stored in DB settings

Both routes: requireAuth + requireRole(["admin"])

For /send: resolve recipients same as existing broadcast logic (group/level/all_parents),
then call sendWhatsAppBulk() in background and return { ok: true, queued: N } immediately.

Register in artifacts/api-server/src/routes/index.ts:
  app.use("/api/whatsapp", whatsappRouter);

---

### STEP 4 — Frontend: Settings page — provider selector

File: artifacts/kidspeak/src/pages/settings/index.tsx

Add "ربط واتساب" section (admin only) with:

1. Enable/disable toggle (whatsappEnabled)

2. Provider <Select> with 3 options:
   - "ultramsg"  → "UltraMsg — سهل ($15/شهر)"
   - "greenapi"  → "GREEN-API — مجاني محدود"
   - "waha"      → "WAHA — مجاني كامل (سيرفر خاص)"

3. Conditional fields based on selected provider:

   IF ultramsg:
     - Input: Instance ID  (placeholder: "instance12345")
       hint: "من لوحة تحكم ultramsg.com ← My Instances"
     - Input type=password: Token

   IF greenapi:
     - Input: idInstance  (placeholder: "1101234567")
       hint: "من لوحة تحكم console.green-api.com"
     - Input type=password: API Token

   IF waha:
     - Input: Server URL  (placeholder: "https://waha.yourserver.com")
     - Input: Session Name  (placeholder: "default")
     - Input type=password: API Key (optional — hint: "إذا فعّلت المصادقة في WAHA")

4. Test connection row:
   - Input: phone number for test  (placeholder: "213551234567")
   - Button: "اختبار الاتصال" → calls POST /api/whatsapp/test with all current fields
   - Shows: ✅ or ❌ with error message

5. Include all WA fields in the existing save handler.

---

### STEP 5 — Frontend: Broadcast dialog

File: artifacts/kidspeak/src/pages/inbox/index.tsx

After the existing "إرسال" button, add "إرسال عبر واتساب" button that:
- Only appears when waSettings?.whatsappEnabled === true
- Only for bType: "group", "level", "all_parents"
- Shows warning: "⚠️ سيتم الإرسال فقط للأولياء الذين لديهم رقم هاتف مسجل"
- Calls POST /api/whatsapp/send — the frontend does NOT need to know which provider is active

---

### STEP 6 — Message templates

Inside the broadcast dialog, show two quick-fill template buttons
(only when whatsappEnabled):

Template 1 — "💬 تذكير بكلمة المرور":
السلام عليكم ولي أمر {name} 👋
نذكركم بأن بإمكانكم متابعة تقدم طفلكم عبر منصة Kidspeak.
🔐 بيانات الدخول:
• الموقع: https://kidspeak.dz
• اسم المستخدم: بريدكم الإلكتروني
• للمساعدة تواصلوا معنا 🙏

Template 2 — "📩 تنبيه برسالة جديدة":
السلام عليكم ولي أمر {name} 👋
لديكم رسالة جديدة على منصة Kidspeak.
يُرجى الدخول للموقع والتحقق من صندوق الرسائل.
🔗 https://kidspeak.dz شكراً 🙏

Note: {name} يُستبدل تلقائياً باسم كل ولي عند الإرسال.

---

### STEP 7 — زر التذكير بالبيانات لولي بعينه

**Context:** The admin opens a specific parent's profile page and wants to
send them a reminder with their login credentials (email + reset link).
This is a single-parent targeted action, not a broadcast.

**Backend — add new route** in `artifacts/api-server/src/routes/users.ts`:

```
POST /api/users/:id/remind
```
Body: `{ channel: "site" | "wa" | "both" }`

Implementation:
1. Fetch the parent from DB: `name`, `email`, `phone`
2. Generate a password reset token (save in DB with 24h expiry):
   - Add fields to `usersTable`: `resetToken: text("reset_token")`,
     `resetTokenExpiry: integer("reset_token_expiry", { mode: "timestamp" })`
   - Run `pnpm db:push`
   - Generate: `const token = crypto.randomUUID()`
   - Save: `UPDATE users SET resetToken = token, resetTokenExpiry = now+24h WHERE id = :id`
3. Build the reminder message:
   ```ts
   const resetUrl = `${process.env.APP_URL ?? "https://kidspeak.dz"}/reset-password?token=${token}`;
   const message = `السلام عليكم ${parent.name} 👋\n\nبيانات دخولكم لمنصة Kidspeak:\n🔐 اسم المستخدم: ${parent.email}\n🔗 رابط تغيير كلمة المرور:\n${resetUrl}\n\nالرابط صالح لمدة 24 ساعة.\nللمساعدة تواصلوا معنا 🙏`;
   ```
4. Send based on `channel`:
   - `"site"`: `db.insert(messagesTable).values({ senderId: adminId, recipientId: parent.id, content: message })`
   - `"wa"`: `sendWhatsAppMessage(config, parent.phone, message)` — return error if no phone
   - `"both"`: do both; if parent has no phone, site only, note `waSkipped: true` in response
5. Return: `{ ok: true, channel, waSkipped?: true }`

**Frontend — add three buttons to parent profile page**

File: `artifacts/kidspeak/src/pages/parents/[id].tsx`
(or wherever the admin views a single parent's details)

Add a "بيانات الدخول" section with three buttons, only visible to admin:

```tsx
{isAdmin && (
  <div className="space-y-2">
    <p className="text-sm font-medium">تذكير ببيانات الدخول</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm"
        className="gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white"
        disabled={!parent.phone || isSending}
        onClick={() => handleRemind("wa")}
        title={!parent.phone ? "لا يوجد رقم هاتف مسجل" : ""}>
        تذكير عبر واتساب
      </Button>
      <Button variant="outline" size="sm"
        className="gap-2"
        disabled={isSending}
        onClick={() => handleRemind("site")}>
        تذكير عبر الموقع
      </Button>
      <Button variant="outline" size="sm"
        className="gap-2 border-[#185FA5] text-[#185FA5] hover:bg-[#185FA5] hover:text-white"
        disabled={isSending}
        onClick={() => handleRemind("both")}>
        إرسال عبر الاثنين
      </Button>
    </div>
    {!parent.phone && (
      <p className="text-xs text-amber-600">⚠️ لا يوجد رقم هاتف — واتساب غير متاح لهذا الولي</p>
    )}
  </div>
)}
```

Handler:
```ts
const [isSending, setIsSending] = useState(false);

const handleRemind = async (channel: "wa" | "site" | "both") => {
  setIsSending(true);
  try {
    const r = await fetch(`/api/users/${parent.id}/remind`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const data = await r.json();
    if (data.ok) {
      toast({
        title: "✅ تم الإرسال",
        description: data.waSkipped
          ? "تم الإرسال عبر الموقع فقط (لا يوجد رقم هاتف للولي)"
          : `تم الإرسال عبر ${channel === "both" ? "الموقع والواتساب" : channel === "wa" ? "الواتساب" : "الموقع"}`,
      });
    } else {
      toast({ title: `❌ ${data.error}`, variant: "destructive" });
    }
  } catch {
    toast({ title: "فشل الإرسال", variant: "destructive" });
  }
  setIsSending(false);
};
```

Also add the reset password page/route:
File: `artifacts/kidspeak/src/pages/reset-password/index.tsx`
- Reads `?token=` from URL
- Calls `POST /api/auth/reset-password { token, newPassword }`
- Shows success/error message

Backend reset route in `artifacts/api-server/src/routes/auth.ts`:
```ts
router.post("/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 6)
    return res.status(400).json({ error: "Invalid request" });
  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.resetToken, token));
  if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry)
    return res.status(400).json({ error: "الرابط منتهي الصلاحية أو غير صالح" });
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable)
    .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
    .where(eq(usersTable.id, user.id));
  res.json({ ok: true });
});
```

---

### STEP 8 — اختيار القناة في البث الجماعي (site / wa / both)

**Modify broadcast send route** in `artifacts/api-server/src/routes/messages.ts`:

Add `channel` field to the existing `POST /messages/send` handler:
```ts
const { recipientType, groupId, levelId, message, channel = "site" } = req.body;
// channel: "site" | "wa" | "both"
```

After resolving `recipients` (existing logic), split the send logic:
```ts
const results: { siteCount: number; waQueued: number; waSkipped: number } = {
  siteCount: 0, waQueued: 0, waSkipped: 0,
};

// Site messages (insert into DB)
if (channel === "site" || channel === "both") {
  const messages = recipientIds.map(recipientId => ({
    senderId: user.id,
    recipientId,
    content: message,
    createdAt: new Date(),
  }));
  await db.insert(messagesTable).values(messages);
  results.siteCount = messages.length;
}

// WhatsApp messages (background send)
if (channel === "wa" || channel === "both") {
  const [settings] = await db.select().from(schoolSettingsTable).limit(1);
  const config = buildWhatsAppConfig(settings);
  if (!config) {
    if (channel === "wa")
      return res.status(400).json({ error: "WhatsApp غير مفعّل — فعّله من الإعدادات أولاً" });
    // if "both", continue with site only
  } else {
    const waRecipients = recipients.filter(r => r.phone);
    results.waQueued = waRecipients.length;
    results.waSkipped = recipients.length - waRecipients.length;
    // Send in background
    sendWhatsAppBulk(config, waRecipients, message, 1200)
      .then(r => console.log(`WA bulk: ${r.sent} sent, ${r.failed} failed`));
  }
}

res.json({ ok: true, ...results });
```

**Modify broadcast dialog UI** in `artifacts/kidspeak/src/pages/inbox/index.tsx`:

Replace the two separate send buttons (site + WA) with a single send section
that has a channel selector + one "إرسال" button:

```tsx
{/* Channel selector — only when WA is enabled */}
{waSettings?.whatsappEnabled && (
  <div className="space-y-1.5">
    <p className="text-sm font-medium">إرسال عبر</p>
    <div className="flex gap-2">
      {(["site", "wa", "both"] as const).map(ch => (
        <button
          key={ch}
          onClick={() => setBChannel(ch)}
          className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors
            ${bChannel === ch
              ? ch === "wa"   ? "border-[#1D9E75] bg-[#E1F5EE] text-[#0F6E56]"
              : ch === "site" ? "border-[#185FA5] bg-[#E6F1FB] text-[#0C447C]"
              :                 "border-[#BA7517] bg-[#FAEEDA] text-[#633806]"
              : "border-[var(--color-border-tertiary)] text-[var(--color-text-secondary)]"
            }`}
        >
          {ch === "site" ? "الموقع فقط" : ch === "wa" ? "واتساب فقط" : "الاثنين معاً"}
        </button>
      ))}
    </div>
    {bChannel !== "site" && (
      <p className="text-xs text-amber-600">
        ⚠️ سيتم إرسال واتساب فقط للأولياء الذين لديهم رقم هاتف مسجل
      </p>
    )}
  </div>
)}

{/* Single unified send button */}
<Button
  onClick={handleBroadcastSend}
  disabled={isSending || !bContent.trim() || (bType === "group" && !bGroupId) || (bType === "level" && !bLevelId)}
  className="w-full">
  {isSending ? "جاري الإرسال..." : "إرسال"}
</Button>
```

Add state: `const [bChannel, setBChannel] = useState<"site"|"wa"|"both">("site");`

Update `handleBroadcastSend` to include `channel: bChannel` in the request body.

After success, show detailed toast:
```ts
toast({
  title: "✅ تم الإرسال",
  description: [
    data.siteCount  ? `${data.siteCount} رسالة عبر الموقع`  : null,
    data.waQueued   ? `${data.waQueued} رسالة عبر واتساب`   : null,
    data.waSkipped  ? `(${data.waSkipped} بدون رقم هاتف)`   : null,
  ].filter(Boolean).join(" · "),
});
```

If WhatsApp is NOT enabled in settings, the channel selector is hidden
and all broadcasts go through the site only (existing behavior unchanged).

---

### IMPORTANT NOTES

1. The admin switches provider at any time from Settings — no code change needed.
   The backend reads the active provider from DB on every request.

2. tsc --noEmit must pass clean after all changes.

3. WAHA requires an active session (QR scanned). If not active, sendWhatsAppMessage
   returns a clear error — surface this to the admin in the test result.

4. Background sending: NEVER await sendWhatsAppBulk inside the route handler.
   Return { ok: true, queued: N } immediately, then send in background.

5. Parents without a phone number are silently skipped.
   `queued` in the response reflects only recipients WITH a phone number.
```
