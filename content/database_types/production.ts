// Production and Project Types

export interface Production {
  id: string;
  name: string;
  address?: string | null;
  contactName?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  createdAt: Date;
}

export interface ProductionWithProjects extends Production {
  projects: Project[];
  totalRides: number;
}

export interface CreateProductionInput {
  name: string;
  address?: string;
  contactName?: string;
  contactEmail: string;
  contactPhone?: string;
}

export interface UpdateProductionInput {
  name?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface Project {
  id: string;
  name: string;
  productionId: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface ProjectWithProduction extends Project {
  production: Production;
  totalRides: number;
}

export interface CreateProjectInput {
  name: string;
  productionId: string;
  startDate: Date;
  endDate: Date;
}

export interface UpdateProjectInput {
  name?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ProjectFilters {
  productionId?: string;
  active?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface ProductionStats {
  totalProjects: number;
  activeProjects: number;
  totalRides: number;
  totalSpent: string;
}
