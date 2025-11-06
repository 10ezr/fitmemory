"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function QuickChat() {
  const [log, setLog] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => { boxRef.current && (boxRef.current.scrollTop = boxRef.current.scrollHeight); }, [log]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || busy) return;
    setText("");
    setBusy(true);
    setLog(l => [...l, { role: "user", content: msg }]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const currentTime = {
        iso: new Date().toISOString(),
        timezone: "Asia/Kolkata",
        epochMs: Date.now(),
        display: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      };
      const res = await fetch("/api/converse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, timestamp: currentTime }), signal: controller.signal });
      const data = await res.json();
      setLog(l => [...l, { role: "assistant", content: data?.reply || "Got it!" }]);
    } catch (e) {
      const message = e?.name === 'AbortError' ? 'Request timed out. Try again.' : 'Connection failed. Try again.';
      setLog(l => [...l, { role: "system", content: message }]);
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={boxRef} className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-2">
        {log.length === 0 ? (
          <div className="text-xs text-muted-foreground">Try: "Plan HIIT workout", "Log 7h sleep", "What's my streak?"</div>
        ) : log.map((m, i) => (
          <div key={i} className={`text-xs p-2 rounded ${m.role === 'user' ? 'bg-primary/10 text-foreground ml-4' : m.role === 'assistant' ? 'bg-secondary/30 text-primary mr-4' : 'text-muted-foreground'}`}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Input 
          value={text} 
          onChange={e=>setText(e.target.value)} 
          placeholder="Quick message..." 
          className="text-sm"
          onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }} 
        />
        <Button size="icon" onClick={send} disabled={busy || !text.trim()} className="h-9 w-9">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
