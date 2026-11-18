export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export function ok<T>(
  data: T,
  meta?: Record<string, unknown>,
): ApiResponse<T> {
  if (meta !== undefined) {
    return {
      success: true,
      data,
      meta,
    };
  }
  return {
    success: true,
    data,
  };
}
