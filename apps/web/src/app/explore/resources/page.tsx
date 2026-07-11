import { loadAssociations, loadSchools } from '@/lib/explore/loader';
import { ExploreHeader } from '@/components/explore/explore-header';
import {
  AssociationList,
  SchoolList,
} from '@/components/explore/resource-lists';

export const metadata = {
  title: 'Resources & Schools · Explore · Brigade',
};

export default async function ResourcesPage() {
  const [schools, associations] = await Promise.all([
    loadSchools(),
    loadAssociations(),
  ]);

  return (
    <div>
      <ExploreHeader
        title="🎓 Resources & Schools"
        description="Culinary programs, certifications and industry associations — the pathways into hospitality and the bodies that support it."
      />

      <section>
        <h2 className="mb-4 font-display text-2xl font-black tracking-tight">
          Culinary schools
        </h2>
        <SchoolList schools={schools} />
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-black tracking-tight">
          Associations & certifications
        </h2>
        <AssociationList associations={associations} />
      </section>
    </div>
  );
}
