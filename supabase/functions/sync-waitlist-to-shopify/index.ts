import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    if (!shopifyToken) {
      console.error("[WaitlistSync] SHOPIFY_ACCESS_TOKEN not set");
      return new Response(JSON.stringify({ error: "config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeDomain = "b1jane-qq.myshopify.com";

    // Search if customer already exists
    const searchResp = await fetch(
      `https://${storeDomain}/admin/api/2025-07/customers/search.json?query=email:${encodeURIComponent(email)}`,
      { headers: { "X-Shopify-Access-Token": shopifyToken, "Content-Type": "application/json" } }
    );
    const searchData = await searchResp.json();

    if (searchData.customers?.length > 0) {
      // Customer exists — add tag if missing
      const customer = searchData.customers[0];
      const tags = (customer.tags || "").split(",").map((t: string) => t.trim());
      if (!tags.includes("Waitlist_Founders")) {
        const newTags = [...tags, "Waitlist_Founders"].filter(Boolean).join(", ");
        await fetch(`https://${storeDomain}/admin/api/2025-07/customers/${customer.id}.json`, {
          method: "PUT",
          headers: { "X-Shopify-Access-Token": shopifyToken, "Content-Type": "application/json" },
          body: JSON.stringify({ customer: { id: customer.id, tags: newTags } }),
        });
        console.log(`[WaitlistSync] ✓ Tagged existing customer ${customer.id}`);
      }
    } else {
      // Create new customer
      const createResp = await fetch(`https://${storeDomain}/admin/api/2025-07/customers.json`, {
        method: "POST",
        headers: { "X-Shopify-Access-Token": shopifyToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            email,
            tags: "Waitlist_Founders",
            accepts_marketing: true,
            verified_email: true,
          },
        }),
      });
      const createData = await createResp.json();
      console.log(`[WaitlistSync] ✓ Created customer:`, createData.customer?.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[WaitlistSync] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
