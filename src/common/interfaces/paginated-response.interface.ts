export class PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}
