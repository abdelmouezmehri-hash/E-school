import { useState, useEffect } from "react";
import { useParams } from "wouter";

export default function PublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = "/" + (params.slug ?? "");

  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/pages${slug}`, { cache: "no-store" })
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(page => {
        if (page) {
          setHtml(page.contentAr || page.contentEn || "");
          setLoading(false);
        }
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      جاري التحميل…
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black">404</h1>
        <p className="text-muted-foreground">الصفحة غير موجودة</p>
        <a href="/" className="text-primary underline text-sm">العودة للرئيسية</a>
      </div>
    </div>
  );

  // Inject form interception script into the AI-generated HTML
  const FORM_SCRIPT = `
    <script>
    (function() {
      function handleForms() {
        document.querySelectorAll('form[data-enquiry], form.enquiry-form, form').forEach(function(form) {
          if (form.dataset.hooked) return;
          form.dataset.hooked = '1';
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            var fd = new FormData(form);
            var data = {};
            fd.forEach(function(v, k) { data[k] = v; });
            
            // Map common field name variations
            var payload = {
              parentName:     data.parentName || data.parent_name || data.name || data.fullName || data.full_name || '',
              parentPhone:    data.parentPhone || data.parent_phone || data.phone || data.mobile || data.tel || '',
              parentEmail:    data.parentEmail || data.parent_email || data.email || '',
              childName:      data.childName  || data.child_name  || data.childFullName || data.child || '',
              childAge:       data.childAge   || data.child_age   || data.age || '',
              preferredLevel: data.preferredLevel || data.level || data.program || '',
              notes:          data.notes || data.message || data.comment || '',
            };
            
            var btn = form.querySelector('[type=submit]');
            var origText = btn ? btn.textContent : '';
            if (btn) { btn.disabled = true; btn.textContent = 'جاري الإرسال…'; }
            
            try {
              var r = await fetch('/api/public/enquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (r.ok) {
                form.innerHTML = '<div style="text-align:center;padding:2rem;color:#16a34a;font-size:1.1rem;font-weight:700">✓ تم استلام طلبك! سنتواصل معك قريباً.</div>';
              } else {
                var err = await r.json().catch(function(){return{};});
                alert(err.error || 'حدث خطأ، حاول مرة أخرى.');
                if (btn) { btn.disabled = false; btn.textContent = origText; }
              }
            } catch(ex) {
              alert('تعذّر الاتصال بالسيرفر.');
              if (btn) { btn.disabled = false; btn.textContent = origText; }
            }
          });
        });
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleForms);
      } else {
        handleForms();
      }
    })();
    </script>
  `;

  const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  ${html}
  ${FORM_SCRIPT}
</body>
</html>`;

  return (
    <iframe
      srcDoc={fullHtml}
      className="w-full border-0"
      style={{ minHeight: "100vh", display: "block" }}
      title="Page"
    />
  );
}
