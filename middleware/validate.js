const { badRequest } = require("../utils/httpError");

// Validates req.body / req.query with a zod schema and replaces it with the
// parsed (trimmed, converted) values.
function validate({ body, query }) {
  return (req, res, next) => {
    for (const [key, schema] of Object.entries({ body, query })) {
      if (!schema) continue;
      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        const issue = result.error.issues[0];
        const field = issue.path.join(".");
        return next(badRequest(field ? `${field}: ${issue.message}` : issue.message));
      }
      // req.query is a getter in Express 5, so validated values go to req.valid.
      req.valid = { ...req.valid, ...result.data };
      if (key === "body") req.body = result.data;
    }
    next();
  };
}

module.exports = validate;
