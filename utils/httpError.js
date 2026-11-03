// An error that carries the HTTP status to send back to the client.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = {
  HttpError,
  badRequest: (message = "Bad request") => new HttpError(400, message),
  forbidden: (message = "Forbidden") => new HttpError(403, message),
  notFound: (message = "Page not found") => new HttpError(404, message),
  conflict: (message) => new HttpError(409, message),
  unprocessable: (message) => new HttpError(422, message),
};
