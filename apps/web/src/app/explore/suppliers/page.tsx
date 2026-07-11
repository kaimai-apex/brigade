import { loadSuppliers } from '@/lib/explore/loader';
import { ExploreHeader } from '@/components/explore/explore-header';
import { SupplierList } from '@/components/explore/supplier-list';

export const metadata = {
  title: 'Suppliers · Explore · Brigade',
};

export default async function SuppliersPage() {
  const suppliers = await loadSuppliers();

  return (
    <div>
      <ExploreHeader
        title="🛒 Suppliers"
        description="Food, equipment and smallwares distributors serving Toronto kitchens. Supplier reps can claim their page to reach chefs and owners directly."
      />
      <SupplierList suppliers={suppliers} />
    </div>
  );
}
