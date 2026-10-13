"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DatePicker({ selfId, options }: { selfId: string; options: { id: string; name: string }[] }) {
  const router = useRouter();
  const [other, setOther] = useState(options[0]?.id ?? "");
  if (!options.length) return null;
  return (
    <div className="card flex flex-col gap-3 p-4">
      <span className="label !mb-0">Send the agent on a date with</span>
      <select value={other} onChange={(e) => setOther(e.target.value)} className="input">
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <button className="btn-primary" onClick={() => router.push(`/date/live?a=${selfId}&b=${other}`)}>
        Start the date
      </button>
    </div>
  );
}
