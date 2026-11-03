// Parses a form with a zod schema. Returns { data } or { error } with a
// message suitable for showing next to the form.
function parseForm(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (result.success) return { data: result.data };
  const issue = result.error.issues[0];
  const field = issue.path.join(".");
  return { error: field ? `${field}: ${issue.message}` : issue.message };
}

module.exports = { parseForm };
