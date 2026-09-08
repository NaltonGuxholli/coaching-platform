export type RecordValue = Record<string, any>;
export type User = {
  id: string;
  tenantId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  isPlatformAdmin?: boolean;
};
export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
};
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => void;
};
export type Course = {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  status?: string;
  price?: number | string;
  currency?: string;
  updatedAt?: string;
  _count?: { enrollments?: number; lessons?: number };
  modules?: RecordValue[];
  lessons?: RecordValue[];
  progress?: { percentage?: number };
};
