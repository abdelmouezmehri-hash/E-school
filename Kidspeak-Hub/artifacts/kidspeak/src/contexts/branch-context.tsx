import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Branch {
  id: number;
  name: string;
  nameAr?: string | null;
  address?: string | null;
  addressAr?: string | null;
  managerName?: string | null;
  managerId?: number | null;
  managerEmail?: string | null;
  phone?: string | null;
  invoicePrefix: string;
  isActive: boolean;
  createdAt: string;
  pupilCount?: number;
}

interface BranchContextType {
  branches: Branch[];
  selectedBranchId: number | null;
  selectedBranch: Branch | null;
  setSelectedBranchId: (id: number | null) => void;
  isLoading: boolean;
  refetch: () => void;
}

const BranchContext = createContext<BranchContextType>({
  branches: [],
  selectedBranchId: null,
  selectedBranch: null,
  setSelectedBranchId: () => {},
  isLoading: false,
  refetch: () => {},
});

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const selectedBranch = branches.find(b => b.id === selectedBranchId) ?? null;

  return (
    <BranchContext.Provider value={{ branches, selectedBranchId, selectedBranch, setSelectedBranchId, isLoading, refetch: fetchBranches }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
