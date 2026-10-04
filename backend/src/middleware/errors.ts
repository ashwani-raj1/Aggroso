import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = res.locals.requestId as string;

  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten(), requestId } });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Requested record was not found", requestId } });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    res.status(503).json({
      error: {
        code: "DATABASE_NOT_INITIALIZED",
        message: "Database tables are missing. Run backend/prisma/init.sql in the Supabase SQL Editor.",
        requestId
      }
    });
    return;
  }

  const internalMessage = error instanceof Error ? error.message : "Unexpected server error";
  req.log?.error?.({ error: internalMessage, requestId });
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unexpected server error. Check the backend log using the request ID.", requestId } });
};
