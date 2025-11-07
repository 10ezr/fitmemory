import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  ApiResponse,
  PaginatedResponse,
  AppError,
  ValidationError,
  DatabaseError,
  NotFoundError,
  UnauthorizedError
} from '@/types';
import { formatZodError } from './validations';

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message
    },
    { status }
  );
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  error: string | Error,
  status: number = 500,
  details?: any
): NextResponse<ApiResponse> {
  const message = typeof error === 'string' ? error : error.message;
  
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details && { details })
    },
    { status }
  );
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<PaginatedResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      hasMore: page * limit < total
    }
  });
}

/**
 * Handle and format errors consistently
 */
export function handleError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return errorResponse(
      'Validation failed',
      400,
      formatZodError(error)
    );
  }

  // Custom app errors
  if (error instanceof ValidationError) {
    return errorResponse(error.message, 400, error.details);
  }

  if (error instanceof NotFoundError) {
    return errorResponse(error.message, 404);
  }

  if (error instanceof UnauthorizedError) {
    return errorResponse(error.message, 401);
  }

  if (error instanceof DatabaseError) {
    return errorResponse(
      'Database operation failed',
      500,
      process.env.NODE_ENV === 'development' ? error.details : undefined
    );
  }

  if (error instanceof AppError) {
    return errorResponse(
      error.message,
      error.statusCode,
      process.env.NODE_ENV === 'development' ? error.details : undefined
    );
  }

  // MongoDB/Mongoose errors
  if (error && typeof error === 'object' && 'name' in error) {
    const mongoError = error as any;
    
    if (mongoError.name === 'CastError') {
      return errorResponse('Invalid ID format', 400);
    }
    
    if (mongoError.name === 'ValidationError') {
      return errorResponse('Data validation failed', 400, mongoError.errors);
    }
    
    if (mongoError.code === 11000) {
      return errorResponse('Duplicate entry found', 409);
    }
  }

  // Generic error
  return errorResponse(
    process.env.NODE_ENV === 'development'
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Internal server error',
    500
  );
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Extract and parse request body with type safety
 */
export async function parseRequestBody<T>(
  request: Request
): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }
}

/**
 * Extract and validate query parameters
 */
export function getQueryParams(
  searchParams: URLSearchParams
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  
  searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });
  
  return params;
}

/**
 * Parse pagination parameters from URL
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || '20', 10))
  );
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Parse sort parameters from URL
 */
export function parseSort(searchParams: URLSearchParams) {
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
  
  return { [sortBy]: sortOrder };
}

/**
 * Parse date range from URL parameters
 */
export function parseDateRange(searchParams: URLSearchParams) {
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  
  return {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined
  };
}

/**
 * Build MongoDB query from filters
 */
export function buildQuery(filters: Record<string, any>) {
  const query: Record<string, any> = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = value;
    }
  });
  
  return query;
}

/**
 * Check if request wants persistence (for offline mode)
 */
export function wantsPersistence(): boolean {
  return process.env.PERSIST_MESSAGES !== 'false';
}

/**
 * Rate limit checker (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime
  };
}

/**
 * Clean up old rate limit records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Generate local datetime payload
 */
export function getLocalDateTimePayload(ts?: {
  epochMs?: number;
  timezone?: string;
}) {
  const now = ts?.epochMs ? new Date(ts.epochMs) : new Date();
  const tz = ts?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  const display = now.toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  return {
    iso: now.toISOString(),
    timezone: tz,
    display,
    epochMs: now.getTime()
  };
}

/**
 * Type guard to check if value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Delay function for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delayTime = baseDelay * Math.pow(2, i);
        await delay(delayTime);
      }
    }
  }
  
  throw lastError;
}
