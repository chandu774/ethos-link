import { FormEvent, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSend: (message: string) => void;
  isSending: boolean;
}

export function MessageInput({ onSend, isSending }: MessageInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border/50 p-3">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Write a message..."
        disabled={isSending}
      />
      <Button type="submit" disabled={isSending || !value.trim()}>
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
      </Button>
    </form>
  );
}
