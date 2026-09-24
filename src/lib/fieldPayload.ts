// The undotted form ("voiceRules", "doNotList", "ctaRotation", "openerBank")
// serves the author's voice lists on /strategy and must never change shape:
// it has to stay { voiceRules: [...] } etc, or her voice edits silently stop
// saving. The dotted form ("blog.structureRules") lets the same endpoint and
// component also serve the nested BlogProfile fields.
export function buildFieldPayload(field: string, value: string[]): Record<string, unknown> {
  const dotIndex = field.indexOf(".");
  if (dotIndex === -1) return { [field]: value };
  const head = field.slice(0, dotIndex);
  const tail = field.slice(dotIndex + 1);
  return { [head]: { [tail]: value } };
}
