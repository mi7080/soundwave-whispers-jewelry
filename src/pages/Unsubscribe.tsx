import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Unsubscribe = () => {
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (data?.success) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="font-serif text-3xl text-foreground">Email Preferences</h1>

        {status === "loading" && <p className="text-muted-foreground">Verifying…</p>}

        {status === "valid" && (
          <>
            <p className="text-muted-foreground">Click below to unsubscribe from future emails.</p>
            <button
              onClick={handleUnsubscribe}
              className="h-12 px-8 bg-gold text-background text-xs tracking-[0.2em] uppercase font-medium hover:bg-gold-light transition-colors rounded-md"
            >
              Confirm Unsubscribe
            </button>
          </>
        )}

        {status === "already" && (
          <p className="text-muted-foreground">You've already been unsubscribed.</p>
        )}

        {status === "success" && (
          <p className="text-gold">You have been successfully unsubscribed.</p>
        )}

        {status === "invalid" && (
          <p className="text-red-400">Invalid or expired unsubscribe link.</p>
        )}

        {status === "error" && (
          <p className="text-red-400">Something went wrong. Please try again.</p>
        )}
      </div>
    </main>
  );
};

export default Unsubscribe;
