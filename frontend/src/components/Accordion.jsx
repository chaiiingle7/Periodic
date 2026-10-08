import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

function Accordion({ title, children, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <div className="tg-accordion-head" onClick={() => setOpen((o) => !o)}>
        <h4>{title}</h4>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </div>
      {open && <div className="tg-accordion-body">{children}</div>}
    </div>
  );
}

export default Accordion;
