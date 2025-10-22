export interface ODMMetadata {
  FileType: 'Snapshot' | 'Transactional';
  FileOID: string;
  CreationDateTime: string;
  ODMVersion: '1.3';
}

export interface PaginationParams {
  startid?: string;
  per_page?: number;
}

export interface DatasetQuery extends PaginationParams {
  studyoid?: string;
  StudySiteNumber?: string;
  SubjectName?: string;
  unicode?: boolean;
  mode?: 'default' | 'enhanced' | 'all';
}

export interface AuthUser {
  username: string;
  password: string;
}

