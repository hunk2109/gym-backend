export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class PaginationUtil {
  static getPaginationParams(page: string | number = '1', limit: string | number = '10'): PaginationParams {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    return {
      page: Math.max(1, isNaN(pageNum) ? 1 : pageNum),
      limit: Math.max(1, Math.min(100, isNaN(limitNum) ? 10 : limitNum)),
    };
  }

  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static formatPaginatedResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
    const pages = Math.ceil(total / limit);
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNextPage: page < pages,
        hasPrevPage: page > 1,
      },
    };
  }
}
