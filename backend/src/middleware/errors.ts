export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You do not have permission to do this") {
    super(403, message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Please sign in again") {
    super(401, message);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Invalid request", details?: unknown) {
    super(400, message, details);
  }
}
